// ============================================
// game.js - Hauptspiellogik und Game Loop
// ============================================

const Game = {
    canvas: null,
    ctx: null,
    player: null,
    enemies: [],
    pickups: [],

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

        // Eingabe initialisieren
        Input.init(this.canvas);

        // Klick auf Startbildschirm aktiviert Pointer Lock
        const startScreen = document.getElementById('startScreen');
        startScreen.style.cursor = 'pointer';
        startScreen.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });

        // Pointer-Lock-Event als Spielstart nutzen
        document.addEventListener('pointerlockchange', () => {
            if (Input.pointerLocked && !this.started) {
                this._startGame();
            }
            // Bei Game-Over und erneutem Pointer Lock -> Neustart
            if (Input.pointerLocked && this.started && this.player && !this.player.alive) {
                this._restart();
            }
        });

        // Klick bei Game-Over = Pointer Lock anfordern (dann Neustart via Event oben)
        this.canvas.addEventListener('click', () => {
            if (this.started && this.player && !this.player.alive) {
                this.canvas.requestPointerLock();
            }
        });
    },

    // Spiel starten
    _startGame() {
        document.getElementById('startScreen').style.display = 'none';
        this._setupLevel();
        this.started = true;
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._gameLoop(t));
    },

    // Level aufbauen (Spieler, Gegner, etc.)
    _setupLevel() {
        // Spieler erstellen
        this.player = new Player(PLAYER_START.x, PLAYER_START.y, PLAYER_START.angle);

        // Gegner erstellen
        this.enemies = ENEMY_SPAWNS.map(s => new Enemy(s.x, s.y));

        // Pickups leeren
        this.pickups = [];
    },

    // Neustart nach Game Over
    _restart() {
        this._setupLevel();
        this.running = true;
    },

    // ============================================
    // Game Loop
    // ============================================
    _gameLoop(timestamp) {
        // Delta-Zeit berechnen (in Sekunden)
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // Max 50ms
        this.lastTime = timestamp;

        // FPS zaehlen
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
    // Spiellogik pro Frame
    // ============================================
    _update(dt) {
        Input.update();

        // Spieler aktualisieren
        this.player.update(dt);

        // Gegner aktualisieren
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player);
        }

        // Schuss-Treffer pruefen
        if (this.player.justShot) {
            this._handleShot();
        }

        // Pickup-Kollision pruefen
        this._checkPickups();
    },

    // Schuss auswerten - welcher Gegner wird getroffen?
    _handleShot() {
        const p = this.player;
        let closestEnemy = null;
        let closestDist = Infinity;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            // Vektor zum Gegner
            const dx = enemy.x - p.x;
            const dy = enemy.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Winkel zum Gegner relativ zur Blickrichtung
            const enemyAngle = Math.atan2(dy, dx);
            let angleDiff = enemyAngle - p.angle;

            // Winkel normalisieren auf [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Treffer-Toleranz (abhaengig von Entfernung)
            const hitAngle = Math.atan2(enemy.radius, dist);

            if (Math.abs(angleDiff) < hitAngle + 0.03) {
                // Sichtlinie pruefen (keine Wand dazwischen)
                if (hasLineOfSight(p.x, p.y, enemy.x, enemy.y)) {
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                }
            }
        }

        // Naechsten getroffenen Gegner beschaedigen
        if (closestEnemy) {
            const damage = 25;
            closestEnemy.takeDamage(damage);

            // Gegner gestorben? Health-Pickup droppen
            if (!closestEnemy.alive) {
                this.pickups.push(new Pickup(closestEnemy.x, closestEnemy.y, 'health'));
            }
        }
    },

    // Pruefen ob Spieler ueber ein Pickup laeuft
    _checkPickups() {
        const p = this.player;
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;

            const dx = pickup.x - p.x;
            const dy = pickup.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < p.radius + pickup.radius) {
                // Nur aufnehmen wenn Gesundheit nicht voll
                if (p.health < p.maxHealth) {
                    p.heal(pickup.healAmount);
                    pickup.active = false;
                }
            }
        }
    },

    // ============================================
    // Rendering pro Frame
    // ============================================
    _render() {
        // Hauptrendering (Waende, Sprites, Waffe)
        Renderer.renderFrame(this.player, this.enemies, this.pickups);

        // HUD darueber zeichnen
        HUD.draw(this.ctx, this.player, this.enemies, this.currentFps);
    }
};

// ============================================
// Spiel starten sobald die Seite geladen ist
// ============================================
window.addEventListener('load', () => {
    Game.init();
});
