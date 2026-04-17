// Hormuz tracker frontend

let state = {
    passed: [],
    intent: [],
    nearby: [],
    filtered: [],
    sortField: 'lastSeen',
    sortDir: 'desc',
    zones: null
};

let map, mapLayers = {
    passed: null, intent: null, nearby: null,
    strait: null, west: null, east: null
};

function initMap() {
    map = L.map('map').setView([26.5, 56.5], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    mapLayers.passed = L.layerGroup().addTo(map);
    mapLayers.intent = L.layerGroup().addTo(map);
    mapLayers.nearby = L.layerGroup().addTo(map);
}

function drawZones(zones) {
    if (!zones) return;
    if (mapLayers.strait) map.removeLayer(mapLayers.strait);
    if (mapLayers.west) map.removeLayer(mapLayers.west);
    if (mapLayers.east) map.removeLayer(mapLayers.east);

    mapLayers.strait = L.rectangle(
        [[zones.strait.latMin, zones.strait.lonMin], [zones.strait.latMax, zones.strait.lonMax]],
        { color: '#10b981', weight: 2, fillOpacity: 0.08 }
    ).bindTooltip('Uži pojas tjesnaca').addTo(map);

    mapLayers.west = L.rectangle(
        [[zones.westApproach.latMin, zones.westApproach.lonMin], [zones.westApproach.latMax, zones.westApproach.lonMax]],
        { color: '#f59e0b', weight: 1, fillOpacity: 0.04, dashArray: '4 4' }
    ).bindTooltip('Zapadni prilaz (Perzijski zaljev)').addTo(map);

    mapLayers.east = L.rectangle(
        [[zones.eastApproach.latMin, zones.eastApproach.lonMin], [zones.eastApproach.latMax, zones.eastApproach.lonMax]],
        { color: '#f59e0b', weight: 1, fillOpacity: 0.04, dashArray: '4 4' }
    ).bindTooltip('Istočni prilaz (Omanski zaljev)').addTo(map);
}

function vesselIcon(cls, heading) {
    const color = cls === 'passed' ? '#10b981' : cls === 'intent' ? '#f59e0b' : '#94a3b8';
    const rot = (heading === null || heading === undefined) ? 0 : heading;
    const html = `<div style="transform: rotate(${rot}deg); transform-origin: 50% 50%;">
        <svg width="18" height="18" viewBox="-5 -5 10 10">
            <polygon points="0,-4 3,4 0,2 -3,4" fill="${color}" stroke="#0f172a" stroke-width="0.5"/>
        </svg>
    </div>`;
    return L.divIcon({ className: 'vessel-icon', html, iconSize: [18, 18], iconAnchor: [9, 9] });
}

function plotVessel(v) {
    if (v.lat === null || v.lon === null) return;
    const layer = mapLayers[v.classification] || mapLayers.nearby;
    const marker = L.marker([v.lat, v.lon], { icon: vesselIcon(v.classification, v.heading || v.cog) });
    marker.bindPopup(`
        <strong>${escapeHtml(v.name || '(bez imena)')}</strong><br/>
        MMSI: ${v.mmsi}<br/>
        Zastava: ${escapeHtml(v.flag)}<br/>
        Tip: ${escapeHtml(v.typeName)} (${escapeHtml(v.category)})<br/>
        Destinacija: ${escapeHtml(v.destination || '—')}<br/>
        SOG: ${v.sog !== null ? v.sog.toFixed(1) + ' kn' : '—'}<br/>
        COG: ${v.cog !== null ? Math.round(v.cog) + '°' : '—'}<br/>
        <em>${escapeHtml(v.intentReason || '')}</em>
    `);
    marker.addTo(layer);
}

function redrawMap(all) {
    mapLayers.passed.clearLayers();
    mapLayers.intent.clearLayers();
    mapLayers.nearby.clearLayers();
    all.forEach(plotVessel);
}

function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function loadStatus() {
    try {
        const r = await fetch('/api/status');
        const s = await r.json();
        const dot = s.connected ? '🟢' : '🔴';
        document.getElementById('statusLine').textContent =
            `${dot} AIS: ${s.connected ? 'spojeno' : 'nespojeno'} · praćeno ${s.trackedVessels} plovila · ${s.messagesReceived} poruka · start: ${new Date(s.startedAt).toLocaleString('hr-HR')}`;
    } catch (e) {
        document.getElementById('statusLine').textContent = '⚠ Greška pri dohvatu statusa';
    }
}

async function loadShips() {
    const from = document.getElementById('dateFrom').value;
    const to = document.getElementById('dateTo').value;
    const r = await fetch(`/api/ships?from=${from}&to=${to}`);
    const data = await r.json();
    if (!data.success) return;

    state.passed = data.passed;
    state.intent = data.intent;
    state.nearby = data.nearby;
    state.zones = data.zones;

    document.getElementById('countPassed').textContent = data.counts.passed;
    document.getElementById('countIntent').textContent = data.counts.intent;
    document.getElementById('countNearby').textContent = data.counts.nearby;
    document.getElementById('countTotal').textContent = data.counts.total;

    drawZones(data.zones);
    populateFilters();
    applyFilters();
}

function populateFilters() {
    const all = [...state.passed, ...state.intent, ...state.nearby];
    const types = new Set(), flags = new Set();
    all.forEach(v => {
        if (v.category) types.add(v.category);
        if (v.flag) flags.add(v.flag);
    });

    const typeSel = document.getElementById('filterType');
    const currentType = typeSel.value;
    typeSel.innerHTML = '<option value="all">Svi tipovi</option>' +
        [...types].sort().map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    typeSel.value = currentType || 'all';

    const flagSel = document.getElementById('filterFlag');
    const currentFlag = flagSel.value;
    flagSel.innerHTML = '<option value="all">Sve zastave</option>' +
        [...flags].sort().map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    flagSel.value = currentFlag || 'all';
}

function applyFilters() {
    const cat = document.getElementById('filterCategory').value;
    const type = document.getElementById('filterType').value;
    const flag = document.getElementById('filterFlag').value;
    const search = document.getElementById('filterSearch').value.toLowerCase().trim();

    let pool = [];
    if (cat === 'all' || cat === 'passed') pool.push(...state.passed);
    if (cat === 'all' || cat === 'intent') pool.push(...state.intent);
    if (cat === 'all' || cat === 'nearby') pool.push(...state.nearby);

    let out = pool.filter(v => {
        if (type !== 'all' && v.category !== type) return false;
        if (flag !== 'all' && v.flag !== flag) return false;
        if (search) {
            const hay = `${v.name || ''} ${v.mmsi} ${v.destination || ''} ${v.previousDestination || ''}`.toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    out.sort((a, b) => {
        const f = state.sortField;
        let av = a[f], bv = b[f];
        if (av === null || av === undefined) av = '';
        if (bv === null || bv === undefined) bv = '';
        if (typeof av === 'number' && typeof bv === 'number') {
            return state.sortDir === 'asc' ? av - bv : bv - av;
        }
        const r = String(av).localeCompare(String(bv), 'hr');
        return state.sortDir === 'asc' ? r : -r;
    });

    state.filtered = out;
    renderTable(out);
    renderBreakdown(out);
    redrawMap(out);
}

function renderTable(rows) {
    const tbody = document.getElementById('shipsBody');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:#94a3b8; padding:20px;">Nema plovila za zadane kriterije</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(v => {
        const clsLabel = v.classification === 'passed' ? 'Prošli' :
                         v.classification === 'intent' ? 'Namjera' : 'U blizini';
        return `<tr class="row-${v.classification}" title="${escapeHtml(v.intentReason || '')}">
            <td><span class="badge ${v.classification}">${clsLabel}</span></td>
            <td>${escapeHtml(v.name || '(bez imena)')}</td>
            <td class="nowrap">${v.mmsi}</td>
            <td>${escapeHtml(v.flag)}</td>
            <td>${escapeHtml(v.typeName)}</td>
            <td>${escapeHtml(v.category)}</td>
            <td>${escapeHtml(v.previousDestination || '—')}</td>
            <td>${escapeHtml(v.destination || '—')}</td>
            <td>${v.sog !== null ? v.sog.toFixed(1) : '—'}</td>
            <td>${v.cog !== null ? Math.round(v.cog) + '°' : '—'}</td>
            <td class="nowrap">${new Date(v.lastSeen).toLocaleString('hr-HR')}</td>
        </tr>`;
    }).join('');
}

function renderBreakdown(rows) {
    const byType = {}, byFlag = {};
    rows.forEach(v => {
        const k = v.category || 'Nepoznato';
        byType[k] = (byType[k] || 0) + 1;
        const f = v.flag || 'Nepoznato';
        byFlag[f] = (byFlag[f] || 0) + 1;
    });

    function render(obj, id) {
        const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
        document.getElementById(id).innerHTML = sorted.length
            ? sorted.map(([k, v]) => `<div class="breakdown-row"><span>${escapeHtml(k)}</span><span class="count">${v}</span></div>`).join('')
            : '<div style="color:#94a3b8; font-size:13px;">—</div>';
    }
    render(byType, 'breakdownType');
    render(byFlag, 'breakdownFlag');
}

function setupSort() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const f = th.dataset.sort;
            if (state.sortField === f) {
                state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortField = f;
                state.sortDir = 'asc';
            }
            applyFilters();
        });
    });
}

function setDefaultDates() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
    document.getElementById('dateFrom').value = weekAgo.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setDefaultDates();
    setupSort();

    document.getElementById('btnRefresh').addEventListener('click', async () => {
        await loadShips();
        await loadStatus();
    });
    document.getElementById('btnReconnect').addEventListener('click', async () => {
        await fetch('/api/refresh');
        setTimeout(loadStatus, 1500);
    });
    document.getElementById('btnHistory').addEventListener('click', async () => {
        const btn = document.getElementById('btnHistory');
        const limit = parseInt(document.getElementById('historyLimit').value) || 20;
        const ok = confirm(`Provjerit ću 24h povijest kretanja za do ${limit} brodova u blizini tjesnaca.\n\nTo troši ${limit} Datalastic poziva. Nastavljam?`);
        if (!ok) return;
        btn.disabled = true;
        btn.textContent = '⏳ Provjeravam...';
        try {
            const r = await fetch(`/api/history_check?limit=${limit}`);
            const j = await r.json();
            if (!j.success) {
                alert('Greška: ' + (j.error || 'nepoznata'));
            } else {
                let msg = `Provjereno ${j.checked} brodova, potrošeno ${j.apiCalls} API poziva.\n`;
                msg += `Novo označeno kao "prošlo": ${j.newlyPassed}.`;
                if (j.newlyPassedVessels && j.newlyPassedVessels.length) {
                    msg += '\n\nDetalji:\n' + j.newlyPassedVessels.map(v =>
                        ` - ${v.name || v.mmsi} (${v.flag}) u ${new Date(v.passedAt).toLocaleString('hr-HR')}`
                    ).join('\n');
                }
                if (j.note) msg += '\n\n' + j.note;
                alert(msg);
                await loadShips();
            }
        } catch (e) {
            alert('Greška: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '📜 Provjeri povijest 24h';
        }
    });
    ['filterCategory', 'filterType', 'filterFlag'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('filterSearch').addEventListener('input', applyFilters);
    ['dateFrom', 'dateTo'].forEach(id => {
        document.getElementById(id).addEventListener('change', loadShips);
    });

    loadStatus();
    loadShips();
    setInterval(loadStatus, 10000);
});
