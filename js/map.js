// ============================================
// map.js - Kartendaten und Hilfsfunktionen
// Grosse 54x54 Karte mit 16 Raeumen
// ============================================

// Wandtypen:
// 0 = Leer (begehbar)
// 1 = Steinmauer (grau)
// 2 = Backsteinmauer (rot)
// 3 = Holzwand (braun)
// 4 = Metalltuer (blau)
// 5 = Tuer (normal, sichtbar - braune Holztuer)
// 6 = Geheimtuer (sieht aus wie umgebende Wand)

const MAP_WIDTH = 54;
const MAP_HEIGHT = 54;
const TEX_SIZE = 64; // Texturgroesse in Pixeln

// 54x54 Spielkarte - 16 Raeume + Arena + Korridore + 4 Geheimraeume
// Layout:
//   Reihe  0-8:   TL(Brick) | TC1(Stone) | TC2(Stone) | TR(Wood) + oberer Korridor
//   Reihe  8:     Tueren zu Eckraeumen
//   Reihe  9-14:  Oberer offener Bereich, Geheimraeume links+rechts, Pfeiler
//   Reihe 15-17:  Obere Seitenraeume ML(Wood) | MR(Brick) mit Tueren
//   Reihe 18-24:  Mittlerer Korridor, Arena-Waende oben
//   Reihe 24-30:  Arena-Innenraum (gross, mit Pfeilern)
//   Reihe 30-36:  Arena-Waende unten, mittlerer Korridor
//   Reihe 37-39:  Untere Seitenraeume ML2(Wood) | MR2(Brick)
//   Reihe 40-44:  Unterer offener Bereich, Geheimraeume
//   Reihe 45:     Tueren zu unteren Eckraeumen
//   Reihe 46-53:  BL(Wood) | BC1(Brick) | BC2(Brick) | BR(Stone)
const MAP_DATA = [
//   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 1
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 2
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 3
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 4
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 5
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 6
    [1,0,0,0,2,2,2,1,0,0,0,0,0,0,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,0,0,0,0,0,0,1,3,3,3,0,3,3,1], // 7
    [1,2,2,5,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,3,5,3,3,1], // 8
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 9
    [1,1,1,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,1,1], // 10
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1], // 11
    [1,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,1], // 12
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1], // 13
    [1,1,1,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,1,1], // 14
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 15
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 16
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 17
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 18
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 19
    [1,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,1], // 20
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 21
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 22
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 23
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 24
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 25
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 26
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 27
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 28
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 29
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 30
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 31
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 32
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 33
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 34
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 35
    [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1], // 36
    [1,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,1], // 37
    [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 38
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 39
    [1,1,1,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,1,1], // 40
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1], // 41
    [1,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,1], // 42
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1], // 43
    [1,1,1,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,1,1], // 44
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 45
    [1,3,3,3,0,3,3,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,5,1,1,1,1,1,1,1,1,5,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,2,2,2,5,2,2,1], // 46
    [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1], // 47
    [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1], // 48
    [1,0,0,0,0,3,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,1], // 49
    [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1], // 50
    [1,0,0,0,0,3,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,1], // 51
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 52
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]  // 53
];

// Karten-Layout (54x54, 16 Raeume):
// TL  (0-7,  0-7):  Backstein-Raum oben links
// TC1 (0-7,  14-28): Stein-Raum oben mitte-links
// TC2 (0-7,  28-39): Stein-Raum oben mitte-rechts
// TR  (0-8,  46-53): Holz-Raum oben rechts
// Geheim-L (10-14, 0-2): Geheimraum links oben
// Geheim-R (10-14, 51-53): Geheimraum rechts oben
// ML  (16-22, 0-8):  Holz-Raum Mitte links oben
// UL  (16-22, 18-35): Oberer Arena-Vorraum
// MR  (16-22, 45-53): Backstein-Raum Mitte rechts oben
// Arena (24-30, 14-39): Zentrale Arena (gross!)
// ML2 (32-38, 0-8):  Holz-Raum Mitte links unten
// UR  (32-38, 18-35): Unterer Arena-Vorraum
// MR2 (32-38, 45-53): Backstein-Raum Mitte rechts unten
// Geheim-L2 (40-44, 0-2): Geheimraum links unten
// Geheim-R2 (40-44, 51-53): Geheimraum rechts unten
// BL  (46-52, 0-7):  Holz-Raum unten links
// BC1 (46-52, 18-35): Stein-Raum unten mitte
// BC2 (46-52, 18-35): (zweiter Eingang)
// BR  (46-52, 46-53): Backstein-Raum unten rechts

// Schatz-Spawnpositionen
const TREASURE_SPAWNS = [
    // Eckraeume
    { x: 3.5,  y: 3.5,  type: 'gold' },       // TL-Raum
    { x: 50.5, y: 3.5,  type: 'gold' },       // TR-Raum
    { x: 3.5,  y: 50.5, type: 'gold' },       // BL-Raum
    { x: 50.5, y: 50.5, type: 'gold' },       // BR-Raum
    // Obere/untere Mittelraeume
    { x: 21.5, y: 3.5,  type: 'gold' },       // TC1-Raum
    { x: 33.5, y: 3.5,  type: 'gold' },       // TC2-Raum
    { x: 24.5, y: 50.5, type: 'gold' },       // BC1-Raum
    { x: 33.5, y: 50.5, type: 'gold' },       // BC2-Raum
    // Geheimraeume (grosse Schaetze!)
    { x: 1.5,  y: 12.5, type: 'gold_big' },   // Geheimraum links oben
    { x: 52.5, y: 12.5, type: 'gold_big' },   // Geheimraum rechts oben
    { x: 1.5,  y: 42.5, type: 'gold_big' },   // Geheimraum links unten
    { x: 52.5, y: 42.5, type: 'gold_big' },   // Geheimraum rechts unten
    // Arena
    { x: 27.5, y: 27.5, type: 'gold_big' },   // Arena-Zentrum
    { x: 20.5, y: 27.5, type: 'gold' },       // Arena links
];

// Waffen-Spawnpositionen (Multiplayer)
const WEAPON_SPAWNS = [
    { x: 27.5, y: 12.5, type: 'weapon_shotgun' },  // Oberer Korridor
    { x: 4.5,  y: 19.5, type: 'weapon_mg' },        // ML-Raum
    { x: 49.5, y: 35.5, type: 'weapon_shotgun' },   // MR2-Raum
];

// Spieler-Startposition
const PLAYER_START = { x: 3.5, y: 3.5, angle: 0 };

// Gegner-Startpositionen (mehr fuer groessere Karte)
const ENEMY_SPAWNS = [
    { x: 50.5, y: 3.5  },   // TR-Raum
    { x: 21.5, y: 3.5  },   // TC1-Raum
    { x: 33.5, y: 3.5  },   // TC2-Raum
    { x: 15.5, y: 11.5 },   // Oberer Korridor links
    { x: 38.5, y: 11.5 },   // Oberer Korridor rechts
    { x: 4.5,  y: 19.5 },   // ML-Raum
    { x: 49.5, y: 19.5 },   // MR-Raum
    { x: 27.5, y: 20.5 },   // Oberer Arena-Vorraum
    { x: 20.5, y: 27.5 },   // Arena links
    { x: 34.5, y: 27.5 },   // Arena rechts
    { x: 27.5, y: 27.5 },   // Arena Mitte
    { x: 4.5,  y: 35.5 },   // ML2-Raum
    { x: 49.5, y: 35.5 },   // MR2-Raum
    { x: 27.5, y: 35.5 },   // Unterer Arena-Vorraum
    { x: 15.5, y: 42.5 },   // Unterer Korridor links
    { x: 38.5, y: 42.5 },   // Unterer Korridor rechts
    { x: 3.5,  y: 50.5 },   // BL-Raum
    { x: 50.5, y: 50.5 },   // BR-Raum
    { x: 24.5, y: 50.5 },   // BC1-Raum
    { x: 33.5, y: 50.5 },   // BC2-Raum
];

// Spawnpunkte fuer Multiplayer
const SPAWN_POINTS = [
    { x: 3.5,  y: 3.5  },   // TL-Raum
    { x: 50.5, y: 3.5  },   // TR-Raum
    { x: 3.5,  y: 50.5 },   // BL-Raum
    { x: 50.5, y: 50.5 },   // BR-Raum
    { x: 21.5, y: 3.5  },   // TC1-Raum
    { x: 33.5, y: 3.5  },   // TC2-Raum
    { x: 24.5, y: 50.5 },   // BC1-Raum
    { x: 33.5, y: 50.5 },   // BC2-Raum
    { x: 4.5,  y: 19.5 },   // ML-Raum
    { x: 49.5, y: 19.5 },   // MR-Raum
    { x: 4.5,  y: 35.5 },   // ML2-Raum
    { x: 49.5, y: 35.5 },   // MR2-Raum
    { x: 27.5, y: 12.5 },   // Oberer Korridor Mitte
    { x: 27.5, y: 42.5 },   // Unterer Korridor Mitte
    { x: 20.5, y: 27.5 },   // Arena links
    { x: 34.5, y: 27.5 },   // Arena rechts
    { x: 12.5, y: 27.5 },   // Mittlerer Korridor links
    { x: 42.5, y: 27.5 },   // Mittlerer Korridor rechts
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
