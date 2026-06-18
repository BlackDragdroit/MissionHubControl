# Mission Control Hub

Multi-Projekt-Dashboard (Express + PostgreSQL) mit vorkompiliertem React-Frontend und Tailwind CSS.

Tailwind und JSX werden **beim Build** kompiliert, nicht im Browser. Dadurch verschwinden die Produktions-Warnungen von `cdn.tailwindcss.com` und vom In-Browser-Babel-Transformer.

## Struktur

    server.js            Express-Backend + statische Auslieferung + HTML-Hülle
    src/app.jsx          Komplette React-App (Quelle)
    src/input.css        Tailwind-Direktiven + eigenes CSS
    tailwind.config.js   Theme (Farben, Schriften) + content-Pfade
    .babelrc             preset-react im classic runtime (nutzt globales React)
    Dockerfile           Multi-Stage-Build (kompiliert -> /public)
    public/              Generiert beim Build: app.js + styles.css (nicht committen)

## Lokal bauen & starten

    npm install
    npm run build        # erzeugt public/app.js und public/styles.css
    npm start            # startet den Server (Port 3000 bzw. $PORT)

`npm run build` muss vor `npm start` laufen, sonst fehlen die Assets in `/public`.

## Deployment auf Coolify

Sobald ein `Dockerfile` im Repo liegt, nutzt Coolify dieses automatisch (statt Nixpacks).
Der Build kompiliert Tailwind + JSX und legt nur Server und Assets ins finale Image.

Erwartete Umgebungsvariablen:

    DATABASE_URL   z. B. postgres://user:pass@host:5432/dbname   (Pflicht)
    DATABASE_SSL   "true" aktiviert SSL (intern im Coolify-Netz nicht nötig)
    PORT           optional, Standard 3000

## Hinweise

- React/ReactDOM kommen weiterhin als **gepinnte Produktions-Builds** vom CDN
  (react@18.3.1). Das löst keine Warnung aus. Bei Bedarf lassen sie sich auch
  selbst hosten.
- Schriften kommen von Google Fonts; ohne Internet fällt der Browser sauber
  auf System-Schriften zurück.
