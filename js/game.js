// ============================================
// game.js - Hauptspiellogik und Game Loop
// Singleplayer, Solo-Wellenmodus, Deathmatch und Co-op
// Erweitert um Tueren, 8 Waffen, Gold, Musik
// ============================================

// Solo-Waffen-Pickups auf der Karte (7 Waffen, Pistole ist gratis)
const SOLO_WEAPON_SPAWNS = [
    { x: 20.5, y: 10.5, type: 'weapon_smg' },           // Oberer Korridor (nah)
    { x: 12.5, y: 9.5,  type: 'weapon_shotgun' },        // Oberer Korridor links
    { x: 3.5,  y: 17.5, type: 'weapon_mg' },              // ML-Raum (MG)
    { x: 36.5, y: 16.5, type: 'weapon_sniper' },         // MR-Raum
    { x: 1.5,  y: 10.5, type: 'weapon_flamethrower' },   // Geheimraum links
    { x: 38.5, y: 10.5, type: 'weapon_launcher' },       // Geheimraum rechts
    { x: 20.5, y: 22.5, type: 'weapon_railgun' },        // Arena-Geheimraum (teuerste)
];

const Game = {
    canvas: null,
    ctx: null,
    player: null,
    enemies: [],
    pickups: [],

    // Modus
    isMultiplayer: false,
    isSolo: false,

    // Solo-Wellenmodus Zustand
    soloWave: {
        wave: 0,
        countdown: 0,
        betweenWaves: true,
        active: false,
        gameOver: false
    },

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

        // Einheitliche Modus-Auswahl (3 Modi)
        this._setupModeSelection();
    },

    // ============================================
    // Einheitliche Modus-Auswahl (Solo / Co-op / Deathmatch)
    // ============================================
    _setupModeSelection() {
        document.getElementById('spStart').style.display = 'block';
        document.getElementById('mpJoin').style.display = 'none';

        const modeSolo = document.getElementById('modeSolo');
        const modeCoop = document.getElementById('modeCoopStart');
        const modeDM = document.getElementById('modeDMStart');
        const modeDesc = document.getElementById('spModeDesc');
        const prompt = document.getElementById('startPrompt');

        // Standard: Solo ausgewaehlt
        this.isSolo = true;
        this._selectedMPMode = null;

        // Co-op und Deathmatch brauchen Server
        if (!this.isMultiplayer) {
            modeCoop.disabled = true;
            modeDM.disabled = true;
            modeCoop.style.opacity = '0.4';
            modeDM.style.opacity = '0.4';
            modeCoop.title = 'Server noetig - starte mit npm start';
            modeDM.title = 'Server noetig - starte mit npm start';
        }

        // --- Solo Wellen ---
        modeSolo.addEventListener('click', () => {
            this.isSolo = true;
            this._selectedMPMode = null;
            modeSolo.classList.add('active');
            modeCoop.classList.remove('active');
            modeDM.classList.remove('active');
            modeDesc.textContent = 'Ueberlebe Gegnerwellen die immer staerker werden! Kaufe Waffen mit Gold.';
            prompt.textContent = 'Klicke um zu starten!';
            prompt.style.display = '';
            document.getElementById('mpJoin').style.display = 'none';
        });

        // --- Co-op (nur mit Server) ---
        if (this.isMultiplayer) {
            modeCoop.addEventListener('click', () => {
                this.isSolo = false;
                this._selectedMPMode = 'coop';
                modeSolo.classList.remove('active');
                modeCoop.classList.add('active');
                modeDM.classList.remove('active');
                modeDesc.textContent = 'Spiele mit anderen zusammen gegen KI-Wellen.';
                prompt.style.display = 'none';
                document.getElementById('mpJoin').style.display = 'block';
                document.getElementById('nameInput').focus();
            });

            // --- Deathmatch (nur mit Server) ---
            modeDM.addEventListener('click', () => {
                this.isSolo = false;
                this._selectedMPMode = 'deathmatch';
                modeSolo.classList.remove('active');
                modeCoop.classList.remove('active');
                modeDM.classList.add('active');
                modeDesc.textContent = 'Jeder gegen jeden! Zeige wer der Beste ist.';
                prompt.style.display = 'none';
                document.getElementById('mpJoin').style.display = 'block';
                document.getElementById('nameInput').focus();
            });

            // --- Beitreten (Name-Eingabe fuer Co-op/DM) ---
            this._setupJoinButton();
        }

        // --- Klick auf Startscreen -> Spiel starten ---
        const startScreen = document.getElementById('startScreen');
        startScreen.style.cursor = 'pointer';
        startScreen.addEventListener('click', (e) => {
            // Nicht bei Klick auf Buttons oder Eingabefelder
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

            // Solo: Direkt starten
            if (this.isSolo && !this.started) {
                this.canvas.requestPointerLock();
                return;
            }

            // MP: Nur starten wenn Spiel vom Host gestartet wurde
            if (this.isMultiplayer && Network.gameStarted && !this.started) {
                this.canvas.requestPointerLock();
            }
        });

        // --- Pointer Lock Handler ---
        document.addEventListener('pointerlockchange', () => {
            Sound.unlock();

            // Spiel starten
            if (Input.pointerLocked && !this.started) {
                if (this.isSolo) {
                    this._startGame();
                } else if (this.isMultiplayer && Network.gameStarted) {
                    this._startGame();
                }
            }

            // Neustart nach Tod (nur Solo)
            if (Input.pointerLocked && this.started && this.player && !this.player.alive) {
                if (this.isSolo) {
                    this._restartSolo();
                }
            }

            // Pause-Menue
            if (!Input.pointerLocked && this.started && this.running) {
                this._showPauseMenu();
            } else {
                this._hidePauseMenu();
            }
        });

        this.canvas.addEventListener('click', () => {
            if (this.started && this.player && !this.player.alive && this.isSolo) {
                this.canvas.requestPointerLock();
            }
        });

        this._setupPauseMenu();
    },

    // Beitreten-Button fuer Multiplayer-Modi
    _setupJoinButton() {
        const joinBtn = document.getElementById('joinBtn');
        const nameInput = document.getElementById('nameInput');

        const doJoin = () => {
            const name = nameInput.value.trim() || 'Spieler';
            joinBtn.disabled = true;
            joinBtn.textContent = 'Verbinde...';

            Network.connect(name, () => {
                // Modus an Server senden (falls Host)
                if (this._selectedMPMode && Network.isHost()) {
                    Network.selectMode(this._selectedMPMode);
                }
                this._showLobby();
            });

            this._setupNetworkCallbacks();
        };

        joinBtn.addEventListener('click', doJoin);
        nameInput.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') doJoin();
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
            document.getElementById('mpJoin').style.display = 'none';
            document.getElementById('spModeSelect').style.display = 'none';
            document.getElementById('spModeDesc').style.display = 'none';
            document.getElementById('spStart').style.display = 'block';
            const prompt = document.getElementById('startPrompt');
            if (prompt) {
                prompt.style.display = '';
                prompt.textContent = 'Klicke um zu spielen!';
            }
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
        document.getElementById('spStart').style.display = 'none';
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

        // Pickups erstellen
        this.pickups = [];

        if (!this.isMultiplayer) {
            // Solo-Wellenmodus: Keine festen Gegner, Wellen spawnen sie
            this.enemies = [];
            this.isSolo = true;
            this.soloWave = {
                wave: 0,
                countdown: 5, // 5s Countdown vor Welle 1
                betweenWaves: true,
                active: true,
                gameOver: false
            };

            // Schaetze aus der Karte
            if (typeof TREASURE_SPAWNS !== 'undefined') {
                for (const ts of TREASURE_SPAWNS) {
                    this.pickups.push(new Pickup(ts.x, ts.y, ts.type));
                }
            }

            // Solo-Waffen-Pickups (alle 7 kaufbaren Waffen)
            for (const ws of SOLO_WEAPON_SPAWNS) {
                this.pickups.push(new Pickup(ws.x, ws.y, ws.type));
            }
        } else {
            // Multiplayer (Co-op / Deathmatch)
            this.enemies = [];
        }

        // Tueren zuruecksetzen
        Doors.init();
    },

    // Solo Neustart
    _restartSolo() {
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
            // Solo-Wellenmodus (einziger Offline-Modus)
            this._updateSolo(dt);
        }
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

    // ============================================
    // Solo-Wellenmodus Update
    // ============================================
    _updateSolo(dt) {
        if (this.soloWave.gameOver) return;

        this.player.update(dt);

        // Schritte abspielen
        if (this.player.isMoving) {
            Sound.playStep();
        }

        // Spieler tot -> Game Over
        if (!this.player.alive) {
            this.soloWave.gameOver = true;
            return;
        }

        // Countdown zwischen Wellen
        if (this.soloWave.betweenWaves) {
            this.soloWave.countdown -= dt;
            if (this.soloWave.countdown <= 0) {
                this.soloWave.betweenWaves = false;
                this._startNextSoloWave();
            }
        } else {
            // Gegner updaten
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                enemy.update(dt, this.player);

                // Burn-Effekt (Flammenwerfer DoT)
                if (enemy.burnTimer > 0) {
                    enemy.burnTimer -= dt;
                    enemy.burnTickTimer -= dt;
                    if (enemy.burnTickTimer <= 0) {
                        enemy.burnTickTimer = 0.3; // Alle 0.3s Schaden
                        enemy.takeDamage(5);       // 5 Schaden pro Tick
                        if (!enemy.alive) {
                            this._soloEnemyDied(enemy);
                        }
                    }
                }
            }

            // Alle Gegner tot? -> Naechste Welle
            const aliveCount = this.enemies.filter(e => e.alive).length;
            if (aliveCount === 0) {
                this.soloWave.betweenWaves = true;
                this.soloWave.countdown = 10; // 10s Pause
                Sound.playWaveStart();
            }
        }

        // Schuss
        if (this.player.justShot) {
            Sound.playShoot();
            this._handleSoloShot();
        }

        this._checkPickups();
    },

    // Naechste Solo-Welle spawnen (Formeln wie Co-op)
    _startNextSoloWave() {
        this.soloWave.wave++;
        const N = this.soloWave.wave;
        const isBossWave = N % 5 === 0;

        // Gegner-Anzahl: 5 + (N-1)*3
        const enemyCount = 5 + (N - 1) * 3;
        const hp = Math.min(200, 50 + (N - 1) * 10);
        const speed = Math.min(3.5, 1.5 + (N - 1) * 0.15);

        this.enemies = [];

        // Normale Gegner spawnen
        const normalCount = isBossWave ? enemyCount - 1 : enemyCount;
        for (let i = 0; i < normalCount; i++) {
            const spawn = ENEMY_SPAWNS[i % ENEMY_SPAWNS.length];
            // Leichte Zufalls-Verschiebung damit sie nicht uebereinander stehen
            const offsetX = (Math.random() - 0.5) * 1.0;
            const offsetY = (Math.random() - 0.5) * 1.0;
            const enemy = new Enemy(spawn.x + offsetX, spawn.y + offsetY);
            enemy.health = hp;
            enemy.maxHealth = hp;
            enemy.moveSpeed = speed;
            this.enemies.push(enemy);
        }

        // Boss spawnen bei jeder 5. Welle
        if (isBossWave) {
            const bossSpawn = ENEMY_SPAWNS[Math.floor(Math.random() * ENEMY_SPAWNS.length)];
            const boss = new Enemy(bossSpawn.x, bossSpawn.y);
            boss.health = 300 + N * 40;
            boss.maxHealth = boss.health;
            boss.damage = Math.min(35, 15 + N);
            boss.attackCooldown = 1.05; // 70% vom normalen
            boss.radius = 0.45;
            boss.moveSpeed = speed * 0.7;
            boss.boss = true;
            this.enemies.push(boss);
        }

        // Health-Pickups (1 pro 3 Gegner)
        const healthCount = Math.floor(enemyCount / 3);
        for (let i = 0; i < healthCount; i++) {
            const spawn = SPAWN_POINTS[i % SPAWN_POINTS.length];
            this.pickups.push(new Pickup(
                spawn.x + (Math.random() - 0.5) * 2,
                spawn.y + (Math.random() - 0.5) * 2,
                'health'
            ));
        }

        Sound.playWaveStart();
    },

    // Solo: Schuss auswerten (mit Spezial-Mechaniken fuer neue Waffen)
    _handleSoloShot() {
        const p = this.player;
        const weapon = p.currentWeapon;
        const weaponDmg = p.weapons[weapon].damage;

        // Flammenwerfer: Kegel-Angriff, kurze Reichweite
        if (weapon === 'flamethrower') {
            this._handleFlamethrowerShot(p, weaponDmg);
            return;
        }

        // Railgun: Durchdringend - trifft ALLE Gegner in der Linie
        if (weapon === 'railgun') {
            this._handleRailgunShot(p, weaponDmg);
            return;
        }

        // Raketenwerfer: Trifft naechsten Gegner + Splash-Schaden
        if (weapon === 'launcher') {
            this._handleLauncherShot(p, weaponDmg);
            return;
        }

        // Standard-Logik (Pistole, SMG, Shotgun, MG, Sniper)
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
            const extraAngle = weapon === 'shotgun' ? 0.08 : 0;
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
                this._soloEnemyDied(closestEnemy);
            }
        }
    },

    // Flammenwerfer: Kegel-Angriff, kurze Reichweite (6), setzt Burn-Timer
    _handleFlamethrowerShot(p, weaponDmg) {
        const maxRange = 6;
        let hitAny = false;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const dx = enemy.x - p.x;
            const dy = enemy.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxRange) continue;

            const enemyAngle = Math.atan2(dy, dx);
            let angleDiff = enemyAngle - p.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Breiterer Kegel (0.2 Radians ~11 Grad)
            if (Math.abs(angleDiff) < 0.2) {
                if (hasLineOfSight(p.x, p.y, enemy.x, enemy.y)) {
                    enemy.takeDamage(weaponDmg);
                    // Burn-Effekt setzen (3 Sekunden)
                    enemy.burnTimer = 3.0;
                    enemy.burnTickTimer = 0.3;
                    hitAny = true;
                    if (!enemy.alive) {
                        this._soloEnemyDied(enemy);
                    }
                }
            }
        }

        if (hitAny) {
            Sound.playHit();
            Particles.spawnHit(
                Engine.screenWidth / 2,
                Engine.screenHeight / 2,
                '#ff6600'
            );
        }
    },

    // Railgun: Durchdringend - trifft ALLE Gegner in der Linie
    _handleRailgunShot(p, weaponDmg) {
        let hitAny = false;

        // Alle Gegner in der Schusslinie treffen (sortiert nach Entfernung)
        const targets = [];
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
                targets.push({ enemy, dist });
            }
        }

        // Nach Entfernung sortieren und alle treffen (Railgun durchdringt!)
        targets.sort((a, b) => a.dist - b.dist);
        for (const t of targets) {
            // Sichtlinie nur zum ersten pruefen, danach durchdringt der Strahl
            if (targets.indexOf(t) === 0) {
                if (!hasLineOfSight(p.x, p.y, t.enemy.x, t.enemy.y)) continue;
            }
            t.enemy.takeDamage(weaponDmg);
            hitAny = true;
            if (!t.enemy.alive) {
                this._soloEnemyDied(t.enemy);
            }
        }

        if (hitAny) {
            Sound.playHit();
            Particles.spawnHit(
                Engine.screenWidth / 2,
                Engine.screenHeight / 2,
                '#4444ff'
            );
        }
    },

    // Raketenwerfer: Splash-Schaden im Radius 1.5
    _handleLauncherShot(p, weaponDmg) {
        // Erst naechsten Gegner in der Linie finden (wie Standard)
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
            const impactX = closestEnemy.x;
            const impactY = closestEnemy.y;
            const splashRadius = 1.5;

            // Splash-Schaden an allen Gegnern im Radius
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - impactX;
                const dy = enemy.y - impactY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < splashRadius) {
                    // Schaden nimmt mit Entfernung ab
                    const falloff = 1.0 - (dist / splashRadius);
                    const dmg = Math.floor(weaponDmg * falloff);
                    if (dmg > 0) {
                        enemy.takeDamage(dmg);
                        if (!enemy.alive) {
                            this._soloEnemyDied(enemy);
                        }
                    }
                }
            }

            // Selbstschaden wenn zu nah
            const selfDist = Math.sqrt(
                (p.x - impactX) * (p.x - impactX) +
                (p.y - impactY) * (p.y - impactY)
            );
            if (selfDist < splashRadius) {
                const selfFalloff = 1.0 - (selfDist / splashRadius);
                const selfDmg = Math.floor(weaponDmg * 0.5 * selfFalloff);
                if (selfDmg > 0) {
                    p.takeDamage(selfDmg);
                }
            }

            Sound.playHit();
            Particles.spawnHit(
                Engine.screenWidth / 2,
                Engine.screenHeight / 2,
                '#ff8800'
            );
        }
    },

    // Solo: Gegner gestorben -> Drops
    _soloEnemyDied(enemy) {
        if (enemy.boss) {
            // Boss droppt immer grossen Goldschatz
            this.pickups.push(new Pickup(
                enemy.x + (Math.random() - 0.5) * 0.3,
                enemy.y + (Math.random() - 0.5) * 0.3,
                'gold_big'
            ));
        } else {
            // 40% Chance auf Gold-Drop
            if (Math.random() < 0.4) {
                this.pickups.push(new Pickup(
                    enemy.x + (Math.random() - 0.5) * 0.3,
                    enemy.y + (Math.random() - 0.5) * 0.3,
                    'gold'
                ));
            }
        }

        // Health-Drop (30% Chance)
        if (Math.random() < 0.3) {
            this.pickups.push(new Pickup(enemy.x, enemy.y, 'health'));
        }
    },

    // Pickup-Kollision (alle Typen, generalisiert fuer alle weapon_* Pickups)
    _checkPickups() {
        const p = this.player;
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;
            const dx = pickup.x - p.x, dy = pickup.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + pickup.radius) {
                if (pickup.type === 'health') {
                    if (p.health < p.maxHealth) {
                        p.heal(pickup.healAmount);
                        pickup.active = false;
                        Sound.playPickup();
                    }
                } else if (pickup.type === 'gold' || pickup.type === 'gold_big') {
                    p.gold += pickup.goldValue;
                    pickup.active = false;
                    Sound.playGoldPickup();
                } else if (pickup.weaponType) {
                    // Generisch fuer alle Waffen-Pickups
                    const wp = p.weapons[pickup.weaponType];
                    if (wp && !wp.owned) {
                        if (p.gold >= pickup.weaponCost) {
                            p.gold -= pickup.weaponCost;
                            wp.owned = true;
                            p.currentWeapon = pickup.weaponType;
                            pickup.active = false;
                            Sound.playWeaponPickup();
                        }
                    }
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
            // Solo-Wellenmodus (einziger Offline-Modus)
            Renderer.renderFrame(this.player, this.enemies, this.pickups, []);
            HUD.draw(this.ctx, this.player, this.enemies, this.currentFps, null, this.pickups, this.soloWave);
            Particles.draw(this.ctx);
        }
    },

    // ============================================
    // Pause-Menue
    // ============================================
    _setupPauseMenu() {
        const resumeBtn = document.getElementById('resumeBtn');
        const leaveBtn = document.getElementById('leaveBtn');

        resumeBtn.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });

        leaveBtn.addEventListener('click', () => {
            this._leaveGame();
        });
    },

    _showPauseMenu() {
        document.getElementById('pauseMenu').style.display = '';
    },

    _hidePauseMenu() {
        document.getElementById('pauseMenu').style.display = 'none';
    },

    // Spiel verlassen und zurueck zum Startbildschirm
    _leaveGame() {
        this._hidePauseMenu();
        this.started = false;
        this.running = false;
        Sound.stopMusic();

        // Im Multiplayer: Verbindung trennen und Seite neu laden
        // (sauberste Loesung, da viele Event-Listener registriert sind)
        if (this.isMultiplayer && Network.connected) {
            Network.socket.disconnect();
            location.reload();
            return;
        }

        // Zurueck zum Startbildschirm mit Modus-Auswahl
        document.getElementById('startScreen').style.display = '';
        document.getElementById('spStart').style.display = 'block';
        document.getElementById('spModeSelect').style.display = '';
        document.getElementById('spModeDesc').style.display = '';
        document.getElementById('mpJoin').style.display = 'none';
        document.getElementById('mpLobby').style.display = 'none';
        const prompt = document.getElementById('startPrompt');
        if (prompt) {
            prompt.style.display = '';
            prompt.textContent = 'Klicke um zu starten!';
        }
        this.enemies = [];
        this.pickups = [];
        this.player = null;
    }
};

// ============================================
// Spiel starten sobald die Seite geladen ist
// ============================================
window.addEventListener('load', () => {
    Game.init();
});
