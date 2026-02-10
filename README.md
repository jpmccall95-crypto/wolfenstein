# Wolfenstein 3D - Browser Klon

Ein Wolfenstein 3D Klon als Browser-Spiel mit Singleplayer, Deathmatch und Co-op Multiplayer.

![Wolfenstein 3D Browser](https://img.shields.io/badge/Wolfenstein_3D-Browser_Klon-cc0000?style=for-the-badge)

## Features

- Klassisches DDA-Raycasting (wie das Original von 1992)
- Texturierte Waende (prozedural generiert, kein externes Asset)
- WASD + Maus Steuerung mit Pointer Lock
- Singleplayer mit KI-Gegnern
- Online Multiplayer: Deathmatch und Co-op Modus
- Lobby-System mit Host-Kontrolle
- In-Game Chat und Scoreboard
- Prozedural generierte Soundeffekte (Web Audio API)
- Partikeleffekte bei Treffern
- Server-autoritative Architektur mit Lag-Compensation

## Installation

```bash
git clone <repository-url>
cd wolfenstein
npm install
npm start
```

Oeffne http://localhost:3000 im Browser.

### Singleplayer (ohne Server)

Einfach `index.html` direkt im Browser oeffnen - kein Server noetig.

## Online Spielen

### Methode 1: ngrok (schnell, temporaer)

Die einfachste Methode um mit Freunden online zu spielen:

```bash
# 1. ngrok installieren (einmalig)
npm install -g ngrok

# 2. Server mit Anleitung starten
npm run online

# 3. In einem NEUEN Terminal:
ngrok http 3000
```

ngrok zeigt eine URL an (z.B. `https://abc123.ngrok.io`).
Schicke diesen Link an deine Mitspieler - fertig!

### Methode 2: Railway (permanent, kostenlos)

Fuer einen dauerhaften Server:

1. Erstelle einen Account auf [railway.app](https://railway.app)
2. Pushe das Projekt auf GitHub
3. In Railway: "New Project" → "Deploy from GitHub repo"
4. Repository auswaehlen - Railway erkennt die Konfiguration automatisch
5. Nach dem Deploy bekommst du eine permanente URL

Railway setzt den `PORT` automatisch - der Server unterstuetzt das bereits.

### Methode 3: Docker

```bash
docker-compose up
```

Oder manuell:

```bash
docker build -t wolfenstein3d .
docker run -p 3000:3000 wolfenstein3d
```

### Methode 4: LAN (gleiches Netzwerk)

```bash
npm start
```

Der Server zeigt die lokale Netzwerk-IP an.
Mitspieler im gleichen WLAN/Netzwerk oeffnen `http://<IP>:3000`.

## Steuerung

| Taste | Aktion |
|---|---|
| W / A / S / D | Bewegen / Strafing |
| Maus | Umsehen |
| Leertaste / Linksklick | Schiessen |
| Tab | Scoreboard anzeigen |
| Enter | Chat oeffnen |
| Escape | Chat schliessen |

## Spielmodi

### Singleplayer

Oeffne `index.html` direkt im Browser (ohne Server).
Kaempfe gegen 8 KI-Gegner in einer Arena mit mehreren Raeumen.

### Deathmatch (Multiplayer)

Jeder gegen jeden. Der Spieler mit den meisten Kills gewinnt.
- Automatischer Respawn nach 3 Sekunden
- Farbige Spieler-Sprites mit Nametags
- Kill-Feed und Scoreboard

### Co-op (Multiplayer)

Alle Spieler zusammen gegen KI-Gegner-Wellen.
- Welle 1: 5 Gegner, jede weitere Welle +3
- Gegner werden mit jeder Welle staerker (mehr HP, schneller)
- Health-Pickups spawnen in jeder Welle
- Respawn nach 5 Sekunden
- Alle Spieler gleichzeitig tot = Game Over

## Technik

| Komponente | Technologie |
|---|---|
| Engine | DDA-Raycasting mit Fisheye-Korrektur |
| Rendering | HTML5 Canvas, ImageData Pixelpuffer |
| Texturen | Prozedural generiert (64x64, 4 Typen) |
| Audio | Web Audio API (prozedural, kein externes Audio) |
| Netzwerk | Socket.io, Server-autoritativ, 20 Hz Tick-Rate |
| Optimierung | Delta-Compression, Lag-Compensation |

## Projektstruktur

```
wolfenstein/
├── index.html          # Hauptseite
├── styles.css          # Styling
├── server.js           # Multiplayer-Server
├── online.js           # Online-Starter mit ngrok-Anleitung
├── package.json
├── Dockerfile
├── docker-compose.yml
├── railway.json
└── js/
    ├── map.js          # Kartendaten (30x30 Grid)
    ├── engine.js       # DDA-Raycasting
    ├── renderer.js     # Canvas-Rendering, Sprites
    ├── player.js       # Spieler-Klasse
    ├── enemy.js        # Gegner-KI (Singleplayer)
    ├── input.js        # Tastatur + Maus
    ├── network.js      # Client-Netzwerk
    ├── hud.js          # HUD-Elemente
    ├── sound.js        # Prozedural generierte Sounds
    ├── particles.js    # Partikeleffekte
    └── game.js         # Hauptspiellogik
```
