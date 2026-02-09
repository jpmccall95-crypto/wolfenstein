// ============================================
// map.js - Kartendaten und Hilfsfunktionen
// ============================================

// Wandtypen:
// 0 = Leer (begehbar)
// 1 = Steinmauer (grau)
// 2 = Backsteinmauer (rot)
// 3 = Holzwand (braun)
// 4 = Metalltuer (blau)

const MAP_WIDTH = 30;
const MAP_HEIGHT = 30;
const TEX_SIZE = 64; // Texturgroesse in Pixeln

// 30x30 Spielkarte mit Raeumen, Gaengen und zentraler Arena
const MAP_DATA = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,0,0,0,0,1],
    [1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,1],
    [1,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,1],
    [1,0,0,0,0,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,0,0,0,0,1],
    [1,2,2,0,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,0,3,3,1],
    [1,1,1,4,1,1,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,1,1,4,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,4,1,1,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,1,1,4,1,1,1],
    [1,3,3,0,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,0,2,2,1],
    [1,0,0,0,0,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,1],
    [1,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Spieler-Startposition (Mitte des oberen linken Raums)
const PLAYER_START = { x: 3.5, y: 3.5, angle: 0 };

// Gegner-Startpositionen
const ENEMY_SPAWNS = [
    { x: 26.5, y: 2.5 },   // Oberer rechter Raum
    { x: 15.0, y: 8.5 },   // Oberer Korridor
    { x: 10.5, y: 15.0 },  // Linke Seite Arena
    { x: 20.5, y: 15.0 },  // Rechte Seite Arena
    { x: 15.0, y: 13.0 },  // Mitte Arena oben
    { x: 15.0, y: 17.5 },  // Mitte Arena unten
    { x: 2.5, y: 27.5 },   // Unterer linker Raum
    { x: 27.5, y: 27.5 }   // Unterer rechter Raum
];

// Pruefe ob eine Position eine Wand ist
function isWall(x, y) {
    const mapX = Math.floor(x);
    const mapY = Math.floor(y);
    if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
        return true; // Ausserhalb der Karte = Wand
    }
    return MAP_DATA[mapY][mapX] !== 0;
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
