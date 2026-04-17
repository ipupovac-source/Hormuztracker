// Hormuz Strait Vessel Tracker
// Slu\u0161a AISStream.io WebSocket za prolaze kroz Hormuz tjesnac,
// sprema u hormuz/data/vessels.json i slu\u017ei dashboard na :8082

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const WebSocket = require('ws');

const PORT = 8082;

// API kljuc (iz CLI argumenta ili env-a ili hardkodirano)
const API_KEY = process.env.AISSTREAM_KEY
    || process.argv[2]
    || 'd4bc0919c8e66730d6eae26b4dd148e87185a7ed';

// \u0160iroki bounding box za pretplatu: obuhva\u0107a Perzijski zaljev,
// tjesnac i Omanski zaljev tako da vidimo plovila koja namjeravaju pro\u0107i.
// SW: 22.0\u00b0N, 50.0\u00b0E; NE: 28.0\u00b0N, 62.0\u00b0E
const HORMUZ_BBOX = [[[22.0, 50.0], [28.0, 62.0]]];

// U\u017ei pojas samog tjesnaca - tu fiksiramo "prolazak"
const STRAIT_BOX = { latMin: 26.0, latMax: 27.0, lonMin: 56.0, lonMax: 57.0 };

// Zapadni prilaz (Perzijski zaljev, ka tjesnacu na JI)
const WEST_APPROACH = { latMin: 25.5, latMax: 28.0, lonMin: 52.0, lonMax: 56.0 };

// Isto\u010dni prilaz (Omanski zaljev, ka tjesnacu na SZ)
const EAST_APPROACH = { latMin: 22.0, latMax: 26.5, lonMin: 56.0, lonMax: 62.0 };

function inBox(lat, lon, b) {
    return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
}

// COG smjer kompatibilnost: je li smjer prema tjesnacu
function courseTowardStrait(lat, lon, cog) {
    if (lat === null || lon === null || cog === null) return false;
    const STRAIT_LAT = 26.5, STRAIT_LON = 56.5;
    // Azimut od plovila prema sredini tjesnaca
    const dLat = STRAIT_LAT - lat;
    const dLon = STRAIT_LON - lon;
    const bearing = (Math.atan2(dLon * Math.cos(STRAIT_LAT * Math.PI / 180), dLat) * 180 / Math.PI + 360) % 360;
    // Razlika sa COG (normalizirana)
    let diff = Math.abs(((cog - bearing + 540) % 360) - 180);
    return diff < 45; // unutar 45\u00b0 odstupanja = smjer prema tjesnacu
}

function classifyVessel(v) {
    // Permanent: ako smo ga ikada vidjeli u samom tjesnacu -> "passed"
    if (v.wasInStrait) return 'passed';
    if (v.lat === null || v.lon === null) return 'unknown';
    if (inBox(v.lat, v.lon, STRAIT_BOX)) return 'passed';

    // Intent: u prilazu, smjer prema tjesnacu, aktivno plovi (SOG > 1)
    const moving = (v.sog || 0) > 1.0;
    const toward = courseTowardStrait(v.lat, v.lon, v.cog);
    const inWest = inBox(v.lat, v.lon, WEST_APPROACH);
    const inEast = inBox(v.lat, v.lon, EAST_APPROACH);

    if (moving && toward && (inWest || inEast)) return 'intent';
    if (inWest || inEast) return 'nearby';
    return 'nearby';
}

function intentReason(v) {
    if (v.wasInStrait) return 'Pro\u0161ao kroz tjesnac (pozicija zabilje\u017eena u 26\u00b0\u201327\u00b0N, 56\u00b0\u201357\u00b0E)';
    if (v.lat === null || v.lon === null) return 'Bez pozicije';
    if (inBox(v.lat, v.lon, STRAIT_BOX)) return 'Trenutno u tjesnacu';
    const moving = (v.sog || 0) > 1.0;
    const toward = courseTowardStrait(v.lat, v.lon, v.cog);
    const inWest = inBox(v.lat, v.lon, WEST_APPROACH);
    const inEast = inBox(v.lat, v.lon, EAST_APPROACH);
    if (moving && toward && (inWest || inEast)) {
        const side = inWest ? 'zapadni prilaz (Perzijski zaljev)' : 'isto\u010dni prilaz (Omanski zaljev)';
        return `U ${side}, SOG ${v.sog.toFixed(1)} kn, COG ${Math.round(v.cog)}\u00b0 \u2014 kurs unutar 45\u00b0 od smjera prema tjesnacu`;
    }
    return 'U \u0161irem podru\u010dju, bez jasne namjere prolaska';
}

const DATA_FILE = path.join(__dirname, 'data', 'vessels.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- MID -> zastava (naj\u010de\u0161\u0107e u Hormuzu + globalni) ---
const MID_TO_FLAG = {
    201: 'Albanija', 202: 'Andora', 203: 'Austrija', 204: 'Azori', 205: 'Belgija',
    206: 'Bjelorusija', 207: 'Bugarska', 208: 'Vatikan', 209: 'Cipar', 210: 'Cipar',
    211: 'Njema\u010dka', 212: 'Cipar', 213: 'Gruzija', 214: 'Moldavija', 215: 'Malta',
    216: 'Armenija', 218: 'Njema\u010dka', 219: 'Danska', 220: 'Danska', 224: '\u0160panjolska',
    225: '\u0160panjolska', 226: 'Francuska', 227: 'Francuska', 228: 'Francuska',
    229: 'Malta', 230: 'Finska', 231: 'Farski otoci', 232: 'UK', 233: 'UK', 234: 'UK',
    235: 'UK', 236: 'Gibraltar', 237: 'Gr\u010dka', 238: 'Hrvatska', 239: 'Gr\u010dka',
    240: 'Gr\u010dka', 241: 'Gr\u010dka', 242: 'Maroko', 243: 'Ma\u0111arska', 244: 'Nizozemska',
    245: 'Nizozemska', 246: 'Nizozemska', 247: 'Italija', 248: 'Malta', 249: 'Malta',
    250: 'Irska', 251: 'Island', 252: 'Lihten\u0161tajn', 253: 'Luksemburg', 254: 'Monako',
    255: 'Madeira', 256: 'Malta', 257: 'Norve\u0161ka', 258: 'Norve\u0161ka', 259: 'Norve\u0161ka',
    261: 'Poljska', 262: 'Crna Gora', 263: 'Portugal', 264: 'Rumunjska', 265: '\u0160vedska',
    266: '\u0160vedska', 267: 'Slova\u010dka', 268: 'San Marino', 269: '\u0160vicarska',
    270: 'Rep. \u010ce\u0161ka', 271: 'Turska', 272: 'Ukrajina', 273: 'Rusija', 274: 'Sjev. Makedonija',
    275: 'Latvija', 276: 'Estonija', 277: 'Litva', 278: 'Slovenija', 279: 'Srbija',
    301: 'Anguila', 303: 'Aljaska', 304: 'Antigva i Barbuda', 305: 'Antigva i Barbuda',
    306: 'Karibi NL', 307: 'Aruba', 308: 'Bahami', 309: 'Bahami', 310: 'Bermudi',
    311: 'Bahami', 312: 'Belize', 314: 'Barbados', 316: 'Kanada', 319: 'Kajmanski otoci',
    321: 'Kostarika', 323: 'Kuba', 325: 'Dominika', 327: 'Dominikanska Rep.',
    329: 'Guadalupe', 330: 'Grenada', 331: 'Grenland', 332: 'Gvatemala', 334: 'Honduras',
    336: 'Haiti', 338: 'SAD', 339: 'Jamajka', 341: 'St. Kitts i Nevis',
    343: 'Sv. Lucija', 345: 'Meksiko', 347: 'Martinik', 348: 'Montserrat', 350: 'Nikaragva',
    351: 'Panama', 352: 'Panama', 353: 'Panama', 354: 'Panama', 355: 'Panama',
    356: 'Panama', 357: 'Panama', 358: 'Portoriko', 359: 'El Salvador',
    361: 'Sv. Pierre i Miquelon', 362: 'Trinidad i Tobago', 364: 'Otoci Turks i Caicos',
    366: 'SAD', 367: 'SAD', 368: 'SAD', 369: 'SAD', 370: 'Panama', 371: 'Panama',
    372: 'Panama', 373: 'Panama', 374: 'Panama', 375: 'St. Vincent i Grenadini',
    376: 'St. Vincent i Grenadini', 377: 'St. Vincent i Grenadini', 378: 'Brit. Dj. otoci',
    379: 'U.S. Dj. otoci',
    401: 'Afganistan', 403: 'Saudijska Arabija', 405: 'Banglade\u0161', 408: 'Bahrein',
    410: 'Butan', 412: 'Kina', 413: 'Kina', 414: 'Kina', 416: 'Tajvan', 417: 'Sri Lanka',
    419: 'Indija', 422: 'Iran', 423: 'Azerbajd\u017ean', 425: 'Irak', 428: 'Izrael',
    431: 'Japan', 432: 'Japan', 434: 'Turkmenistan', 436: 'Kazahstan', 437: 'Uzbekistan',
    438: 'Jordan', 440: 'J. Koreja', 441: 'J. Koreja', 443: 'Palestina', 445: 'S. Koreja',
    447: 'Kuvajt', 450: 'Libanon', 451: 'Kirgistan', 453: 'Makao', 455: 'Maldivi',
    457: 'Mongolija', 459: 'Nepal', 461: 'Oman', 463: 'Pakistan', 466: 'Katar',
    468: 'Sirija', 470: 'UAE', 471: 'UAE', 472: 'Tad\u017eikistan', 473: 'Jemen',
    475: 'Jemen', 477: 'Hong Kong', 478: 'Bosna i Hercegovina',
    501: 'Adel. zem. (Fr)', 503: 'Australija', 506: 'Mjanmar', 508: 'Brunej',
    510: 'Mikronezija', 511: 'Palau', 512: 'Novi Zeland', 514: 'Kambod\u017ea', 515: 'Kambod\u017ea',
    516: 'Bo\u017ei\u0107ni otok', 518: 'Cookovi otoci', 520: 'Fid\u017ei', 523: 'Kokosovi otoci',
    525: 'Indonezija', 529: 'Kiribati', 531: 'Laos', 533: 'Malezija', 536: 'Sjev. Marijanski otoci',
    538: 'Mar\u0161alovi otoci', 540: 'Nova Kaledonija', 542: 'Niue', 544: 'Nauru',
    546: 'Fr. Polinezija', 548: 'Filipini', 550: 'Vijetnam', 553: 'Papua Nova Gvineja',
    555: 'Pitcairn', 557: 'Salomonski otoci', 559: 'Am. Samoa', 561: 'Samoa',
    563: 'Singapur', 564: 'Singapur', 565: 'Singapur', 566: 'Singapur', 567: 'Tajland',
    570: 'Tonga', 572: 'Tuvalu', 574: 'Vijetnam', 576: 'Vanuatu', 578: 'Wallis i Futuna',
    601: 'J. Afrika', 603: 'Angola', 605: 'Al\u017eir', 607: 'Sv. Paul i Amsterdam',
    608: 'Ascension', 609: 'Burundi', 610: 'Benin', 611: 'Bocvana', 612: 'SAR',
    613: 'Kamerun', 615: 'Kongo', 616: 'Komori', 617: 'Kabo Verde', 618: 'Crozet',
    619: 'Obala Bjelokosti', 620: 'Komori', 621: 'D\u017eibuti', 622: 'Egipat', 624: 'Etiopija',
    625: 'Eritreja', 626: 'Gabon', 627: 'Gana', 629: 'Gambija', 630: 'Gvineja-Bisau',
    631: 'Ekv. Gvineja', 632: 'Gvineja', 633: 'Burkina Faso', 634: 'Kenija', 635: 'Kerguelen',
    636: 'Liberija', 637: 'Liberija', 638: 'J. Sudan', 642: 'Libija', 644: 'Lesoto',
    645: 'Mauricijus', 647: 'Madagaskar', 649: 'Mali', 650: 'Mozambik', 654: 'Mauretanija',
    655: 'Malavi', 656: 'Niger', 657: 'Nigerija', 659: 'Namibija', 660: 'Reunion',
    661: 'Ruanda', 662: 'Sudan', 663: 'Senegal', 664: 'Sejkeli', 665: 'St. Helena',
    666: 'Somalija', 667: 'Sijera Leone', 668: 'Sv. Toma i Princip', 669: 'Esvatini',
    670: 'Chad', 671: 'Togo', 672: 'Tunis', 674: 'Tanzanija', 675: 'Uganda',
    676: 'DR Kongo', 677: 'Tanzanija', 678: 'Zambija', 679: 'Zimbabve',
    701: 'Argentina', 710: 'Brazil', 720: 'Bolivija', 725: '\u010cile', 730: 'Kolumbija',
    735: 'Ekvador', 740: 'Falklandski otoci', 745: 'Fr. Gvajana', 750: 'Gvajana',
    755: 'Paragvaj', 760: 'Peru', 765: 'Surinam', 770: 'Urugvaj', 775: 'Venezuela'
};

function flagFromMMSI(mmsi) {
    if (!mmsi) return 'Nepoznato';
    const mid = parseInt(String(mmsi).substring(0, 3));
    return MID_TO_FLAG[mid] || `MID ${mid}`;
}

// --- Ship Type mapping (AIS) ---
const SHIP_TYPES = {
    0: 'Nepoznato',
    20: 'WIG', 21: 'WIG A', 22: 'WIG B', 23: 'WIG C', 24: 'WIG D',
    30: 'Ribarski', 31: 'Tegljenje', 32: 'Tegljenje (veliko)', 33: 'Jaru\u017eanje',
    34: 'Ronjenje', 35: 'Vojni', 36: 'Jedrilica', 37: 'Jahta',
    40: 'HSC', 41: 'HSC A', 42: 'HSC B', 43: 'HSC C', 44: 'HSC D',
    50: 'Pilotski', 51: 'SAR', 52: 'Tegljenje', 53: 'Port tender',
    54: 'Anti-pollution', 55: 'Zakon', 57: 'Medicinski', 58: 'Posebni',
    60: 'Putni\u010dki', 61: 'Putni\u010dki A', 62: 'Putni\u010dki B', 63: 'Putni\u010dki C',
    64: 'Putni\u010dki D', 69: 'Putni\u010dki',
    70: 'Teretni', 71: 'Teretni A', 72: 'Teretni B', 73: 'Teretni C',
    74: 'Teretni D', 79: 'Teretni',
    80: 'Tanker', 81: 'Tanker A (HAZ)', 82: 'Tanker B', 83: 'Tanker C',
    84: 'Tanker D', 89: 'Tanker',
    90: 'Ostalo', 91: 'Ostalo A', 92: 'Ostalo B', 93: 'Ostalo C', 94: 'Ostalo D',
    99: 'Ostalo'
};

function shipTypeName(t) {
    const n = parseInt(t);
    if (SHIP_TYPES[n]) return SHIP_TYPES[n];
    if (n >= 60 && n < 70) return 'Putni\u010dki';
    if (n >= 70 && n < 80) return 'Teretni';
    if (n >= 80 && n < 90) return 'Tanker';
    if (n >= 40 && n < 50) return 'HSC';
    if (n >= 20 && n < 30) return 'WIG';
    return 'Ostalo';
}

function shipCategory(t) {
    const n = parseInt(t);
    if (n >= 80 && n < 90) return 'Tanker';
    if (n >= 70 && n < 80) return 'Teretni';
    if (n >= 60 && n < 70) return 'Putni\u010dki';
    if (n >= 40 && n < 50) return 'HSC';
    if (n === 30) return 'Ribarski';
    if (n >= 31 && n <= 33) return 'Tegljenje';
    if (n >= 36 && n <= 37) return 'Jahte/Jedrilice';
    if (n >= 50 && n <= 59) return 'Slu\u017ebeni';
    if (n === 0) return 'Nepoznato';
    return 'Ostalo';
}

// --- Storage ---
let vessels = {}; // MMSI -> record
let stats = { connected: false, lastMessage: null, messagesReceived: 0, startedAt: new Date().toISOString() };

function loadVessels() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            vessels = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            console.log(`U\u010ditano ${Object.keys(vessels).length} plovila iz ${DATA_FILE}`);
        }
    } catch (e) {
        console.error('Gre\u0161ka u\u010ditavanja vessels.json:', e.message);
        vessels = {};
    }
}

let saveTimer = null;
function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {
            if (!fs.existsSync(path.dirname(DATA_FILE))) {
                fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(vessels, null, 2));
        } catch (e) {
            console.error('Gre\u0161ka spremanja:', e.message);
        }
    }, 5000);
}

// --- AISStream WebSocket client ---
let ws = null;
let reconnectTimer = null;
let hormuzPollTimer = null;

// --- Sekundarni izvor: hormuztoll.com javni JSON endpoint
// Vra\u0107a ~1290 plovila u regiji (Perzijski zaljev + Arapsko more)
// Polja: mmsi, name, lat, lon, sog, cog (bez tipa/zastave/destinacije)
function fetchHormuzTollData() {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'hormuztoll.com',
            path: '/hormuzserver_wide.php',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Hormuz-Tracker/1.0)',
                'Accept': 'application/json',
                'Referer': 'https://hormuztoll.com/hormuzlive.html'
            },
            timeout: 15000
        };
        const req = https.request(opts, (res) => {
            let body = '';
            res.on('data', (c) => { body += c; });
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve(data);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

async function pollHormuzToll() {
    try {
        const data = await fetchHormuzTollData();
        if (!data || !Array.isArray(data.vessels)) {
            console.warn('hormuztoll: neispravan odgovor');
            return;
        }
        const now = new Date().toISOString();
        let added = 0, updated = 0;
        data.vessels.forEach(v => {
            if (!v.mmsi) return;
            const key = String(v.mmsi);
            const existing = vessels[key];
            const inStrait = (typeof v.lat === 'number' && typeof v.lon === 'number' &&
                              inBox(v.lat, v.lon, STRAIT_BOX));

            if (!existing) {
                added++;
                vessels[key] = {
                    mmsi: key,
                    name: String(v.name || '').trim() || '',
                    flag: flagFromMMSI(v.mmsi),
                    shipType: null,
                    typeName: 'Nepoznato',
                    category: 'Nepoznato',
                    destination: '',
                    previousDestination: '',
                    destinationHistory: [],
                    lat: v.lat,
                    lon: v.lon,
                    cog: v.cog,
                    sog: v.sog,
                    heading: null,
                    wasInStrait: !!inStrait,
                    firstSeenInStrait: inStrait ? now : null,
                    firstSeen: now,
                    lastSeen: now,
                    source: 'hormuztoll'
                };
            } else {
                updated++;
                existing.lat = v.lat;
                existing.lon = v.lon;
                existing.cog = v.cog;
                existing.sog = v.sog;
                existing.lastSeen = now;
                if (!existing.name && v.name) existing.name = String(v.name).trim();
                if (inStrait && !existing.wasInStrait) {
                    existing.wasInStrait = true;
                    existing.firstSeenInStrait = now;
                }
            }
        });
        stats.hormuzTollFetches = (stats.hormuzTollFetches || 0) + 1;
        stats.hormuzTollLast = now;
        stats.hormuzTollCount = data.count || data.vessels.length;
        console.log(`hormuztoll: ${data.vessels.length} plovila, novo ${added}, a\u017eurirano ${updated}`);
        scheduleSave();
    } catch (e) {
        console.error('hormuztoll greska:', e.message);
    }
}

function startHormuzTollPolling() {
    pollHormuzToll(); // odmah jedan poziv
    if (hormuzPollTimer) clearInterval(hormuzPollTimer);
    hormuzPollTimer = setInterval(pollHormuzToll, 120000); // svakih 2 min
}

function connectAIS() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (!API_KEY || API_KEY.length < 10) {
        console.error('Neispravan API klju\u010d, prekidam.');
        return;
    }

    console.log('Spajanje na AISStream.io...');
    try {
        ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    } catch (e) {
        console.error('WS konstrukcija failed:', e.message);
        scheduleReconnect();
        return;
    }

    ws.on('open', () => {
        const sub = {
            APIKey: API_KEY,
            BoundingBoxes: HORMUZ_BBOX,
            FilterMessageTypes: ['PositionReport', 'ShipStaticData']
        };
        const subStr = JSON.stringify(sub);
        ws.send(subStr);
        stats.connected = true;
        console.log('\u2705 Spojen na AISStream, subscribe poslan:');
        console.log('   Key prefix:', API_KEY.substring(0, 8) + '...(' + API_KEY.length + ' chars)');
        console.log('   Bbox:', JSON.stringify(HORMUZ_BBOX));
    });

    ws.on('message', (raw) => {
        stats.messagesReceived++;
        stats.lastMessage = new Date().toISOString();
        const s = raw.toString();
        if (stats.messagesReceived <= 3) {
            console.log('[msg #' + stats.messagesReceived + ']:', s.substring(0, 300));
        }
        try {
            const msg = JSON.parse(s);
            if (msg.error || msg.Error) {
                console.error('AISStream error:', msg.error || msg.Error);
            }
            handleAIS(msg);
        } catch (e) {
            // ignore parse errors
        }
    });

    ws.on('error', (err) => {
        console.error('WS error:', err.message);
    });

    ws.on('close', (code, reason) => {
        stats.connected = false;
        const reasonStr = reason ? reason.toString() : '';
        console.log(`WS zatvoren [code=${code}${reasonStr ? ', reason=' + reasonStr : ''}], reconnect za 5s...`);
        scheduleReconnect();
    });
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectAIS();
    }, 5000);
}

function handleAIS(msg) {
    const meta = msg.MetaData || {};
    const mmsi = meta.MMSI || (msg.Message && msg.Message.PositionReport && msg.Message.PositionReport.UserID);
    if (!mmsi) return;

    const key = String(mmsi);
    const now = new Date().toISOString();

    if (!vessels[key]) {
        vessels[key] = {
            mmsi: key,
            name: '',
            flag: flagFromMMSI(mmsi),
            shipType: null,
            typeName: 'Nepoznato',
            category: 'Nepoznato',
            destination: '',
            previousDestination: '',
            destinationHistory: [],
            lat: null,
            lon: null,
            cog: null,
            sog: null,
            heading: null,
            wasInStrait: false,
            firstSeenInStrait: null,
            firstSeen: now,
            lastSeen: now
        };
    }
    const v = vessels[key];
    v.lastSeen = now;
    if (meta.ShipName && !v.name) v.name = String(meta.ShipName).trim();

    const type = msg.MessageType;

    if (type === 'PositionReport' && msg.Message && msg.Message.PositionReport) {
        const p = msg.Message.PositionReport;
        if (typeof p.Latitude === 'number') v.lat = p.Latitude;
        if (typeof p.Longitude === 'number') v.lon = p.Longitude;
        if (typeof p.Cog === 'number') v.cog = p.Cog;
        if (typeof p.Sog === 'number') v.sog = p.Sog;
        if (typeof p.TrueHeading === 'number' && p.TrueHeading !== 511) v.heading = p.TrueHeading;
        if (v.lat !== null && v.lon !== null && inBox(v.lat, v.lon, STRAIT_BOX)) {
            if (!v.wasInStrait) {
                v.wasInStrait = true;
                v.firstSeenInStrait = now;
            }
        }
    }

    if (type === 'ShipStaticData' && msg.Message && msg.Message.ShipStaticData) {
        const s = msg.Message.ShipStaticData;
        if (s.Name) v.name = String(s.Name).trim();
        if (typeof s.Type === 'number') {
            v.shipType = s.Type;
            v.typeName = shipTypeName(s.Type);
            v.category = shipCategory(s.Type);
        }
        if (s.Destination) {
            const dest = String(s.Destination).trim();
            if (dest && dest !== v.destination) {
                if (v.destination) {
                    v.previousDestination = v.destination;
                    v.destinationHistory.push({ dest: v.destination, time: v.lastSeen });
                    if (v.destinationHistory.length > 10) v.destinationHistory.shift();
                }
                v.destination = dest;
            }
        }
    }

    scheduleSave();
}

// --- HTTP server ---
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

function listShips(from, to) {
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : 0;
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : Date.now();

    const passed = [];
    const intent = [];
    const nearby = [];

    for (const k in vessels) {
        const v = vessels[k];
        const last = new Date(v.lastSeen).getTime();
        const first = new Date(v.firstSeen).getTime();
        if (!(last >= fromTs && first <= toTs)) continue;

        const cls = classifyVessel(v);
        const enriched = Object.assign({}, v, {
            classification: cls,
            intentReason: intentReason(v)
        });

        if (cls === 'passed') passed.push(enriched);
        else if (cls === 'intent') intent.push(enriched);
        else nearby.push(enriched);
    }
    return { passed, intent, nearby };
}

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (pathname === '/api/ships') {
        const from = parsed.query.from || '';
        const to = parsed.query.to || '';
        const { passed, intent, nearby } = listShips(from, to);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            from, to,
            counts: {
                passed: passed.length,
                intent: intent.length,
                nearby: nearby.length,
                total: passed.length + intent.length + nearby.length
            },
            passed, intent, nearby,
            zones: {
                strait: STRAIT_BOX,
                westApproach: WEST_APPROACH,
                eastApproach: EAST_APPROACH,
                bbox: HORMUZ_BBOX
            },
            methodology: {
                passed: 'Plovilo je najmanje jednom zabilje\u017eeno s pozicijom unutar u\u017eeg pojasa tjesnaca (26\u00b0\u201327\u00b0N, 56\u00b0\u201357\u00b0E) \u2014 smatra se da je pro\u0161lo ili prolazi.',
                intent: 'Plovilo je u zapadnom ili isto\u010dnom prilazu, SOG > 1 kn i COG (kurs nad dnom) unutar 45\u00b0 od smjera prema sredi\u0161tu tjesnaca (26.5\u00b0N, 56.5\u00b0E). Temelj: AIS pozicija, brzina i kurs.',
                nearby: 'Plovilo je u \u0161irem podru\u010dju bounding boxa (22\u00b0\u201328\u00b0N, 50\u00b0\u201362\u00b0E) ali ne zadovoljava uvjete za prolazak ni namjeru.'
            }
        }));
        return;
    }

    if (pathname === '/api/status') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            connected: stats.connected,
            messagesReceived: stats.messagesReceived,
            lastMessage: stats.lastMessage,
            trackedVessels: Object.keys(vessels).length,
            startedAt: stats.startedAt,
            bbox: HORMUZ_BBOX,
            strait: STRAIT_BOX,
            westApproach: WEST_APPROACH,
            eastApproach: EAST_APPROACH,
            hormuzToll: {
                fetches: stats.hormuzTollFetches || 0,
                lastFetch: stats.hormuzTollLast || null,
                lastCount: stats.hormuzTollCount || 0
            }
        }));
        return;
    }

    if (pathname === '/api/refresh') {
        // Ru\u010dno osvje\u017eavanje: trigger hormuztoll fetch + reconnect AIS
        try { if (ws) ws.close(); } catch (e) {}
        pollHormuzToll().then(() => {
            // no-op; response ispod ide odmah
        }).catch(() => {});
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Osvje\u017eavanje pokrenuto (hormuztoll + AIS reconnect)' }));
        return;
    }

    if (pathname === '/api/reset') {
        vessels = {};
        scheduleSave();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Baza resetirana' }));
        return;
    }

    // Static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const resolved = path.resolve(path.join(PUBLIC_DIR, filePath));
    if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) {
        res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(resolved, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(resolved);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(content);
    });
});

// --- Start ---
loadVessels();
server.listen(PORT, () => {
    console.log(`
============================================================
  Hormuz Vessel Tracker
  Server: http://localhost:${PORT}
  Bounding box: ${JSON.stringify(HORMUZ_BBOX)}
  Trenutno pra\u0107eno: ${Object.keys(vessels).length} plovila
  Izvori:
    - hormuztoll.com (primarno, ~1290 plovila, poll svakih 2 min)
    - AISStream.io (sekundarno, EU/NA/AU pokrivenost)
============================================================
`);
    connectAIS();
    startHormuzTollPolling();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nSpremanje i izlaz...');
    try {
        if (!fs.existsSync(path.dirname(DATA_FILE))) {
            fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(vessels, null, 2));
    } catch (e) {}
    process.exit(0);
});
