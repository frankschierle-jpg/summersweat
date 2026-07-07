# SUMMERSWEAT 🩷

Persönlicher 6-Wochen Cardio- & HIIT-Tracker mit Fokus auf Kalorienverbrauch.
Für die Nutzung durch **eine Person auf einem Gerät** gebaut – alle Daten (Checkins,
Gewicht, Größe) werden lokal im Browser gespeichert (`localStorage`). Es gibt keinen
Server und kein Backend.

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) ≥ 18

```bash
npm install
npm run dev
```

Die App läuft danach unter `http://localhost:5173`.

## Auf GitHub Pages deployen

### 1. Repository vorbereiten

1. Erstelle auf GitHub ein neues Repository, z. B. `summersweat`.
2. Push diesen Ordner in das Repository (Branch `main`):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<dein-username>/summersweat.git
   git push -u origin main
   ```

3. **Wichtig:** Öffne `vite.config.js` und trage bei `base` exakt deinen
   Repository-Namen ein, z. B. `base: "/summersweat/"`. Der Wert muss zum
   Repo-Namen passen, sonst laden CSS/JS auf GitHub Pages nicht korrekt.

### 2. GitHub Pages aktivieren

1. Gehe im Repository zu **Settings → Pages**.
2. Wähle bei **Source** die Option **GitHub Actions**.

Das war's schon – die enthaltene Workflow-Datei
(`.github/workflows/deploy.yml`) baut die App bei jedem Push auf `main`
automatisch und veröffentlicht sie auf GitHub Pages. Nach ein paar Minuten ist
die App unter `https://<dein-username>.github.io/summersweat/` erreichbar.

### Alternative: manuelles Deployment mit `gh-pages`

Falls du lieber manuell deployen möchtest statt über GitHub Actions:

```bash
npm run build
npm run deploy
```

Das baut die App und veröffentlicht den `dist`-Ordner auf dem `gh-pages`-Branch.
Stelle in diesem Fall bei **Settings → Pages** als Source **Deploy from a
branch** → `gh-pages` ein.

## App zum Startbildschirm hinzufügen (Samsung/Android)

Die App enthält ein Web-App-Manifest (`public/manifest.json`) mit Icon in
mehreren Größen. Damit lässt sie sich auf einem Android-/Samsung-Smartphone
wie eine echte App installieren:

1. Seite in Chrome/Samsung Internet öffnen.
2. Menü (⋮) → **„Zum Startbildschirm hinzufügen"** bzw. **„App installieren"**.
3. Das SUMMERSWEAT-Icon erscheint danach auf dem Homescreen und startet die
   App im Vollbild-Modus (ohne Browserleiste).

### Icon austauschen

Im Projekt liegen fünf Icon-Entwürfe zur Auswahl unter
`public/icons/alternativen/` (Übersicht: `uebersicht-alle-5.png`). Standardmäßig
aktiv ist Entwurf **A – Gradient-Bubble-S**. Um ein anderes Icon zu verwenden:

1. Gewünschte PNG-Datei aus `public/icons/alternativen/` auswählen.
2. In `public/icons/icon-192.png` und `public/icons/icon-512.png` umbenennen/ersetzen
   (ggf. vorher auf 192×192 bzw. 512×512 px skalieren).
3. Für das `maskable`-Icon (wird auf manchen Android-Launchern in einen Kreis/
   Squircle beschnitten) sollte das Motiv etwas kleiner/zentrierter sein, damit
   nichts abgeschnitten wird – notfalls `icon-maskable-512.png` mit mehr
   Rand-Abstand neu exportieren.

## Projektstruktur

```
summersweat/
├── .github/workflows/deploy.yml   # Automatisches Deployment auf GitHub Pages
├── public/
│   ├── manifest.json               # PWA-Manifest (Android/Samsung Startbildschirm-Icon)
│   └── icons/                      # App-Icons (192px, 512px, maskable + 5 Alternativen)
├── src/
│   ├── App.jsx                     # Gesamte App-Logik & UI
│   └── main.jsx                    # React-Einstiegspunkt
├── index.html
├── vite.config.js                  # Enthält den GitHub-Pages "base"-Pfad
└── package.json
```

## Daten & Speicherung

Alle Daten (tägliche Checkins, Gewicht, Größe, wöchentlicher Gewichtscheck)
werden ausschließlich im `localStorage` des Browsers auf diesem einen Gerät
gespeichert. Es findet keine Übertragung an einen Server statt. Wird der
Browser-Speicher geleert oder die App auf einem anderen Gerät geöffnet, sind
die bisherigen Einträge nicht verfügbar.
