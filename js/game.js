// ============================================
// game.js - Hauptspiellogik und Game Loop
// Singleplayer, Deathmatch und Co-op Modus
// Erweitert um Tueren, Waffen, Gold, Musik
// ============================================

const Game = {
    canvas: null,
    ctx: null,
    player: null,
    enemies: [],
    pickups: [],

    // Modus
    isMultiplayer: false,

    // Zeitmessung
    lastTime: 0,
    fpsCounter: 0,
    fpsTimer: 0,
    currentFps: 0,

    // Spielstatus
    running: false,
    started: false,

    // ============================================
    // Initialisierung
    // ============================================
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Engine und Renderer initialisieren
        Engine.init(this.canvas.width, this.canvas.height);
        Renderer.init(this.canvas);
        Input.init(this.canvas);
        Sound.init();
        Doors.init();

        // Netzwerk pruefen
        Network.init();
        this.isMultiplayer = Network.available;

        if (this.isMultiplayer) {
            this._setupMultiplayer();
        } else {
            this._setupSingleplayer();
        }
    },

    // ============================================
    // Singleplayer Setup
    // ============================================
    _setupSingleplayer() {
        document.getElementById('spStart').style.display = 'block';
        document.getElementById('mpJoin').style.display = 'none';

        const startScreen = document.getElementById('startScreen');
        startScreen.style.cursor = 'pointer';
        startScreen.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            Sound.unlock();
            if (Input.pointerLocked && !this.started) {
                this._startGame();
            }
            if (Input.pointerLocked && this.started && this.player && !this.player.alive) {
                this._restartSP();
            }
        });

        this.canvas.addEventListener('click', () => {
            if (this.started && this.player && !this.player.alive) {
                this.canvas.requestPointerLock();
            }
        });
    },

    // ============================================
    // Multiplayer Setup (Lobby-System)
    // ============================================
    _setupMultiplayer() {
        document.getElementById('spStart').style.display = 'none';
        document.getElementById('mpJoin').style.display = 'block';

        const joinBtn = document.getElementById('joinBtn');
        const nameInput = document.getElementById('nameInput');
        nameInput.focus();

        // --- Beitreten ---
        const doJoin = () => {
            const name = nameInput.value.trim() || 'Spieler';
            joinBtn.disabled = true;
            joinBtn.textContent = 'Verbinde...';

            Network.connect(name, () => {
                this._showLobby();
            });

            this._setupNetworkCallbacks();
        };

        joinBtn.addEventListener('click', doJoin);
        nameInput.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') doJoin();
        });

        // --- Klick auf Startscreen -> Pointer Lock anfordern ---
        const startScreen = document.getElementById('startScreen');
        startScreen.style.cursor = 'pointer';
        startScreen.addEventListener('click', () => {
            if (Network.gameStarted && !this.started) {
                this.canvas.requestPointerLock();
            }
        });

        // --- Pointer Lock -> Spiel starten ---
        document.addEventListener('pointerlockchange', () => {
            Sound.unlock();
            if (Input.pointerLocked && !this.started && Network.gameStarted) {
                this._startGame();
            }
        });
    },

    // Netzwerk-Callbacks einrichten
    _setupNetworkCallbacks() {
        // Treffer-Callback (wir wurden getroffen)
        Network.onHit = (data) => {
            if (this.player) {
                this.player.damageFlash = 1.0;
                Sound.playHit();
            }
        };

        // Schuss-Treffer (wir haben jemanden getroffen)
        Network.onShotHit = () => {
            Particles.spawnHit(
                Engine.screenWidth / 2,
                Engine.screenHeight / 2,
                '#ff4444'
            );
            Sound.playHit();
        };

        // Pickup eingesammelt
        Network.onPickup = () => {
            Sound.playPickup();
        };

        // Wellen-Start
        Network.onWaveStart = () => {
            Sound.playWaveStart();
        };

        // Tuer geoeffnet
        Network.onDoorOpen = () => {
            Sound.playDoorOpen();
        };

        // Gegner getoetet im Co-op -> Gold-Drop (40% Chance)
        Network.onEnemyKilled = (data) => {
            if (data.boss) {
                // Boss droppt immer einen grossen Goldschatz
                this.pickups.push(new Pickup(
                    data.x + (Math.random() - 0.5) * 0.3,
                    data.y + (Math.random() - 0.5) * 0.3,
                    'gold_big'
                ));
            } else if (Math.random() < 0.4) {
                this.pickups.push(new Pickup(
                    data.x + (Math.random() - 0.5) * 0.3,
                    data.y + (Math.random() - 0.5) * 0.3,
                    'gold'
                ));
            }
        };

        // Lobby-Update
        Network.onLobbyUpdate = (data) => {
            this._updateLobbyUI(data);
        };

        // Spiel startet (vom Host ausgeloest)
        Network.onGameStart = (data) => {
            document.getElementById('mpLobby').style.display = 'none';
            document.getElementById('spStart').style.display = 'block';
            const prompt = document.querySelector('#spStart .prompt');
            if (prompt) prompt.textContent = 'Klicke um zu spielen!';
        };

        // Zurueck in die Lobby (nach Co-op Game Over)
        Network.onReturnToLobby = () => {
            this.started = false;
            this.running = false;
            Sound.stopMusic();
            document.exitPointerLock();
            this._showLobby();
        };
    },

    // ============================================
    // Lobby-Ansicht
    // ============================================
    _showLobby() {
        const startScreen = document.getElementById('startScreen');
        startScreen.style.display = '';
        document.getElementById('mpJoin').style.display = 'none';
        document.getElementById('mpLobby').style.display = 'block';

        const modeDM = document.getElementById('modeDM');
        const modeCoop = document.getElementById('modeCoop');
        const startBtn = document.getElementById('startGameBtn');

        modeDM.addEventListener('click', () => {
            if (Network.isHost()) {
                Network.selectMode('deathmatch');
            }
        });
        modeCoop.addEventListener('click', () => {
            if (Network.isHost()) {
                Network.selectMode('coop');
            }
        });

        startBtn.addEventListener('click', () => {
            Network.startGame();
            this.canvas.requestPointerLock();
        });

        this._updateLobbyUI(Network.lobby);
    },

    // Lobby-UI aktualisieren
    _updateLobbyUI(data) {
        const lobbyDiv = document.getElementById('mpLobby');
        if (!lobbyDiv || lobbyDiv.style.display === 'none') return;

        const isHost = Network.isHost();

        const modeDM = document.getElementById('modeDM');
        const modeCoop = document.getElementById('modeCoop');
        modeDM.classList.toggle('active', data.mode === 'deathmatch');
        modeCoop.classList.toggle('active', data.mode === 'coop');
        modeDM.disabled = !isHost;
        modeCoop.disabled = !isHost;

        const playersDiv = document.getElementById('lobbyPlayers');
        playersDiv.innerHTML = '';
        for (const p of data.players) {
            const el = document.createElement('span');
            el.className = 'lobbyPlayer' + (p.id === data.hostId ? ' host' : '');
            el.style.color = p.color;
            el.textContent = p.name;
            playersDiv.appendChild(el);
        }

        const status = document.getElementById('lobbyStatus');
        status.textContent = data.players.length + ' Spieler in der Lobby';

        const startBtn = document.getElementById('startGameBtn');
        const waitHost = document.getElementById('waitHost');
        if (isHost) {
            startBtn.style.display = '';
            waitHost.style.display = 'none';
            startBtn.disabled = data.players.length < 1;
        } else {
            startBtn.style.display = 'none';
            waitHost.style.display = '';
        }
    },

    // ============================================
    // Spielstart
    // ============================================
    _startGame() {
        document.getElementById('startScreen').style.display = 'none';
        this._setupLevel();
        this.started = true;
        this.running = true;
        this.lastTime = performance.now();

        // Hintergrundmusik starten
        Sound.startMusic();

        requestAnimationFrame((t) => this._gameLoop(t));
    },

    // Level aufbauen
    _setupLevel() {
        const spawn = this.isMultiplayer
            ? SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)]
            : PLAYER_START;
        this.player = new Player(spawn.x, spawn.y, spawn.angle || 0);

        // Gegner nur im Singleplayer
        if (!this.isMultiplayer) {
            this.enemies = ENEMY_SPAWNS.map(s => new Enemy(s.x, s.y));
        } else {
            this.enemies = [];
        }

        // Pickups erstellen (Schaetze + Waffen)
        this.pickups = [];

        // Schaetze aus der Karte
        if (typeof TREASURE_SPAWNS !== 'undefined') {
            for (const ts of TREASURE_SPAWNS) {
                this.pickups.push(new Pickup(ts.x, ts.y, ts.type));
            }
        }

        // Waffen aus der Karte
        if (typeof WEAPON_SPAWNS !== 'undefined') {
            for (const ws of WEAPON_SPAWNS) {
                this.pickups.push(new Pickup(ws.x, ws.y, ws.type));
            }
        }

        // Tueren zuruecksetzen
        Doors.init();
    },

    // SP Neustart
    _restartSP() {
        this._setupLevel();
        this.running = true;
        Sound.stopMusic();
        Sound.startMusic();
    },

    // ============================================
    // Game Loop
    // ============================================
    _gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.fpsCounter++;
        this.fpsTimer += dt;
        if (this.fpsTimer >= 1.0) {
            this.currentFps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTimer = 0;
        }

        if (this.running) {
            this._update(dt);
            this._render();
        }

        requestAnimationFrame((t) => this._gameLoop(t));
    },

    // ============================================
    // Update (verzweigt nach Modus)
    // ============================================
    _update(dt) {
        Input.update();
        Particles.update(dt);
        Doors.update(dt);

        if (this.isMultiplayer) {
            this._updateMP(dt);
        } else {
            this._updateSP(dt);
        }
    },

    // --- Singleplayer Update ---
    _updateSP(dt) {
        this.player.update(dt);

        // Schritte abspielen
        if (this.player.isMoving) {
            Sound.playStep();
        }

        for (const enemy of this.enemies) {
            enemy.update(dt, this.player);
        }

        if (this.player.justShot) {
            Sound.playShoot();
            this._handleSPShot();
        }

        this._checkPickups();
    },

    // --- Multiplayer Update ---
    _updateMP(dt) {
        // Lokalen Spieler bewegen (Client-side Prediction)
        this.player.update(dt);

        // Schritte abspielen
        if (this.player.isMoving) {
            Sound.playStep();
        }

        // Inputs an Server senden
        Network.sendInput(this.player);

        // Schuss an Server senden
        if (this.player.justShot) {
            Network.sendShoot();
            Sound.playShoot();
        }

        // Interaktion an Server senden (Tuer oeffnen im MP)
        if (Input.interactPressed && this.player.alive) {
            Network.sendInteract(this.player);
        }

        // Server-Korrektur anwenden
        Network.correctLocalPlayer(this.player);

        // Remote-Spieler interpolieren + Kill-Feed aufraeumen
        Network.update(dt);

        // Lokale Pickups pruefen (Gold, Waffen - funktioniert auch im MP)
        this._checkPickups();
    },

    // SP: Schuss auswerten
    _handleSPShot() {
        const p = this.player;
        const weaponDmg = p.weapons[p.currentWeapon].damage;
        let closestEnemy = null;
        let closestDist = Infinity;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - p.x;
            const dy = enemy.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const enemyAngle = Math.atan2(dy, dx);
            let angleDiff = enemyAngle - p.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Schrotflinte: breiterer Trefferwinkel
            const extraAngle = p.currentWeapon === 'shotgun' ? 0.08 : 0;
            const hitAngle = Math.atan2(enemy.radius, dist) + extraAngle;

            if (Math.abs(angleDiff) < hitAngle + 0.03) {
                if (hasLineOfSight(p.x, p.y, enemy.x, enemy.y)) {
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                }
            }
        }

        if (closestEnemy) {
            closestEnemy.takeDamage(weaponDmg);
            Sound.playHit();
            Particles.spawnHit(
                Engine.screenWidth / 2,
                Engine.screenHeight / 2,
                '#ff4444'
            );
            if (!closestEnemy.alive) {
                // Health-Pickup
                this.pickups.push(new Pickup(closestEnemy.x, closestEnemy.y, 'health'));
                // 40% Chance auf Gold-Drop
                if (Math.random() < 0.4) {
                    this.pickups.push(new Pickup(
                        closestEnemy.x + (Math.random() - 0.5) * 0.3,
                        closestEnemy.y + (Math.random() - 0.5) * 0.3,
                        'gold'
                    ));
                }
            }
        }
    },

    // SP: Pickup-Kollision (alle Typen)
    _checkPickups() {
        const p = this.player;
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;
            const dx = pickup.x - p.x, dy = pickup.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + pickup.radius) {
                switch (pickup.type) {
                    case 'health':
                        if (p.health < p.maxHealth) {
                            p.heal(pickup.healAmount);
                            pickup.active = false;
                            Sound.playPickup();
                        }
                        break;
                    case 'gold':
                    case 'gold_big':
                        p.gold += pickup.goldValue;
                        pickup.active = false;
                        Sound.playGoldPickup();
                        break;
                    case 'weapon_shotgun':
                    case 'weapon_mg':
                        if (!p.weapons[pickup.weaponType].owned) {
                            if (p.gold >= pickup.weaponCost) {
                                p.gold -= pickup.weaponCost;
                                p.weapons[pickup.weaponType].owned = true;
                                p.currentWeapon = pickup.weaponType;
                                pickup.active = false;
                                Sound.playWeaponPickup();
                            }
                        }
                        break;
                }
            }
        }
    },

    // ============================================
    // Rendering (verzweigt nach Modus)
    // ============================================
    _render() {
        if (this.isMultiplayer) {
            const remotePlayers = Object.values(Network.remotePlayers);

            if (Network.gameMode === 'coop') {
                const enemies = Network.coopEnemies.filter(e => e.alive).map(e => ({
                    x: e.displayX, y: e.displayY,
                    alive: e.alive, hurtTimer: e.hurtTimer,
                    health: e.health, maxHealth: e.maxHealth,
                    boss: e.boss, radius: e.boss ? 0.45 : 0.3
                }));
                // Server-Pickups (Health) + lokale Pickups (Gold, Waffen)
                const serverPickups = Network.coopPickups.map(p => ({
                    x: p.x, y: p.y, active: true,
                    type: 'health',
                    radius: 0.3, bobPhase: p.id * 1.5
                }));
                const allPickups = [...serverPickups, ...this.pickups.filter(p => p.active)];
                Renderer.renderFrame(this.player, enemies, allPickups, remotePlayers);
                HUD.draw(this.ctx, this.player, enemies, this.currentFps, Network, allPickups);
            } else {
                // Deathmatch: auch lokale Pickups rendern
                const localPickups = this.pickups.filter(p => p.active);
                Renderer.renderFrame(this.player, [], localPickups, remotePlayers);
                HUD.draw(this.ctx, this.player, [], this.currentFps, Network, localPickups);
            }

            Particles.draw(this.ctx);
        } else {
            Renderer.renderFrame(this.player, this.enemies, this.pickups, []);
            HUD.draw(this.ctx, this.player, this.enemies, this.currentFps, null, this.pickups);
            Particles.draw(this.ctx);
        }
    }
};

// ============================================
// Spiel starten sobald die Seite geladen ist
// ============================================
window.addEventListener('load', () => {
    Game.init();
});
