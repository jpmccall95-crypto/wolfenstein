// ============================================
// map.js - Kartendaten und Hilfsfunktionen
// Grosse 40x40 Karte mit vielen Raeumen
// ============================================

// Wandtypen:
// 0 = Leer (begehbar)
// 1 = Steinmauer (grau)
// 2 = Backsteinmauer (rot)
// 3 = Holzwand (braun)
// 4 = Metalltuer (blau)
// 5 = Tuer (normal, sichtbar - braune Holztuer)
// 6 = Geheimtuer (sieht aus wie umgebende Wand)

const MAP_WIDTH = 40;
const MAP_HEIGHT = 40;
const TEX_SIZE = 64; // Texturgroesse in Pixeln

// 40x40 Spielkarte
// TL/TR/BL/BR = Eckraeume, ML/MR = Seitenraeume
// TC/BC = Zentral-Raeume oben/unten, Zentrale Arena
// 3 Geheimraeume mit Schaetzen
const MAP_DATA = [
//   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,1], // 1
    [1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,1], // 2
    [1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,1], // 3
    [1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,1], // 4
    [1,0,0,0,2,2,1,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,1,3,3,0,3,3,1], // 5
    [1,2,2,5,2,2,1,0,0,0,0,0,0,0,0,0,1,1,1,1,5,1,1,1,0,0,0,0,0,0,0,0,0,1,3,3,5,3,3,1], // 6
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 7
    [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1], // 8
    [1,0,1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,1,0,1], // 9
    [1,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,1], // 10
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1], // 11
    [1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1], // 12
    [1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1], // 13
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 14
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 15
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 16
    [1,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,1], // 17
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 18
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 19
    [1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,6,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1], // 20
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 21
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 22
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 23
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 24
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 25
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,5,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 26
    [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1], // 27
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 28
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 29
    [1,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,1], // 30
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 31
    [1,0,0,0,0,0,3,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,2,0,0,0,0,0,1], // 32
    [1,3,3,5,3,3,1,0,0,0,0,0,0,0,0,0,1,1,1,1,5,1,1,1,0,0,0,0,0,0,0,0,0,1,2,2,5,2,2,1], // 33
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 34
    [1,0,0,0,0,3,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,1], // 35
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1], // 36
    [1,0,0,0,0,3,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,1], // 37
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1], // 38
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]  // 39
];

// Karten-Layout:
// Reihe  0-6:  TL-Raum (Brick), TC-Raum (Brick), TR-Raum (Wood) + Korridore
// Reihe  6:    Tueren (col 3=TL, col 20=TC, col 36=TR)
// Reihe  7-12: Oberer offener Bereich, Geheimraeume links(col 0-2) und rechts(col 37-39)
// Reihe 13-20: ML-Raum (Wood, Tuer col 6), MR-Raum (Brick, Tuer col 33)
// Reihe 20:    Zentraler Geheimraum (Tuer col 18), Arena-Waende
// Reihe 21-26: Arena-Innenraum mit Zugang von oben und unten
// Reihe 26:    Arena-Ausgang unten (Tuer col 18)
// Reihe 27-33: ML2-Raum (Wood, Tuer col 6), MR2-Raum (Brick, Tuer col 33)
// Reihe 33:    Tueren (col 3=BL, col 20=BC, col 36=BR)
// Reihe 34-38: BL-Raum (Wood), BC-Raum (Brick), BR-Raum (Brick)

// Schatz-Spawnpositionen
const TREASURE_SPAWNS = [
    // Eckraeume (hinter Tueren)
    { x: 3.5, y: 2.5, type: 'gold' },        // TL-Raum
    { x: 36.5, y: 2.5, type: 'gold' },       // TR-Raum
    { x: 3.5, y: 37.5, type: 'gold' },       // BL-Raum
    { x: 36.5, y: 37.5, type: 'gold' },      // BR-Raum
    // TC/BC Raeume
    { x: 20.5, y: 2.5, type: 'gold' },       // TC-Raum
    { x: 20.5, y: 37.5, type: 'gold' },      // BC-Raum
    // Geheimraeume (grosse Schaetze!)
    { x: 1.5, y: 10.5, type: 'gold_big' },   // Geheimraum links
    { x: 38.5, y: 10.5, type: 'gold_big' },  // Geheimraum rechts
    // Arena-Geheimraum
    { x: 20.5, y: 22.5, type: 'gold_big' },  // Arena-Geheimraum
    { x: 18.5, y: 23.5, type: 'gold' },      // Arena-Geheimraum
];

// Waffen-Spawnpositionen
const WEAPON_SPAWNS = [
    { x: 20.5, y: 10.5, type: 'weapon_shotgun' },  // Oberer Korridor
    { x: 3.5, y: 17.5, type: 'weapon_mg' },         // ML-Raum
    { x: 36.5, y: 30.5, type: 'weapon_shotgun' },   // MR2-Raum
];

// Spieler-Startposition
const PLAYER_START = { x: 3.5, y: 3.5, angle: 0 };

// Gegner-Startpositionen (mehr Gegner fuer groessere Karte)
const ENEMY_SPAWNS = [
    { x: 36.5, y: 2.5 },    // TR-Raum
    { x: 20.5, y: 3.5 },    // TC-Raum
    { x: 12.5, y: 9.5 },    // Oberer Korridor links
    { x: 27.5, y: 9.5 },    // Oberer Korridor rechts
    { x: 3.5, y: 16.5 },    // ML-Raum
    { x: 36.5, y: 16.5 },   // MR-Raum
    { x: 20.5, y: 17.5 },   // Zentrale
    { x: 20.5, y: 23.5 },   // Arena
    { x: 10.5, y: 23.5 },   // Unterer Korridor links
    { x: 29.5, y: 23.5 },   // Unterer Korridor rechts
    { x: 3.5, y: 30.5 },    // ML2-Raum
    { x: 36.5, y: 30.5 },   // MR2-Raum
    { x: 3.5, y: 37.5 },    // BL-Raum
    { x: 36.5, y: 37.5 },   // BR-Raum
    { x: 20.5, y: 36.5 },   // BC-Raum
];

// Spawnpunkte fuer Multiplayer
const SPAWN_POINTS = [
    { x: 3.5,  y: 3.5  },   // TL-Raum
    { x: 36.5, y: 3.5  },   // TR-Raum
    { x: 3.5,  y: 37.5 },   // BL-Raum
    { x: 36.5, y: 37.5 },   // BR-Raum
    { x: 20.5, y: 3.5  },   // TC-Raum
    { x: 20.5, y: 36.5 },   // BC-Raum
    { x: 20.5, y: 15.5 },   // Mitte oben
    { x: 20.5, y: 23.5 },   // Mitte unten
    { x: 3.5,  y: 16.5 },   // ML-Raum
    { x: 36.5, y: 16.5 },   // MR-Raum
    { x: 3.5,  y: 30.5 },   // ML2-Raum
    { x: 36.5, y: 30.5 },   // MR2-Raum
    { x: 10.5, y: 10.5 },   // Oberer Korridor
    { x: 29.5, y: 29.5 },   // Unterer Korridor
];

// Referenz auf Doors-Modul (wird vom Server gesetzt)
let _doorsRef = null;
function setDoorsModule(doorsModule) {
    _doorsRef = doorsModule;
}

// Doors-Modul holen (global im Browser, Referenz auf dem Server)
function _getDoors() {
    if (typeof Doors !== 'undefined') return Doors;
    return _doorsRef;
}

// Pruefe ob eine Position eine Wand ist
function isWall(x, y) {
    const mapX = Math.floor(x);
    const mapY = Math.floor(y);
    if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
        return true; // Ausserhalb der Karte = Wand
    }
    const tile = MAP_DATA[mapY][mapX];
    if (tile === 0) return false;
    // Tuer-Tiles: pruefen ob Doors-Modul geladen und Tuer passierbar
    const doors = _getDoors();
    if ((tile === 5 || tile === 6) && doors) {
        return !doors.isPassable(mapX, mapY);
    }
    return true;
}

// Hole den Wandtyp an einer Position
function getWallType(x, y) {
    const mapX = Math.floor(x);
    const mapY = Math.floor(y);
    if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
        return 1;
    }
    return MAP_DATA[mapY][mapX];
}

// Sichtlinien-Pruefung zwischen zwei Punkten
function hasLineOfSight(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.5) return true;

    // In kleinen Schritten entlang der Linie pruefen
    const steps = Math.ceil(dist * 3);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const cx = fromX + dx * t;
        const cy = fromY + dy * t;
        if (isWall(cx, cy)) {
            return false;
        }
    }
    return true;
}

// Node.js Export (fuer Server)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MAP_DATA, MAP_WIDTH, MAP_HEIGHT, TEX_SIZE,
        isWall, hasLineOfSight, getWallType, setDoorsModule,
        PLAYER_START, ENEMY_SPAWNS, SPAWN_POINTS,
        TREASURE_SPAWNS, WEAPON_SPAWNS
    };
}
