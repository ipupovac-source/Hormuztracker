// Hormuz Tracker - statička verzija za GitHub Pages
// Izvor: hormuztoll.com/hormuzserver_wide.php (CORS: *)

const DATA_URL = 'https://hormuztoll.com/hormuzserver_wide.php';

const STRAIT_BOX = { latMin: 26.0, latMax: 27.0, lonMin: 56.0, lonMax: 57.0 };
const WEST_APPROACH = { latMin: 25.5, latMax: 28.0, lonMin: 52.0, lonMax: 56.0 };
const EAST_APPROACH = { latMin: 22.0, latMax: 26.5, lonMin: 56.0, lonMax: 62.0 };

const MID_TO_FLAG = {
    201:'Albanija',202:'Andora',203:'Austrija',204:'Azori',205:'Belgija',206:'Bjelorusija',207:'Bugarska',
    208:'Vatikan',209:'Cipar',210:'Cipar',211:'Njemačka',212:'Cipar',213:'Gruzija',214:'Moldavija',215:'Malta',
    216:'Armenija',218:'Njemačka',219:'Danska',220:'Danska',224:'Španjolska',225:'Španjolska',226:'Francuska',
    227:'Francuska',228:'Francuska',229:'Malta',230:'Finska',231:'Farski otoci',232:'UK',233:'UK',234:'UK',235:'UK',
    236:'Gibraltar',237:'Grčka',238:'Hrvatska',239:'Grčka',240:'Grčka',241:'Grčka',242:'Maroko',243:'Mađarska',
    244:'Nizozemska',245:'Nizozemska',246:'Nizozemska',247:'Italija',248:'Malta',249:'Malta',250:'Irska',251:'Island',
    252:'Lihtenštajn',253:'Luksemburg',254:'Monako',255:'Madeira',256:'Malta',257:'Norveška',258:'Norveška',
    259:'Norveška',261:'Poljska',262:'Crna Gora',263:'Portugal',264:'Rumunjska',265:'Švedska',266:'Švedska',
    267:'Slovačka',268:'San Marino',269:'Švicarska',270:'Rep. Češka',271:'Turska',272:'Ukrajina',273:'Rusija',
    274:'Sjev. Makedonija',275:'Latvija',276:'Estonija',277:'Litva',278:'Slovenija',279:'Srbija',
    303:'Aljaska',304:'Antigva i Barbuda',305:'Antigva i Barbuda',306:'Karibi NL',307:'Aruba',308:'Bahami',
    309:'Bahami',310:'Bermudi',311:'Bahami',312:'Belize',314:'Barbados',316:'Kanada',319:'Kajmanski otoci',
    321:'Kostarika',323:'Kuba',325:'Dominika',327:'Dominikanska Rep.',329:'Guadalupe',330:'Grenada',331:'Grenland',
    332:'Gvatemala',334:'Honduras',336:'Haiti',338:'SAD',339:'Jamajka',341:'St. Kitts i Nevis',343:'Sv. Lucija',
    345:'Meksiko',347:'Martinik',348:'Montserrat',350:'Nikaragva',351:'Panama',352:'Panama',353:'Panama',
    354:'Panama',355:'Panama',356:'Panama',357:'Panama',358:'Portoriko',359:'El Salvador',361:'Sv. Pierre',
    362:'Trinidad i Tobago',364:'Otoci Turks i Caicos',366:'SAD',367:'SAD',368:'SAD',369:'SAD',370:'Panama',
    371:'Panama',372:'Panama',373:'Panama',374:'Panama',375:'St. Vincent',376:'St. Vincent',377:'St. Vincent',
    378:'Brit. Dj. otoci',379:'U.S. Dj. otoci',
    401:'Afganistan',403:'Saudijska Arabija',405:'Bangladeš',408:'Bahrein',410:'Butan',412:'Kina',413:'Kina',
    414:'Kina',416:'Tajvan',417:'Šri Lanka',419:'Indija',422:'Iran',423:'Azerbajdžan',425:'Irak',428:'Izrael',
    431:'Japan',432:'Japan',434:'Turkmenistan',436:'Kazahstan',437:'Uzbekistan',438:'Jordan',440:'J. Koreja',
    441:'J. Koreja',443:'Palestina',445:'S. Koreja',447:'Kuvajt',450:'Libanon',451:'Kirgistan',453:'Makao',
    455:'Maldivi',457:'Mongolija',459:'Nepal',461:'Oman',463:'Pakistan',466:'Katar',468:'Sirija',470:'UAE',
    471:'UAE',472:'Tadžikistan',473:'Jemen',475:'Jemen',477:'Hong Kong',478:'BiH',
    501:'Adel. zem. (Fr)',503:'Australija',506:'Mjanmar',508:'Brunej',510:'Mikronezija',511:'Palau',
    512:'Novi Zeland',514:'Kambodža',515:'Kambodža',516:'Božićni otok',518:'Cookovi otoci',520:'Fidži',
    523:'Kokosovi otoci',525:'Indonezija',529:'Kiribati',531:'Laos',533:'Malezija',536:'Sjev. Marijanski otoci',
    538:'Maršalovi otoci',540:'Nova Kaledonija',542:'Niue',544:'Nauru',546:'Fr. Polinezija',548:'Filipini',
    550:'Vijetnam',553:'Papua N. Gvineja',555:'Pitcairn',557:'Salomonski otoci',559:'Am. Samoa',561:'Samoa',
    563:'Singapur',564:'Singapur',565:'Singapur',566:'Singapur',567:'Tajland',570:'Tonga',572:'Tuvalu',
    574:'Vijetnam',576:'Vanuatu',578:'Wallis i Futuna',
    601:'J. Afrika',603:'Angola',605:'Alžir',607:'Sv. Paul',608:'Ascension',609:'Burundi',610:'Benin',
    611:'Bocvana',612:'SAR',613:'Kamerun',615:'Kongo',616:'Komori',617:'Kabo Verde',618:'Crozet',
    619:'Obala Bjelokosti',620:'Komori',621:'Džibuti',622:'Egipat',624:'Etiopija',625:'Eritreja',626:'Gabon',
    627:'Gana',629:'Gambija',630:'Gvineja-Bisau',631:'Ekv. Gvineja',632:'Gvineja',633:'Burkina Faso',
    634:'Kenija',635:'Kerguelen',636:'Liberija',637:'Liberija',638:'J. Sudan',642:'Libija',644:'Lesoto',
    645:'Mauricijus',647:'Madagaskar',649:'Mali',650:'Mozambik',654:'Mauretanija',655:'Malavi',656:'Niger',
    657:'Nigerija',659:'Namibija',660:'Reunion',661:'Ruanda',662:'Sudan',663:'Senegal',664:'Sejšeli',
    665:'St. Helena',666:'Somalija',667:'Sijera Leone',668:'Sv. Toma',669:'Esvatini',670:'Čad',671:'Togo',
    672:'Tunis',674:'Tanzanija',675:'Uganda',676:'DR Kongo',677:'Tanzanija',678:'Zambija',679:'Zimbabve',
    701:'Argentina',710:'Brazil',720:'Bolivija',725:'Čile',730:'Kolumbija',735:'Ekvador',740:'Falklandi',
    745:'Fr. Gvajana',750:'Gvajana',755:'Paragvaj',760:'Peru',765:'Surinam',770:'Urugvaj',775:'Venezuela'
};

function flagFromMMSI(mmsi) {
    if (!mmsi) return 'Nepoznato';
    const mid = parseInt(String(mmsi).substring(0, 3));
    return MID_TO_FLAG[mid] || `MID ${mid}`;
}

function inBox(lat, lon, b) {
    return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
}

function courseTowardStrait(lat, lon, cog) {
    if (lat == null || lon == null || cog == null) return false;
    const STRAIT_LAT = 26.5, STRAIT_LON = 56.5;
    const dLat = STRAIT_LAT - lat;
    const dLon = STRAIT_LON - lon;
    const bearing = (Math.atan2(dLon * Math.cos(STRAIT_LAT * Math.PI / 180), dLat) * 180 / Math.PI + 360) % 360;
    const diff = Math.abs(((cog - bearing + 540) % 360) - 180);
    return diff < 45;
}

function classifyVessel(v) {
    if (v.lat == null || v.lon == null) return 'nearby';
    if (inBox(v.lat, v.lon, STRAIT_BOX)) return 'passed';
    const moving = (v.sog || 0) > 1.0;
    const toward = courseTowardStrait(v.lat, v.lon, v.cog);
    const inW = inBox(v.lat, v.lon, WEST_APPROACH);
    const inE = inBox(v.lat, v.lon, EAST_APPROACH);
    if (moving && toward && (inW || inE)) return 'intent';
    return 'nearby';
}

function intentReason(v) {
    if (v.lat == null || v.lon == null) return 'Bez pozicije';
    if (inBox(v.lat, v.lon, STRAIT_BOX)) return 'Trenutno u užem pojasu tjesnaca';
    const moving = (v.sog || 0) > 1.0;
    const toward = courseTowardStrait(v.lat, v.lon, v.cog);
    const inW = inBox(v.lat, v.lon, WEST_APPROACH);
    const inE = inBox(v.lat, v.lon, EAST_APPROACH);
    if (moving && toward && (inW || inE)) {
        const side = inW ? 'zapadni prilaz (Perzijski zaljev)' : 'istočni prilaz (Omanski zaljev)';
        return `U ${side}, SOG ${v.sog.toFixed(1)} kn, COG ${Math.round(v.cog)}° — kurs unutar 45° od smjera prema tjesnacu`;
    }
    return 'U širem području, bez jasne namjere';
}

// --- state ---
let state = {
    raw: [],
    filtered: [],
    sortField: 'sog',
    sortDir: 'desc',
    lastFetch: null,
    autoTimer: null
};

let map, layers = { passed: null, intent: null, nearby: null };

function initMap() {
    map = L.map('map').setView([26.5, 56.5], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18
    }).addTo(map);
    layers.passed = L.layerGroup().addTo(map);
    layers.intent = L.layerGroup().addTo(map);
    layers.nearby = L.layerGroup().addTo(map);

    L.rectangle(
        [[STRAIT_BOX.latMin, STRAIT_BOX.lonMin], [STRAIT_BOX.latMax, STRAIT_BOX.lonMax]],
        { color: '#10b981', weight: 2, fillOpacity: 0.08 }
    ).bindTooltip('Uži pojas tjesnaca').addTo(map);
    L.rectangle(
        [[WEST_APPROACH.latMin, WEST_APPROACH.lonMin], [WEST_APPROACH.latMax, WEST_APPROACH.lonMax]],
        { color: '#f59e0b', weight: 1, fillOpacity: 0.04, dashArray: '4 4' }
    ).bindTooltip('Zapadni prilaz').addTo(map);
    L.rectangle(
        [[EAST_APPROACH.latMin, EAST_APPROACH.lonMin], [EAST_APPROACH.latMax, EAST_APPROACH.lonMax]],
        { color: '#f59e0b', weight: 1, fillOpacity: 0.04, dashArray: '4 4' }
    ).bindTooltip('Istočni prilaz').addTo(map);
}

function vesselIcon(cls, cog) {
    const color = cls === 'passed' ? '#10b981' : cls === 'intent' ? '#f59e0b' : '#94a3b8';
    const rot = (cog == null) ? 0 : cog;
    const html = `<div style="transform: rotate(${rot}deg); transform-origin: 50% 50%;">
        <svg width="16" height="16" viewBox="-5 -5 10 10">
            <polygon points="0,-4 3,4 0,2 -3,4" fill="${color}" stroke="#0f172a" stroke-width="0.5"/>
        </svg></div>`;
    return L.divIcon({ className: 'vessel-icon', html, iconSize: [16, 16], iconAnchor: [8, 8] });
}

function redrawMap(rows) {
    layers.passed.clearLayers();
    layers.intent.clearLayers();
    layers.nearby.clearLayers();
    rows.forEach(v => {
        if (v.lat == null || v.lon == null) return;
        const layer = layers[v.classification] || layers.nearby;
        const m = L.marker([v.lat, v.lon], { icon: vesselIcon(v.classification, v.cog) });
        m.bindPopup(`
            <strong>${escapeHtml(v.name || '(bez imena)')}</strong><br/>
            MMSI: ${v.mmsi}<br/>
            Zastava: ${escapeHtml(v.flag)}<br/>
            SOG: ${v.sog != null ? v.sog.toFixed(1) + ' kn' : '—'}<br/>
            COG: ${v.cog != null ? Math.round(v.cog) + '°' : '—'}<br/>
            <em>${escapeHtml(v.intentReason)}</em>
        `);
        m.addTo(layer);
    });
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function fetchData() {
    const btn = document.getElementById('btnRefresh');
    btn.disabled = true;
    btn.textContent = '⏳ Dohvaćam...';
    try {
        const r = await fetch(DATA_URL, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        if (!Array.isArray(data.vessels)) throw new Error('Neočekivan odgovor');

        state.raw = data.vessels.map(v => {
            const rec = {
                mmsi: String(v.mmsi),
                name: (v.name || '').toString().trim(),
                flag: flagFromMMSI(v.mmsi),
                lat: typeof v.lat === 'number' ? v.lat : null,
                lon: typeof v.lon === 'number' ? v.lon : null,
                sog: typeof v.sog === 'number' ? v.sog : null,
                cog: typeof v.cog === 'number' ? v.cog : null
            };
            rec.classification = classifyVessel(rec);
            rec.intentReason = intentReason(rec);
            return rec;
        });
        state.lastFetch = new Date();
        populateFlagFilter();
        applyFilters();

        const ts = data.timestamp ? new Date(data.timestamp * 1000).toLocaleString('hr-HR') : state.lastFetch.toLocaleString('hr-HR');
        document.getElementById('statusLine').textContent =
            `🟢 ${state.raw.length} plovila · izvor: hormuztoll.com · zadnji fetch: ${state.lastFetch.toLocaleTimeString('hr-HR')} · podaci: ${ts}`;
    } catch (e) {
        document.getElementById('statusLine').textContent = '🔴 Greška: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Osvježi';
    }
}

function populateFlagFilter() {
    const flags = new Set();
    state.raw.forEach(v => flags.add(v.flag));
    const sel = document.getElementById('filterFlag');
    const current = sel.value;
    sel.innerHTML = '<option value="all">Sve zastave</option>' +
        [...flags].sort().map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    sel.value = current || 'all';
}

function applyFilters() {
    const cat = document.getElementById('filterCategory').value;
    const flag = document.getElementById('filterFlag').value;
    const minSog = parseFloat(document.getElementById('filterSog').value) || 0;
    const search = document.getElementById('filterSearch').value.toLowerCase().trim();

    let rows = state.raw.filter(v => {
        if (cat !== 'all' && v.classification !== cat) return false;
        if (flag !== 'all' && v.flag !== flag) return false;
        if (minSog > 0 && (v.sog || 0) < minSog) return false;
        if (search) {
            const hay = `${v.name || ''} ${v.mmsi}`.toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    rows.sort((a, b) => {
        const f = state.sortField;
        let av = a[f], bv = b[f];
        if (av == null) av = (typeof bv === 'number') ? -Infinity : '';
        if (bv == null) bv = (typeof av === 'number') ? -Infinity : '';
        if (typeof av === 'number' && typeof bv === 'number') {
            return state.sortDir === 'asc' ? av - bv : bv - av;
        }
        const r = String(av).localeCompare(String(bv), 'hr');
        return state.sortDir === 'asc' ? r : -r;
    });

    state.filtered = rows;
    updateCounts();
    renderBreakdown(rows);
    renderTable(rows);
    redrawMap(rows);
}

function updateCounts() {
    const counts = { passed: 0, intent: 0, nearby: 0 };
    state.raw.forEach(v => counts[v.classification]++);
    document.getElementById('countPassed').textContent = counts.passed;
    document.getElementById('countIntent').textContent = counts.intent;
    document.getElementById('countNearby').textContent = counts.nearby;
    document.getElementById('countTotal').textContent = state.raw.length;
}

function renderBreakdown(rows) {
    const byCat = { passed: 0, intent: 0, nearby: 0 };
    const byFlag = {};
    rows.forEach(v => {
        byCat[v.classification]++;
        const f = v.flag;
        byFlag[f] = (byFlag[f] || 0) + 1;
    });

    const catLabels = { passed: 'U tjesnacu', intent: 'Namjera', nearby: 'U blizini' };
    document.getElementById('breakdownCat').innerHTML = Object.entries(byCat)
        .map(([k, v]) => `<div class="breakdown-row"><span>${catLabels[k]}</span><span class="count">${v}</span></div>`).join('');

    const topFlags = Object.entries(byFlag).sort((a, b) => b[1] - a[1]).slice(0, 15);
    document.getElementById('breakdownFlag').innerHTML = topFlags.length
        ? topFlags.map(([f, n]) => `<div class="breakdown-row"><span>${escapeHtml(f)}</span><span class="count">${n}</span></div>`).join('')
        : '<div style="color:#94a3b8; font-size:13px;">—</div>';
}

function renderTable(rows) {
    const tbody = document.getElementById('shipsBody');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:20px;">Nema plovila za zadane kriterije</td></tr>';
        return;
    }
    const labels = { passed: 'U tjesnacu', intent: 'Namjera', nearby: 'U blizini' };
    tbody.innerHTML = rows.slice(0, 500).map(v => `
        <tr class="row-${v.classification}" title="${escapeHtml(v.intentReason)}">
            <td><span class="badge ${v.classification}">${labels[v.classification]}</span></td>
            <td>${escapeHtml(v.name || '(bez imena)')}</td>
            <td class="nowrap">${v.mmsi}</td>
            <td>${escapeHtml(v.flag)}</td>
            <td>${v.sog != null ? v.sog.toFixed(1) : '—'}</td>
            <td>${v.cog != null ? Math.round(v.cog) + '°' : '—'}</td>
            <td>${v.lat != null ? v.lat.toFixed(3) : '—'}</td>
            <td>${v.lon != null ? v.lon.toFixed(3) : '—'}</td>
        </tr>`).join('') +
        (rows.length > 500 ? `<tr><td colspan="8" style="text-align:center; color:#94a3b8;">... i još ${rows.length - 500} redaka (prikazujemo prvih 500, suzite filter)</td></tr>` : '');
}

function setupSort() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const f = th.dataset.sort;
            if (state.sortField === f) {
                state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortField = f;
                state.sortDir = 'desc';
            }
            applyFilters();
        });
    });
}

function setupAutoRefresh() {
    const sel = document.getElementById('autoRefresh');
    const apply = () => {
        if (state.autoTimer) { clearInterval(state.autoTimer); state.autoTimer = null; }
        const s = parseInt(sel.value);
        if (s > 0) state.autoTimer = setInterval(fetchData, s * 1000);
    };
    sel.addEventListener('change', apply);
    apply();
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupSort();
    setupAutoRefresh();
    document.getElementById('btnRefresh').addEventListener('click', fetchData);
    ['filterCategory', 'filterFlag'].forEach(id =>
        document.getElementById(id).addEventListener('change', applyFilters));
    ['filterSearch', 'filterSog'].forEach(id =>
        document.getElementById(id).addEventListener('input', applyFilters));
    fetchData();
});
