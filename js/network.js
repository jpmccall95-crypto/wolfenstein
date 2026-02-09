// ============================================
// network.js - Client-seitige Netzwerk-Schicht
// Socket.io Kommunikation, Interpolation, Chat
// ============================================

const Network = {
    socket: null,
    playerId: null,
    playerColor: null,
    playerName: '',
    connected: false,
    available: false, // Ist Socket.io geladen?

    // Remote-Spieler (id -> Spielerdaten)
    remotePlayers: {},

    // Server-Zustand des lokalen Spielers (fuer Korrektur)
    _serverState: null,

    // Kill-Feed
    killFeed: [],
    killFeedDuration: 5000,

    // Chat-Nachrichten
    chatMessages: [],

    // Score
    localKills: 0,
    localDeaths: 0,

    // Callbacks
    onHit: null,

    // Pruefen ob Socket.io verfuegbar ist
    init() {
        this.available = typeof io !== 'undefined';
    },

    // Mit Server verbinden
    connect(name, onReady) {
        if (!this.available) return;
        this.playerName = name;
        this.socket = io();

        // Willkommen vom Server
        this.socket.on('welcome', (data) => {
            this.playerId = data.id;
            this.playerColor = data.color;
            this.connected = true;
            if (onReady) onReady();
        });

        // Spielzustand-Updates (20 Hz)
        this.socket.on('gameState', (state) => {
            this._handleGameState(state);
        });

        // Neuer Spieler beigetreten
        this.socket.on('playerJoined', (data) => {
            this._addChat('SERVER', data.name + ' ist beigetreten', '#888');
        });

        // Spieler hat verlassen
        this.socket.on('playerLeft', (data) => {
            delete this.remotePlayers[data.id];
            this._addChat('SERVER', data.name + ' hat verlassen', '#888');
        });

        // Kill-Event
        this.socket.on('kill', (data) => {
            this.killFeed.push({
                killerName: data.killerName,
                victimName: data.victimName,
                time: Date.now()
            });
            if (data.killerId === this.playerId) this.localKills++;
            if (data.victimId === this.playerId) this.localDeaths++;
        });

        // Treffer-Event (wir wurden getroffen)
        this.socket.on('hit', () => {
            if (this.onHit) this.onHit();
        });

        // Chat-Nachricht empfangen
        this.socket.on('chat', (data) => {
            this._addChat(data.name, data.message, data.color);
        });

        // Verbindungsfehler behandeln
        this.socket.on('connect_error', () => {
            const btn = document.getElementById('joinBtn');
            if (btn) {
                btn.textContent = 'Fehler - Erneut versuchen';
                btn.disabled = false;
            }
        });

        this.socket.on('connect', () => {
            // Beitreten sobald Socket verbunden ist
            this.socket.emit('join', { name: name });
        });
    },

    // Eingabe an Server senden
    sendInput(player) {
        if (!this.connected) return;
        this.socket.volatile.emit('input', {
            forward:  Input.isKeyDown('KeyW'),
            backward: Input.isKeyDown('KeyS'),
            left:     Input.isKeyDown('KeyA'),
            right:    Input.isKeyDown('KeyD'),
            angle:    player.angle
        });
    },

    // Schuss an Server melden
    sendShoot() {
        if (!this.connected) return;
        this.socket.emit('shoot');
    },

    // Chat-Nachricht senden
    sendChat(message) {
        if (!this.connected || !message) return;
        this.socket.emit('chat', { message: message });
    },

    // Interne Chat-Hilfsfunktion
    _addChat(name, message, color) {
        this.chatMessages.push({ name, message, color, time: Date.now() });
        if (this.chatMessages.length > 30) this.chatMessages.shift();
    },

    // Spielzustand vom Server verarbeiten
    _handleGameState(state) {
        for (const id in state.players) {
            const pd = state.players[id];

            // Eigener Spieler -> Server-Korrektur speichern
            if (id === this.playerId) {
                this._serverState = pd;
                // Kills/Deaths vom Server uebernehmen
                this.localKills = pd.kills;
                this.localDeaths = pd.deaths;
                continue;
            }

            // Remote-Spieler aktualisieren
            if (!this.remotePlayers[id]) {
                // Neuer Spieler -> sofort an richtige Position setzen
                this.remotePlayers[id] = {
                    ...pd,
                    displayX: pd.x,
                    displayY: pd.y,
                    displayAngle: pd.angle
                };
            } else {
                const rp = this.remotePlayers[id];
                rp.x = pd.x;
                rp.y = pd.y;
                rp.angle = pd.angle;
                rp.health = pd.health;
                rp.alive = pd.alive;
                rp.name = pd.name;
                rp.color = pd.color;
                rp.kills = pd.kills;
                rp.deaths = pd.deaths;
            }
        }

        // Spieler die nicht mehr im State sind entfernen
        for (const id in this.remotePlayers) {
            if (!state.players[id]) {
                delete this.remotePlayers[id];
            }
        }
    },

    // Pro Frame: Interpolation + Aufraeumen
    update(dt) {
        const lerp = Math.min(1.0, dt * 15);

        for (const rp of Object.values(this.remotePlayers)) {
            // Position sanft interpolieren
            rp.displayX += (rp.x - rp.displayX) * lerp;
            rp.displayY += (rp.y - rp.displayY) * lerp;

            // Winkel interpolieren (kuerzester Weg)
            let ad = rp.angle - rp.displayAngle;
            while (ad > Math.PI) ad -= Math.PI * 2;
            while (ad < -Math.PI) ad += Math.PI * 2;
            rp.displayAngle += ad * lerp;
        }

        // Kill-Feed: alte Eintraege entfernen
        const now = Date.now();
        this.killFeed = this.killFeed.filter(k => now - k.time < this.killFeedDuration);
    },

    // Server-Korrektur auf lokalen Spieler anwenden
    correctLocalPlayer(player) {
        if (!this._serverState) return;
        const s = this._serverState;

        // Position korrigieren
        const dx = s.x - player.x;
        const dy = s.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            // Grosse Abweichung -> sofort korrigieren (z.B. nach Respawn)
            player.x = s.x;
            player.y = s.y;
        } else if (dist > 0.01) {
            // Kleine Abweichung -> sanft korrigieren
            player.x += dx * 0.2;
            player.y += dy * 0.2;
        }

        // Gesundheit und Status vom Server uebernehmen
        player.health = s.health;
        player.alive = s.alive;

        this._serverState = null;
    },

    // Scoreboard-Daten zusammenstellen
    getScoreboard() {
        const scores = [];

        // Lokaler Spieler
        if (this.connected) {
            scores.push({
                name: this.playerName,
                color: this.playerColor,
                kills: this.localKills,
                deaths: this.localDeaths,
                isLocal: true
            });
        }

        // Remote-Spieler
        for (const rp of Object.values(this.remotePlayers)) {
            scores.push({
                name: rp.name,
                color: rp.color,
                kills: rp.kills,
                deaths: rp.deaths,
                isLocal: false
            });
        }

        scores.sort((a, b) => b.kills - a.kills);
        return scores;
    }
};
