// ============================================
// doors.js - Tuer-Verwaltung
// Zustaende, Animation, Interaktion
// Funktioniert im Browser und auf dem Server
// ============================================

const Doors = {
    // Alle Tueren: Key = "x,y" -> { type, state, progress }
    // type: 5 = normale Tuer, 6 = Geheimtuer
    // state: 'closed', 'opening', 'open', 'closing'
    // progress: 0.0 (zu) bis 1.0 (offen)
    doors: {},

    // Referenzen auf Kartendaten (werden in init() gesetzt)
    _mapData: null,
    _mapWidth: 0,
    _mapHeight: 0,

    OPEN_SPEED: 2.0,        // Wie schnell Tueren aufgehen
    CLOSE_SPEED: 1.5,       // Wie schnell Tueren zugehen
    AUTO_CLOSE_TIME: 5.0,   // Sekunden bis automatisches Schliessen
    INTERACT_RANGE: 1.8,    // Reichweite fuer E-Taste

    // Alle Tueren aus der Karte finden und registrieren
    init() {
        this.doors = {};

        // Kartendaten holen: require() auf dem Server, globals im Browser
        if (typeof module !== 'undefined' && typeof require !== 'undefined') {
            const m = require('./map.js');
            this._mapData = m.MAP_DATA;
            this._mapWidth = m.MAP_WIDTH;
            this._mapHeight = m.MAP_HEIGHT;
        } else if (typeof MAP_DATA !== 'undefined') {
            this._mapData = MAP_DATA;
            this._mapWidth = MAP_WIDTH;
            this._mapHeight = MAP_HEIGHT;
        }

        if (!this._mapData) return;

        for (let y = 0; y < this._mapHeight; y++) {
            for (let x = 0; x < this._mapWidth; x++) {
                const tile = this._mapData[y][x];
                if (tile === 5 || tile === 6) {
                    const key = x + ',' + y;
                    this.doors[key] = {
                        x: x,
                        y: y,
                        type: tile,
                        state: 'closed',
                        progress: 0.0,
                        timer: 0
                    };
                }
            }
        }
    },

    // Tuer oeffnen (Key = "x,y")
    openDoor(key) {
        const door = this.doors[key];
        if (!door) return false;
        if (door.state === 'closed' || door.state === 'closing') {
            door.state = 'opening';
            door.timer = 0;
            return true;
        }
        return false;
    },

    // Tuer schliessen
    closeDoor(key) {
        const door = this.doors[key];
        if (!door) return;
        if (door.state === 'open') {
            // Nur schliessen wenn kein Spieler drin steht
            door.state = 'closing';
        }
    },

    // Pro Frame alle Tueren aktualisieren
    update(dt) {
        for (const key in this.doors) {
            const door = this.doors[key];

            switch (door.state) {
                case 'opening':
                    door.progress += this.OPEN_SPEED * dt;
                    if (door.progress >= 1.0) {
                        door.progress = 1.0;
                        door.state = 'open';
                        door.timer = this.AUTO_CLOSE_TIME;
                    }
                    break;

                case 'open':
                    door.timer -= dt;
                    if (door.timer <= 0) {
                        // Pruefen ob jemand im Tuerbereich steht
                        if (!this._isBlocked(door.x, door.y)) {
                            door.state = 'closing';
                        } else {
                            door.timer = 1.0; // Nochmal warten
                        }
                    }
                    break;

                case 'closing':
                    door.progress -= this.CLOSE_SPEED * dt;
                    if (door.progress <= 0.0) {
                        door.progress = 0.0;
                        door.state = 'closed';
                    }
                    break;
            }
        }
    },

    // Ist die Tuer-Position begehbar? (fuer isWall)
    isPassable(mapX, mapY) {
        const key = mapX + ',' + mapY;
        const door = this.doors[key];
        if (!door) return false;
        // Begehbar wenn zu mehr als 80% offen
        return door.progress > 0.8;
    },

    // Ist die Tuer komplett offen? (fuer Raycasting)
    isFullyOpen(mapX, mapY) {
        const key = mapX + ',' + mapY;
        const door = this.doors[key];
        if (!door) return false;
        return door.progress >= 1.0;
    },

    // Tuer an Position holen (oder null)
    getDoor(mapX, mapY) {
        const key = mapX + ',' + mapY;
        return this.doors[key] || null;
    },

    // Textur-Typ fuer Geheimtueren ermitteln (sieht aus wie umgebende Wand)
    getDisguiseTexture(mapX, mapY) {
        if (!this._mapData) return 1;
        const neighbors = [
            [mapX - 1, mapY], [mapX + 1, mapY],
            [mapX, mapY - 1], [mapX, mapY + 1]
        ];
        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < this._mapWidth && ny >= 0 && ny < this._mapHeight) {
                const t = this._mapData[ny][nx];
                if (t >= 1 && t <= 4) return t;
            }
        }
        return 1; // Fallback: Stein
    },

    // Pruefen ob jemand in der Tuer steht (verhindert Schliessen)
    _isBlocked(mapX, mapY) {
        // Im Browser: pruefen ob der lokale Spieler drin steht
        if (typeof Game !== 'undefined' && Game.player) {
            const p = Game.player;
            if (Math.floor(p.x) === mapX && Math.floor(p.y) === mapY) {
                return true;
            }
        }
        // Auf dem Server: pruefen ob ein Spieler drin steht
        if (typeof players !== 'undefined') {
            for (const [, p] of players) {
                if (Math.floor(p.x) === mapX && Math.floor(p.y) === mapY) {
                    return true;
                }
            }
        }
        return false;
    },

    // Fuer Netzwerk: Tuer-Zustaende serialisieren
    serialize() {
        const data = [];
        for (const key in this.doors) {
            const d = this.doors[key];
            if (d.state !== 'closed') {
                data.push({ k: key, s: d.state, p: Math.round(d.progress * 100) / 100 });
            }
        }
        return data;
    },

    // Fuer Netzwerk: Tuer-Zustaende vom Server uebernehmen
    deserialize(data) {
        // Alle Tueren erstmal auf closed setzen (fuer Full-Sync)
        for (const key in this.doors) {
            if (this.doors[key].state !== 'closed') {
                // Nur zuruecksetzen wenn nicht in der Server-Liste
                let found = false;
                for (const d of data) {
                    if (d.k === key) { found = true; break; }
                }
                if (!found) {
                    this.doors[key].state = 'closed';
                    this.doors[key].progress = 0;
                }
            }
        }
        // Server-Zustaende uebernehmen
        for (const d of data) {
            if (this.doors[d.k]) {
                this.doors[d.k].state = d.s;
                this.doors[d.k].progress = d.p;
            }
        }
    }
};

// Node.js Export (fuer Server)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Doors };
}
