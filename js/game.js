// ============================================
// game.js - Hauptspiellogik und Game Loop
// Unterstuetzt Singleplayer und Multiplayer
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
        document.getElementById('mpStart').style.display = 'none';

        const startScreen = document.getElementById('startScreen');
        startScreen.style.cursor = 'pointer';
        startScreen.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
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
    // Multiplayer Setup
    // ============================================
    _setupMultiplayer() {
        document.getElementById('spStart').style.display = 'none';
        document.getElementById('mpStart').style.display = 'block';

        const joinBtn = document.getElementById('joinBtn');
        const nameInput = document.getElementById('nameInput');
        nameInput.focus();

        const doJoin = () => {
            const name = nameInput.value.trim() || 'Spieler';
            joinBtn.disabled = true;
            joinBtn.textContent = 'Verbinde...';

            Network.connect(name, () => {
                // Verbunden -> Pointer Lock anfordern
                this.canvas.requestPointerLock();
            });

            // Treffer-Callback
            Network.onHit = () => {
                if (this.player) {
                    this.player.damageFlash = 1.0;
                }
            };
        };

        joinBtn.addEventListener('click', doJoin);
        nameInput.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') doJoin();
        });

        document.addEventListener('pointerlockchange', () => {
            if (Input.pointerLocked && !this.started && Network.connected) {
                this._startGame();
            }
        });
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
        this.pickups = [];
    },

    // SP Neustart
    _restartSP() {
        this._setupLevel();
        this.running = true;
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

        if (this.isMultiplayer) {
            this._updateMP(dt);
        } else {
            this._updateSP(dt);
        }
    },

    // --- Singleplayer Update ---
    _updateSP(dt) {
        this.player.update(dt);

        for (const enemy of this.enemies) {
            enemy.update(dt, this.player);
        }

        if (this.player.justShot) {
            this._handleSPShot();
        }

        this._checkPickups();
    },

    // --- Multiplayer Update ---
    _updateMP(dt) {
        // Lokalen Spieler bewegen (Client-side Prediction)
        this.player.update(dt);

        // Inputs an Server senden
        Network.sendInput(this.player);

        // Schuss an Server senden
        if (this.player.justShot) {
            Network.sendShoot();
        }

        // Server-Korrektur anwenden
        Network.correctLocalPlayer(this.player);

        // Remote-Spieler interpolieren + Kill-Feed aufraeumen
        Network.update(dt);
    },

    // SP: Schuss auswerten
    _handleSPShot() {
        const p = this.player;
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
            const hitAngle = Math.atan2(enemy.radius, dist);
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
            closestEnemy.takeDamage(25);
            if (!closestEnemy.alive) {
                this.pickups.push(new Pickup(closestEnemy.x, closestEnemy.y, 'health'));
            }
        }
    },

    // SP: Pickup-Kollision
    _checkPickups() {
        const p = this.player;
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;
            const dx = pickup.x - p.x, dy = pickup.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + pickup.radius && p.health < p.maxHealth) {
                p.heal(pickup.healAmount);
                pickup.active = false;
            }
        }
    },

    // ============================================
    // Rendering (verzweigt nach Modus)
    // ============================================
    _render() {
        if (this.isMultiplayer) {
            const remotePlayers = Object.values(Network.remotePlayers);
            Renderer.renderFrame(this.player, [], [], remotePlayers);
            HUD.draw(this.ctx, this.player, [], this.currentFps, Network);
        } else {
            Renderer.renderFrame(this.player, this.enemies, this.pickups, []);
            HUD.draw(this.ctx, this.player, this.enemies, this.currentFps, null);
        }
    }
};

// ============================================
// Spiel starten sobald die Seite geladen ist
// ============================================
window.addEventListener('load', () => {
    Game.init();
});
