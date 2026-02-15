// ============================================
// network.js - Client-seitige Netzwerk-Schicht
// Lobby, Interpolation, Chat, Co-op, Ping
// Erweitert um Tuer-Sync, Waffen, Gold
// ============================================

const Network = {
    socket: null,
    playerId: null,
    playerColor: null,
    playerName: '',
    connected: false,
    available: false,

    // Lobby-Zustand
    lobby: {
        hostId: null,
        mode: 'deathmatch',
        state: 'waiting',
        players: []
    },
    gameMode: 'deathmatch',
    gameStarted: false,

    // Remote-Spieler (id -> Spielerdaten)
    remotePlayers: {},
    _serverState: null,

    // Co-op Zustand
    coopEnemies: [],
    coopPickups: [],
    coopWave: 0,
    coopBetweenWaves: false,
    coopCountdown: 0,
    coopGameOver: false,

    // DM Zustand
    dmKillLimit: 20,
    dmGameOver: false,

    // Spielende-Daten (fuer Endscreen)
    gameEndData: null,

    // Kill-Feed
    killFeed: [],
    killFeedDuration: 5000,

    // Chat-Nachrichten
    chatMessages: [],

    // Score
    localKills: 0,
    localDeaths: 0,

    // Tod-Info
    lastKillerName: '',
    deathTime: 0,

    // Ping-Messung
    ping: 0,
    _pingInterval: null,

    // Callbacks
    onHit: null,
    onLobbyUpdate: null,
    onGameStart: null,
    onReturnToLobby: null,
    onPickup: null,
    onShotHit: null,
    onWaveStart: null,
    onDoorOpen: null,
    onEnemyKilled: null,
    onGameEnd: null,

    // Pruefen ob Socket.io verfuegbar ist
    init() {
        this.available = typeof io !== 'undefined';
    },

    // Mit Server verbinden
    connect(name, onReady) {
        if (!this.available) return;
        this.playerName = name;
        this.socket = io();

        // --- Willkommen vom Server ---
        this.socket.on('welcome', (data) => {
            this.playerId = data.id;
            this.playerColor = data.color;
            this.connected = true;
            if (onReady) onReady();
        });

        // --- Lobby-Update ---
        this.socket.on('lobbyUpdate', (data) => {
            this.lobby = data;
            if (this.onLobbyUpdate) this.onLobbyUpdate(data);
        });

        // --- Spiel startet ---
        this.socket.on('gameStart', (data) => {
            this.gameMode = data.mode;
            this.gameStarted = true;
            this.coopGameOver = false;
            this.coopWave = 0;
            this.dmGameOver = false;
            this.gameEndData = null;
            if (this.onGameStart) this.onGameStart(data);
        });

        // --- Zurueck in die Lobby ---
        this.socket.on('returnToLobby', () => {
            this.gameStarted = false;
            this.coopGameOver = false;
            this.coopWave = 0;
            this.coopEnemies = [];
            this.coopPickups = [];
            this.localKills = 0;
            this.localDeaths = 0;
            this.dmGameOver = false;
            this.gameEndData = null;
            if (this.onReturnToLobby) this.onReturnToLobby();
        });

        // --- Spielzustand-Updates (20 Hz) ---
        this.socket.on('gameState', (state) => {
            this._handleGameState(state);
        });

        // --- Spieler beigetreten / verlassen ---
        this.socket.on('playerJoined', (data) => {
            this._addChat('SERVER', data.name + ' ist beigetreten', '#888');
        });
        this.socket.on('playerLeft', (data) => {
            delete this.remotePlayers[data.id];
            this._addChat('SERVER', data.name + ' hat verlassen', '#888');
        });

        // --- Kill-Event ---
        this.socket.on('kill', (data) => {
            this.killFeed.push({
                killerName: data.killerName,
                victimName: data.victimName,
                time: Date.now()
            });
            if (data.killerId === this.playerId) this.localKills++;
            if (data.victimId === this.playerId) {
                this.localDeaths++;
                this.lastKillerName = data.killerName;
                this.deathTime = Date.now();
            }
        });

        // --- Treffer-Event (wir wurden getroffen) ---
        this.socket.on('hit', (data) => {
            if (this.onHit) this.onHit(data);
        });

        // --- Schuss-Treffer-Bestaetigung ---
        this.socket.on('shotHit', () => {
            if (this.onShotHit) this.onShotHit();
        });

        // --- Chat empfangen ---
        this.socket.on('chat', (data) => {
            this._addChat(data.name, data.message, data.color);
        });

        // --- Tuer geoeffnet ---
        this.socket.on('doorOpened', (data) => {
            if (typeof Doors !== 'undefined') {
                Doors.openDoor(data.key);
            }
            if (this.onDoorOpen) this.onDoorOpen(data);
        });

        // --- Co-op Events ---
        this.socket.on('waveStart', (data) => {
            this.coopWave = data.wave;
            if (data.boss) {
                this._addChat('SERVER', 'BOSS WELLE ' + data.wave + '! ' + data.enemyCount + ' Gegner + BOSS!', '#ff4444');
            } else {
                this._addChat('SERVER', 'Welle ' + data.wave + ': ' + data.enemyCount + ' Gegner!', '#ffcc00');
            }
            if (this.onWaveStart) this.onWaveStart(data);
        });

        this.socket.on('enemyKilled', (data) => {
            this.killFeed.push({
                killerName: data.killerName,
                victimName: data.boss ? 'BOSS' : 'Gegner',
                time: Date.now()
            });
            if (this.onEnemyKilled) this.onEnemyKilled(data);
        });

        this.socket.on('pickupCollected', (data) => {
            if (data.playerId === this.playerId) {
                if (this.onPickup) this.onPickup();
            }
        });

        this.socket.on('coopGameOver', (data) => {
            this.coopGameOver = true;
            this.coopWave = data.wave;
        });

        // --- Spielende (DM Kill-Limit oder Co-op Game Over) ---
        this.socket.on('gameEnd', (data) => {
            this.gameEndData = {
                mode: data.mode,
                winnerId: data.winnerId,
                winnerName: data.winnerName,
                wave: data.wave,
                scores: data.scores,
                killLimit: data.killLimit,
                time: Date.now()
            };
            if (this.onGameEnd) this.onGameEnd(data);
        });

        // --- Ping-Antwort ---
        this.socket.on('pong', (data) => {
            this.ping = Date.now() - data.time;
            this.socket.volatile.emit('reportPing', { ping: this.ping });
        });

        // --- Verbindungsfehler ---
        this.socket.on('connect_error', () => {
            const btn = document.getElementById('joinBtn');
            if (btn) {
                btn.textContent = 'Fehler - Erneut versuchen';
                btn.disabled = false;
            }
        });

        // --- Verbindung hergestellt ---
        this.socket.on('connect', () => {
            this.socket.emit('join', { name: name });

            if (this._pingInterval) clearInterval(this._pingInterval);
            this._pingInterval = setInterval(() => {
                this.socket.emit('ping', { time: Date.now() });
            }, 2000);
        });
    },

    // Modus waehlen (nur Host)
    selectMode(mode) {
        if (!this.connected) return;
        this.socket.emit('selectMode', { mode });
    },

    // Spiel starten (nur Host)
    startGame() {
        if (!this.connected) return;
        this.socket.emit('startGame');
    },

    // Eingabe an Server senden
    sendInput(player) {
        if (!this.connected) return;
        this.socket.volatile.emit('input', {
            forward:  Input.isKeyDown('KeyW'),
            backward: Input.isKeyDown('KeyS'),
            left:     Input.isKeyDown('KeyA'),
            right:    Input.isKeyDown('KeyD'),
            angle:    player.angle,
            weapon:   player.currentWeapon
        });
    },

    // Schuss an Server melden
    sendShoot() {
        if (!this.connected) return;
        this.socket.emit('shoot');
    },

    // Interaktion an Server senden (Tuer oeffnen)
    sendInteract(player) {
        if (!this.connected) return;
        this.socket.emit('interact', {
            x: player.x,
            y: player.y,
            angle: player.angle
        });
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

    // Spielzustand vom Server verarbeiten (Delta-Compression)
    _handleGameState(state) {
        const isFull = state.f === 1;

        for (const id in state.p) {
            const pd = state.p[id];

            if (id === this.playerId) {
                this._serverState = {
                    x: pd.x, y: pd.y,
                    health: pd.h, alive: pd.al
                };
                if (pd.k !== undefined) this.localKills = pd.k;
                if (pd.d !== undefined) this.localDeaths = pd.d;
                continue;
            }

            if (!this.remotePlayers[id]) {
                this.remotePlayers[id] = {
                    x: pd.x, y: pd.y,
                    angle: pd.a || 0,
                    health: pd.h !== undefined ? pd.h : 100,
                    alive: pd.al !== undefined ? pd.al : true,
                    name: pd.n || '???',
                    color: pd.c || '#ff4444',
                    kills: pd.k || 0,
                    deaths: pd.d || 0,
                    displayX: pd.x,
                    displayY: pd.y,
                    displayAngle: pd.a || 0
                };
            } else {
                const rp = this.remotePlayers[id];
                if (pd.x !== undefined) rp.x = pd.x;
                if (pd.y !== undefined) rp.y = pd.y;
                if (pd.a !== undefined) rp.angle = pd.a;
                if (pd.h !== undefined) rp.health = pd.h;
                if (pd.al !== undefined) rp.alive = pd.al;
                if (pd.n !== undefined) rp.name = pd.n;
                if (pd.c !== undefined) rp.color = pd.c;
                if (pd.k !== undefined) rp.kills = pd.k;
                if (pd.d !== undefined) rp.deaths = pd.d;
            }
        }

        if (state.r) {
            for (const id of state.r) {
                delete this.remotePlayers[id];
            }
        }

        if (isFull) {
            for (const id in this.remotePlayers) {
                if (!state.p[id]) {
                    delete this.remotePlayers[id];
                }
            }
        }

        // Co-op Zustand (mit Delta-Compression fuer Gegner)
        if (state.enemies !== undefined) {
            this._updateCoopEnemies(state.enemies, state.ef === 1);
            this.coopPickups = state.pickups || [];
            this.coopWave = state.wave || 0;
            this.coopBetweenWaves = state.betweenWaves || false;
            this.coopCountdown = state.countdown || 0;
            if (state.gameOver) this.coopGameOver = true;
        }

        // DM-Zustand
        if (state.killLimit !== undefined) this.dmKillLimit = state.killLimit;
        if (state.dmGameOver) this.dmGameOver = true;

        // Tuer-Zustaende synchronisieren
        if (state.doors !== undefined && typeof Doors !== 'undefined') {
            Doors.deserialize(state.doors);
        }
    },

    // Co-op Gegner interpolieren (mit Delta-Compression)
    _updateCoopEnemies(serverEnemies, isFull) {
        if (isFull) {
            // Voller Snapshot: Alle Gegner ersetzen, fehlende entfernen
            const idSet = new Set(serverEnemies.map(e => e.id));
            this.coopEnemies = this.coopEnemies.filter(e => idSet.has(e.id));
        }

        for (const se of serverEnemies) {
            const existing = this.coopEnemies.find(e => e.id === se.id);
            if (existing) {
                // Vorherige Position merken fuer sanftere Interpolation
                existing.prevX = existing.targetX;
                existing.prevY = existing.targetY;
                existing.targetX = se.x;
                existing.targetY = se.y;
                existing.interpTime = 0;
                if (se.health !== undefined) existing.health = se.health;
                if (se.maxHealth !== undefined) existing.maxHealth = se.maxHealth;
                if (se.alive !== undefined) existing.alive = se.alive;
                if (se.hurtTimer !== undefined) existing.hurtTimer = se.hurtTimer;
            } else {
                this.coopEnemies.push({
                    ...se,
                    displayX: se.x,
                    displayY: se.y,
                    targetX: se.x,
                    targetY: se.y,
                    prevX: se.x,
                    prevY: se.y,
                    interpTime: 1
                });
            }
        }
    },

    // Pro Frame: Interpolation und Aufraeumen
    // Tick-Dauer: 1/20 = 50ms, wir interpolieren ueber eine Tick-Dauer
    _tickDuration: 1 / 20,

    update(dt) {
        // Sanfterer Lerp-Faktor (dt * 10 statt dt * 15, weniger aggressiv)
        const lerp = Math.min(1.0, dt * 10);

        // Remote-Spieler interpolieren
        for (const rp of Object.values(this.remotePlayers)) {
            rp.displayX += (rp.x - rp.displayX) * lerp;
            rp.displayY += (rp.y - rp.displayY) * lerp;
            let ad = rp.angle - rp.displayAngle;
            while (ad > Math.PI) ad -= Math.PI * 2;
            while (ad < -Math.PI) ad += Math.PI * 2;
            rp.displayAngle += ad * lerp;
        }

        // Co-op Gegner: zeitbasierte Interpolation (sanfter bei Netzwerk-Jitter)
        for (const e of this.coopEnemies) {
            e.interpTime = Math.min(1.0, (e.interpTime || 0) + dt / this._tickDuration);
            const t = e.interpTime;
            // Smooth-Step fuer noch sanftere Bewegung
            const smooth = t * t * (3 - 2 * t);
            e.displayX = e.prevX + (e.targetX - e.prevX) * smooth;
            e.displayY = e.prevY + (e.targetY - e.prevY) * smooth;
        }

        const now = Date.now();
        this.killFeed = this.killFeed.filter(k => now - k.time < this.killFeedDuration);
    },

    // Server-Korrektur auf lokalen Spieler
    // Hoehere Toleranz fuer externen Server (mehr Latenz = groessere Abweichungen)
    correctLocalPlayer(player) {
        if (!this._serverState) return;
        const s = this._serverState;

        const dx = s.x - player.x;
        const dy = s.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1.0) {
            // Nur bei sehr grosser Abweichung sofort korrigieren (Teleport)
            player.x = s.x;
            player.y = s.y;
        } else if (dist > 0.01) {
            // Sanfter korrigieren (0.15 statt 0.2 = weniger Ruckler)
            player.x += dx * 0.15;
            player.y += dy * 0.15;
        }

        player.health = s.health;
        player.alive = s.alive;
        this._serverState = null;
    },

    // Scoreboard
    getScoreboard() {
        const scores = [];

        if (this.connected) {
            scores.push({
                name: this.playerName,
                color: this.playerColor,
                kills: this.localKills,
                deaths: this.localDeaths,
                ping: this.ping,
                isLocal: true
            });
        }

        for (const rp of Object.values(this.remotePlayers)) {
            scores.push({
                name: rp.name,
                color: rp.color,
                kills: rp.kills,
                deaths: rp.deaths,
                ping: '-',
                isLocal: false
            });
        }

        scores.sort((a, b) => b.kills - a.kills);
        return scores;
    },

    isHost() {
        return this.playerId === this.lobby.hostId;
    }
};
