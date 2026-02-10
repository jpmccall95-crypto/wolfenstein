# Wolfenstein 3D - Browser Klon

## Hinweise zum User
- Hat noch nicht viel Erfahrung mit Code, Coding, Deployment, Hosting etc.
- Erklaerungen einfach und verstaendlich halten, Fachbegriffe kurz erlaeutern
- Bei Entscheidungen klare Empfehlungen geben statt nur Optionen aufzulisten

## Projektstatus: Phase 4 abgeschlossen + Boss-Feature

### Git-Status
- **Letzter Commit:** `5589541` (.gitignore hinzufuegen)
- **Committet:** Phase 1 (SP), Phase 2 (MP), .gitignore
- **Noch NICHT committet:** Phase 3 (Co-op, Sounds, Deployment), Phase 4 (Tueren, Waffen, Gold, Musik), Boss-Feature
- Alle uncommitteten Aenderungen sind getestet und funktionsfaehig

### Abgeschlossene Phasen

**Phase 1 - Singleplayer Prototyp** (committet)
- DDA-Raycasting Engine mit Fisheye-Korrektur
- Prozedurale Texturen (64x64, in engine.js generiert)
- WASD + Maus Steuerung mit Pointer Lock API
- Pistole mit Animation (Bob, Kick, Muendungsfeuer)
- 8 KI-Gegner mit Zustandsmaschine (idle/chase/attack)
- HUD: Minimap, Health-Bar, Crosshair, FPS-Counter
- Health-Pickups von toten Gegnern

**Phase 2 - Multiplayer** (committet)
- Node.js Server (Express + Socket.io), 20 Hz Tick-Rate
- Server-autoritative Architektur
- Client-side Prediction + Server-Korrektur (snap >0.5, lerp 0.2)
- Interpolation fuer Remote-Spieler (lerp dt*15)
- Deathmatch: Jeder gegen jeden, 3s Respawn
- Farbige Spieler-Sprites (8 Farben, gecacht), Nametags
- Chat (Enter), Scoreboard (Tab), Kill-Feed
- Singleplayer funktioniert weiterhin (index.html direkt oeffnen)
- Netzwerk-IP wird beim Serverstart angezeigt

**Phase 3 - Co-op + Polish + Deployment** (noch nicht committet)
- Co-op Modus: Alle Spieler vs. KI-Wellen
  - Welle N: 5 + (N-1)*3 Gegner
  - HP: min(200, 50 + (N-1)*10), Speed: min(3.5, 1.5 + (N-1)*0.15)
  - 10s Countdown zwischen Wellen, Spieler werden wiederbelebt
  - Health-Pickups pro Welle (1 pro 3 Gegner)
  - Game Over wenn alle Spieler tot, nach 8s zurueck in Lobby
- Lobby-System: Namenswahl, Modus-Auswahl (Host), Spielerliste, Start-Button
- Soundeffekte (Web Audio API, prozedural): Schuss, Treffer, Pickup, Schritte, Wellen-Start
- Partikelsystem: Treffer-Partikel, Funken (Bildschirm-Koordinaten)
- Verbesserter Waffen-Bob (schneller, natuerlicher Ruecklauf)
- Verbesserter Todesscreen: Killer-Name + Respawn-Countdown
- Scoreboard mit Ping-Spalte
- Delta-Compression: Nur geaenderte Spielerdaten senden, voller Snapshot alle 5 Ticks
- Lag-Compensation: 1s Positionshistorie, Rewind bei Schuss basierend auf Ping
- Gerundete Koordinaten (2 Dezimalstellen)
- Deployment: Dockerfile, docker-compose.yml, railway.json, ngrok-Script

**Phase 4 - Tueren, Waffen, Gold & Musik** (noch nicht committet)
- Tuersystem: Normale Tueren (Typ 5) und Geheimtueren (Typ 6)
  - E-Taste zum Oeffnen, automatisches Schliessen nach 5s
  - Geheimtueren sehen aus wie normale Waende (getDisguiseTexture)
  - Animation: oeffnet/schliesst, Zustandsmaschine (closed/opening/open/closing)
  - Synchronisation im Multiplayer (Server-autoritativ, Doors.serialize/deserialize)
- Waffensystem: 3 Waffen (Pistole, Schrotflinte, Maschinengewehr)
  - Pistole: 25 Schaden, 0.35s Cooldown (gratis, Startwaffe)
  - Schrotflinte: 60 Schaden, 0.8s Cooldown, breiter Trefferwinkel +0.08 (50 Gold)
  - Maschinengewehr: 15 Schaden, 0.1s Cooldown, Dauerfeuer (100 Gold)
  - Wechsel mit 1/2/3 oder Scrollrad
  - Verschiedene Waffen-Grafiken und HUD-Anzeige
  - Funktioniert in SP, Deathmatch UND Co-op
- Gold-System: Gegner droppen Gold (40% Chance), grosse Schaetze in Geheimraeumen
  - Gold-Anzeige im HUD, Kauf-Hinweis bei Waffen-Pickups
  - Gold-Pickups sind lokal (clientseitig), nicht server-verwaltet
- Groessere Karte: 40x40 mit 10 Raeumen, 14 Tueren (11 normal + 3 geheim)
  - 3 Geheimraeume in den Aussenmauern
  - 15 Gegner-Spawns, 14 Spieler-Spawns, 10 Schatz-Spawns, 3 Waffen-Spawns
- Hintergrundmusik: Prozedural generierter Chiptune-Stil (Web Audio API)
  - 140 BPM, Bass + Melodie (2 Sektionen) + Schlagzeug (Kick, Snare, HiHat)
  - Leiser als Soundeffekte (Lautstaerke 0.12)
- Neue Sounds: Tuer-Oeffnung, Gold-Pickup, Waffen-Pickup, Waffen-Wechsel
- Neue Datei: js/doors.js (Tuer-Verwaltung, Client+Server kompatibel)

**Boss-Feature** (noch nicht committet)
- Jede 5. Welle im Co-op ist eine Boss-Welle (Welle 5, 10, 15, ...)
- Boss-Stats: HP = 300 + Welle*40 (z.B. 500 bei Welle 5, 700 bei Welle 10)
  - Schaden: min(35, 15 + Welle), schnellerer Angriff (70% Cooldown)
  - Groesserer Radius (1.5x), langsamerer Speed als normale Gegner
- Boss-Sprite: Dunkelviolett mit Hoernern und gelben Augen (64x64)
- Boss wird 60% groesser gerendert als normale Gegner (scale 1.6)
- Boss-Lebensbalken ueber dem Sprite im 3D-View
- HUD zeigt "BOSS WELLE X" in Rot statt normaler Wellen-Anzeige
- Chat-Ansage bei Boss-Welle in Rot
- Kill-Feed zeigt "BOSS" statt "Gegner" bei Boss-Kills
- Boss droppt immer grossen Goldschatz (gold_big) statt normalem Gold
- Boss-Angreifer heisst "BOSS" im Treffer-Event

### Bekannte Probleme / TODOs
- Kein Friendly-Fire Check im Co-op (Spieler koennen sich nicht gegenseitig treffen - ist OK da checkShotPlayers nur im DM verwendet wird)
- ngrok-Link aendert sich bei jedem Neustart (kostenlose Version)
- Keine Persistenz (Scores gehen bei Serverneustart verloren)
- Browser Pointer Lock erfordert User-Klick (geloest durch "Klicke um zu spielen" Screen)

### Architektur

```
Browser (Client)                    Node.js (Server)
─────────────────                   ─────────────────
index.html                          server.js (~1007 Zeilen)
├── js/map.js      ←── shared ───→  require('./js/map.js')
├── js/doors.js    ←── shared ───→  require('./js/doors.js')
├── js/engine.js   (Raycasting)
├── js/renderer.js (Canvas+Sprites) Game Loop (20 Hz):
├── js/player.js   (Bewegung+Waffen)├── Spieler-Bewegung + Kollision
├── js/enemy.js    (SP-KI+Pickups)  ├── Schuss-Erkennung + Lag-Comp
├── js/input.js    (Tastatur/Maus)  ├── Co-op Gegner-KI + Boss
├── js/network.js  (Socket.io)      ├── Wellen-System + Boss-Spawning
├── js/hud.js      (HUD+Wellen)     ├── Respawn-Logik
├── js/sound.js    (Web Audio+Musik) ├── Tuer-Synchronisation
├── js/particles.js(Partikel)       ├── Waffen-Schaden pro Typ
└── js/game.js     (Game Loop)      └── Delta-Compressed State Broadcast
```

### Script-Ladereihenfolge (index.html)
```
socket.io.js (extern, nur wenn Server laeuft)
-> map.js -> doors.js -> input.js -> player.js -> enemy.js
-> engine.js -> sound.js -> particles.js -> network.js
-> renderer.js -> hud.js -> game.js
```

### Netzwerk-Protokoll (gameState)

Kurze Keys fuer Bandbreite:
- `p` = players, `f` = full-update Flag, `r` = removed IDs, `t` = timestamp
- Pro Spieler: `x, y, a` (angle), `h` (health), `al` (alive), `n` (name), `c` (color), `k` (kills), `d` (deaths)
- Delta-Updates: nur geaenderte Felder, `n/c` nur bei vollem Update (alle 5 Ticks)
- Co-op: `enemies[]`, `pickups[]`, `wave`, `betweenWaves`, `countdown`, `gameOver`
- Pro Gegner: `id, x, y, health, maxHealth, alive, hurtTimer, boss`
- `doors`: Serialisierter Tuer-Zustand (nur geaenderte Tueren)

### Wichtige Designentscheidungen
- map.js nutzt `module.exports` Conditional fuer Node.js Kompatibilitaet
- doors.js nutzt `require('./map.js')` auf dem Server, globale Variablen im Browser
- map.js hat `setDoorsModule()` damit isWall() auf dem Server Tueren pruefen kann
- `typeof io !== 'undefined'` erkennt ob Socket.io geladen ist (SP vs MP)
- Pointer Lock muss aus User-Gesture angefordert werden (nicht aus Socket-Event)
- Tuerenzellen (Typ 5=normal, 6=geheim) blockieren Raycasting+Bewegung wenn geschlossen
- Geheimtueren nutzen getDisguiseTexture() um wie umliegende Waende auszusehen
- Co-op Gegner-KI laeuft komplett auf dem Server, Client rendert nur
- Gold/Waffen-Pickups sind clientseitig (lokal), Health-Pickups sind server-verwaltet
- Boss-Gegner haben eigene `damage`-Eigenschaft statt globaler Konstante
- Alle Code-Kommentare sind auf Deutsch

### Karte (40x40)
- Wandtypen: 0=Leer, 1=Stein, 2=Backstein, 3=Holz, 4=Metall, 5=Tuer, 6=Geheimtuer
- 10 Raeume: TL, TC, TR, ML, MR, ML2, MR2, BL, BC, BR
- Zentraler Arena-Bereich in der Mitte
- 3 Geheimraeume: Links (Wand), Rechts (Wand), Zentral (Arena)
- Spawn-Positionen in SPAWN_POINTS Array (14 Stueck)
- Gegner-Spawns in ENEMY_SPAWNS Array (15 Stueck)
- Schatz-Spawns in TREASURE_SPAWNS Array (10 Stueck, {x, y, type})
- Waffen-Spawns in WEAPON_SPAWNS Array (3 Stueck, {x, y, type})

### Server-Konstanten (server.js)
```
PORT = 3000, TICK_RATE = 20
PLAYER_SPEED = 3.5, PLAYER_RADIUS = 0.2
SHOOT_COOLDOWN = 0.35, DAMAGE = 25 (Basis, wird durch Waffen-spezifischen Schaden ersetzt)
RESPAWN_TIME_DM = 3000ms, RESPAWN_TIME_COOP = 5000ms
ENEMY_RADIUS = 0.3, ENEMY_DAMAGE = 8, ENEMY_ATTACK_COOLDOWN = 1.5s
WAVE_PAUSE = 10s
Boss: HP = 300+wave*40, Damage = min(35, 15+wave), Radius = 0.45, Cooldown = 1.05s
```

### Waffen-Definition (server.js Spieler-Objekt)
```javascript
weapons: {
    pistol:   { owned: true,  damage: 25, cooldown: 0.35 },
    shotgun:  { owned: false, damage: 60, cooldown: 0.8  },
    mg:       { owned: false, damage: 15, cooldown: 0.1  }
}
```

### Dateigroessen (aktuell)
- server.js: ~1007 Zeilen (groesste Datei)
- js/renderer.js: ~593 Zeilen
- js/game.js: ~565 Zeilen
- js/hud.js: ~534 Zeilen
- js/network.js: ~453 Zeilen
- js/sound.js: ~413 Zeilen
- js/player.js: ~252 Zeilen
- js/engine.js: ~240 Zeilen
- js/doors.js: ~220 Zeilen
- js/map.js: ~212 Zeilen
- js/enemy.js: ~176 Zeilen
- js/input.js: ~176 Zeilen
- js/particles.js: ~90 Zeilen
- index.html: ~72 Zeilen
- styles.css: ~170 Zeilen
- **Gesamt: ~5173 Zeilen**

### Befehle
- `npm start` - Server starten (localhost:3000)
- `npm run online` - Server mit ngrok-Anleitung starten
- `ngrok http 3000` - Tunnel fuer Online-Zugang
- `docker-compose up` - Docker-Start
- Singleplayer: index.html direkt im Browser oeffnen

### Geloeste Bugs (fuer Kontext)
1. **Tueren oeffnen sich nicht im MP**: doors.js `init()` konnte auf dem Server nicht auf MAP_DATA zugreifen (war kein Global in Node.js). Loesung: `require('./map.js')` wenn `typeof module !== 'undefined'`.
2. **Spieler kann nicht durch offene Tueren laufen**: map.js `isWall()` fand Doors-Modul nicht auf Server. Loesung: `setDoorsModule()` Funktion + `_doorsRef` Variable.
3. **Waffen funktionieren nicht im Co-op**: `_checkPickups()` nur in SP aufgerufen, Gegner droppten kein Gold, Server lehnte Waffenwechsel ab. Loesung: `_checkPickups()` auch in `_updateMP()`, `onEnemyKilled` Callback fuer Gold-Drops, Server akzeptiert Waffenwechsel.
4. **Spawn-Positionen in Waenden**: Zwei Spawns kollidierten mit Pfeilern. Positionen verschoben.
