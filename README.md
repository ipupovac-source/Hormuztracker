# Hormuz Strait Vessel Tracker

Dashboard za praćenje brodova koji prolaze kroz Hormuz tjesnac, s realnim AIS podacima.

## Što radi

- Prikazuje **realne brodove** u regiji Perzijski zaljev / Omanski zaljev / Arapsko more
- Klasificira plovila u tri kategorije:
  - **Prošli** — zabilježeni AIS pozicijom unutar užeg pojasa tjesnaca (26°–27°N, 56°–57°E)
  - **Namjera prolaska** — u zapadnom/istočnom prilazu, SOG > 1 kn i kurs (COG) unutar 45° od smjera prema središtu tjesnaca
  - **U blizini** — u širem području ali bez jasne namjere prolaska
- Filteri po tipu, zastavi, pretraga po imenu/MMSI
- Sortiranje po svim stupcima tablice
- Leaflet karta s pozicijama, zonama i tooltip-ovima
- Ručno osvježavanje podataka

## Izvori podataka

1. **hormuztoll.com/hormuzserver_wide.php** — javni JSON endpoint s ~1290 plovila u regiji (pozicija, MMSI, ime, SOG, COG). Primarni izvor.
2. **AISStream.io** — WebSocket feed, koristi se sekundarno. Pokrivenost za Perzijski zaljev je ograničena.

Zastava se izvodi iz MMSI (prve tri znamenke = MID, Maritime Identification Digits).

## Pokretanje

```bash
cd hormuz
npm install
node server.js
# Otvori http://localhost:8082
```

Opcionalno, AISStream ključ kao argument:
```bash
node server.js <AISSTREAM_API_KEY>
```

## Struktura

- `server.js` — HTTP server na 8082, AIS WS klijent, hormuztoll poller, klasifikacija
- `public/index.html` — dashboard
- `public/app.js` — frontend logika, Leaflet karta, filteri
- `public/styles.css` — stilovi
- `data/vessels.json` — persistirani podaci (git-ignored)

## API endpointi

- `GET /api/ships?from=YYYY-MM-DD&to=YYYY-MM-DD` — plovila u periodu, grupirana po klasifikaciji
- `GET /api/status` — status AIS veze i izvora
- `GET /api/refresh` — ručno osvježavanje (fetch hormuztoll + reconnect AIS)
- `GET /api/reset` — obriši spremljene plovila

## Napomena o točnosti

Tijekom krize u 2026., promet kroz tjesnac je drastično smanjen (od 100+/dan na <10/dan). Uz to, brojna plovila namjerno isključuju AIS transpondere ("going dark"), pa stvarni promet može biti veći od prikazanog.
