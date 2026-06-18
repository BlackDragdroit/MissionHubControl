const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Verbindung zur PostgreSQL-Datenbank (Internes Coolify-Netzwerk benötigt kein SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false
});

// Verhindert, dass ein unerwarteter Verbindungsfehler den gesamten Server beendet
pool.on('error', (err) => {
  console.error("Unerwarteter PostgreSQL-Pool-Fehler:", err.message);
});

// Datenbank beim Start initialisieren
async function initDb() {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        phases JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("PostgreSQL-Datenbank erfolgreich initialisiert.");
  } catch (err) {
    console.error("Fehler bei der Datenbank-Initialisierung:", err.message);
  } finally {
    if (client) client.release();
  }
}

initDb();

// --- API ENDPUNKTE ---

// 1. Alle Projekte laden
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY updated_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

// 2. Projekt speichern oder updaten
app.post('/api/projects', async (req, res) => {
  const { id, name, description, color, phases } = req.body;
  try {
    await pool.query(`
      INSERT INTO projects (id, name, description, color, phases)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, description = EXCLUDED.description, color = EXCLUDED.color, phases = EXCLUDED.phases, updated_at = NOW()
    `, [id, name, description, color, JSON.stringify(phases)]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Speichern" });
  }
});

// 3. Projekt loeschen
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Loeschen" });
  }
});

// --- FRONTEND SHELL ---
// JSX und Tailwind werden beim Build vorkompiliert (siehe Dockerfile / npm run build).
// Hier wird nur die statische Hülle ausgeliefert; React/ReactDOM kommen als gepinnte
// Produktions-Builds vom CDN, App-Logik und Styles aus /public.
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Mission Control Hub</title>

    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Mission Control">

    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%23111827' stroke='%233b82f6' stroke-width='4'/%3E%3Ctext y='68' x='20' font-size='55'%3E🛰️%3C/text%3E%3C/svg%3E">
    <link class="ios-icon" rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%23111827' stroke='%233b82f6' stroke-width='4'/%3E%3Ctext y='68' x='20' font-size='55'%3E🛰️%3C/text%3E%3C/svg%3E">

    <link rel="manifest" href="/manifest.webmanifest">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="/styles.css">
</head>
<body class="min-h-screen antialiased">
    <div class="sky"></div>
    <div id="root" class="relative z-10"></div>

    <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin></script>
    <script src="/app.js"></script>
</body>
</html>
  `);
});

// PWA-Manifest (als eigene Route, damit start_url gültig ist)
app.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json').send(JSON.stringify({
    name: "Mission Control Hub",
    short_name: "Mission Control",
    start_url: "/",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    icons: [{
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%23111827' stroke='%233b82f6' stroke-width='4'/%3E%3Ctext y='68' x='20' font-size='55'%3E🛰️%3C/text%3E%3C/svg%3E",
      sizes: "512x512",
      type: "image/svg+xml"
    }]
  }));
});

app.listen(PORT, () => {
  console.log(`Mission Control Hub laeuft auf Port ${PORT}`);
});
