// ============================================
// server.js - Multiplayer-Server (autoritativ)
// Express + Socket.io, 20 Ticks/Sekunde
// Unterstuetzt Deathmatch und Co-op Modus
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

// Karten-Modul laden (wird auch vom Client verwendet)
const {
    MAP_DATA, MAP_WIDTH, MAP_HEIGHT,
    isWall, hasLineOfSight, SPAWN_POINTS, ENEMY_SPAWNS,
    setDoorsModule
} = require('./js/map.js');

// Tuer-Modul laden
const { Doors } = require('./js/doors.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statische Dateien ausliefern
app.use(express.static(path.join(__dirname)));

// Tueren initialisieren und mit Map-Modul verbinden
Doors.init();
setDoorsModule(Doors);

// ============================================
// Konfiguration
// ============================================
const PORT = process.env.PORT || 3000;
const TICK_RATE = 20;
const PLAYER_SPEED = 3.5;
const PLAYER_RADIUS = 0.2;
const SHOOT_COOLDOWN = 0.35;
const DAMAGE = 25;
const RESPAWN_TIME_DM = 3000;   // Deathmatch Respawn (ms)
const RESPAWN_TIME_COOP = 5000; // Co-op Respawn (ms)
const ENEMY_RADIUS = 0.3;
const ENEMY_DAMAGE = 8;
const ENEMY_ATTACK_COOLDOWN = 1.5;
const WAVE_PAUSE = 10; // Sekunden zwischen Wellen

// ============================================
// Performance-Optimierung
// ============================================

// Delta-Compression: Nur geaenderte Daten senden
let tickCount = 0;
const FULL_STATE_INTERVAL = 5; // Alle 5 Ticks ein voller Snapshot
const lastSentState = new Map(); // id -> letzter gesendeter Zustand

// Lag-Compensation: Positionshistorie (1 Sekunde Ring-Buffer)
const HISTORY_SIZE = 20;
const positionHistory = [];
const playerPings = new Map(); // id -> Ping in ms

// Koordinaten auf 2 Dezimalstellen runden (spart Bandbreite)
function round2(n) { return Math.round(n * 100) / 100; }

// Verfuegbare Spielerfarben
const PLAYER_COLORS = [
    '#ff4444', '#4488ff', '#44cc44', '#ffcc00',
    '#cc44ff', '#44cccc', '#ff8844', '#88ff44'
];
let nextColorIndex = 0;

// ============================================
// Spieler-Verwaltung
// ============================================
const players = new Map();

// ============================================
// Lobby-Zustand
// ============================================
const lobby = {
    hostId: null,
    mode: 'deathmatch', // 'deathmatch' | 'coop'
    state: 'waiting'    // 'waiting' | 'playing'
};

// ============================================
// Co-op-Zustand
// ============================================
const coop = {
    wave: 0,
    enemies: [],
    nextEnemyId: 0,
    betweenWaves: false,
    countdown: WAVE_PAUSE,
    gameOver: false,
    gameOverTime: null,
    pickups: [],
    nextPickupId: 0
};

// ============================================
// Hilfsfunktionen
// ============================================

// Lokale Netzwerk-IP ermitteln
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
}

// Lobby-Status an alle senden
function sendLobbyUpdate() {
    const playerList = [];
    for (const [id, p] of players) {
        playerList.push({ id, name: p.name, color: p.color });
    }
    io.emit('lobbyUpdate', {
        hostId: lobby.hostId,
        mode: lobby.mode,
        state: lobby.state,
        players: playerList
    });
}

// Zufaelligen Spawnpunkt holen
function getRandomSpawn() {
    return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
}

// Gegner-Spawnposition (nicht zu nah an Spielern)
function getEnemySpawnPosition() {
    const candidates = [...ENEMY_SPAWNS, ...SPAWN_POINTS];
    // Mischen (Fisher-Yates)
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (const pos of candidates) {
        let tooClose = false;
        for (const [, p] of players) {
            if (!p.alive) continue;
            const dx = p.x - pos.x;
            const dy = p.y - pos.y;
            if (dx * dx + dy * dy < 16) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) return { x: pos.x, y: pos.y };
    }
    // Fallback
    const pos = ENEMY_SPAWNS[Math.floor(Math.random() * ENEMY_SPAWNS.length)];
    return { x: pos.x, y: pos.y };
}

// ============================================
// Co-op Wellen-System
// ============================================

// Naechste Welle starten
function startNextWave() {
    coop.wave++;
    coop.betweenWaves = false;
    coop.enemies = [];

    const isBossWave = coop.wave % 5 === 0;
    const enemyCount = 5 + (coop.wave - 1) * 3;
    const enemyHP = Math.min(200, 50 + (coop.wave - 1) * 10);
    const enemySpeed = Math.min(3.5, 1.5 + (coop.wave - 1) * 0.15);

    // Gegner spawnen
    for (let i = 0; i < enemyCount; i++) {
        const pos = getEnemySpawnPosition();
        coop.enemies.push({
            id: coop.nextEnemyId++,
            x: pos.x,
            y: pos.y,
            health: enemyHP,
            maxHealth: enemyHP,
            speed: enemySpeed,
            damage: ENEMY_DAMAGE,
            alive: true,
            hurtTimer: 0,
            attackTimer: ENEMY_ATTACK_COOLDOWN,
            radius: ENEMY_RADIUS,
            state: 'idle',
            boss: false
        });
    }

    // Boss spawnen bei jeder 5. Welle
    if (isBossWave) {
        const bossHP = 300 + coop.wave * 40;
        const bossSpeed = Math.min(2.5, 1.0 + (coop.wave - 1) * 0.1);
        const bossDamage = Math.min(35, 15 + coop.wave);
        const pos = getEnemySpawnPosition();
        coop.enemies.push({
            id: coop.nextEnemyId++,
            x: pos.x,
            y: pos.y,
            health: bossHP,
            maxHealth: bossHP,
            speed: bossSpeed,
            damage: bossDamage,
            alive: true,
            hurtTimer: 0,
            attackTimer: ENEMY_ATTACK_COOLDOWN * 0.7,
            radius: ENEMY_RADIUS * 1.5,
            state: 'idle',
            boss: true
        });
    }

    // Health-Pickups spawnen (1 pro 3 Gegner)
    coop.pickups = [];
    const pickupCount = Math.max(1, Math.floor(enemyCount / 3));
    for (let i = 0; i < pickupCount; i++) {
        const pos = getEnemySpawnPosition();
        coop.pickups.push({
            id: coop.nextPickupId++,
            x: pos.x,
            y: pos.y,
            active: true
        });
    }

    const totalEnemies = coop.enemies.length;
    io.emit('waveStart', { wave: coop.wave, enemyCount: totalEnemies, enemyHP, boss: isBossWave });
    if (isBossWave) {
        console.log(`  BOSS WELLE ${coop.wave}: ${totalEnemies} Gegner + Boss (HP: ${300 + coop.wave * 40})`);
    } else {
        console.log(`  Welle ${coop.wave}: ${totalEnemies} Gegner (HP: ${enemyHP}, Speed: ${enemySpeed.toFixed(1)})`);
    }
}

// Pause zwischen Wellen starten + tote Spieler wiederbeleben
function startWavePause() {
    coop.betweenWaves = true;
    coop.countdown = WAVE_PAUSE;

    // Tote Spieler wiederbeleben
    for (const [, p] of players) {
        if (!p.alive) {
            const spawn = getRandomSpawn();
            p.x = spawn.x;
            p.y = spawn.y;
            p.health = 100;
            p.alive = true;
            p.angle = Math.random() * Math.PI * 2;
            p.dirX = Math.cos(p.angle);
            p.dirY = Math.sin(p.angle);
        }
    }
}

// Pruefen ob alle Spieler tot sind (Co-op Game Over)
function checkCoopGameOver() {
    if (coop.gameOver) return;
    let allDead = true;
    for (const [, p] of players) {
        if (p.alive) { allDead = false; break; }
    }
    if (allDead && players.size > 0) {
        coop.gameOver = true;
        coop.gameOverTime = Date.now();
        io.emit('coopGameOver', { wave: coop.wave });
        console.log(`  GAME OVER bei Welle ${coop.wave}`);
    }
}

// Co-op: Alles zuruecksetzen und in Lobby zurueckkehren
function resetToLobby() {
    lobby.state = 'waiting';
    coop.gameOver = false;
    coop.gameOverTime = null;
    coop.wave = 0;
    coop.enemies = [];
    coop.pickups = [];
    coop.nextEnemyId = 0;
    coop.nextPickupId = 0;

    for (const [, p] of players) {
        p.kills = 0;
        p.deaths = 0;
        p.health = 100;
        p.alive = true;
        const spawn = getRandomSpawn();
        p.x = spawn.x;
        p.y = spawn.y;
    }

    io.emit('returnToLobby');
    sendLobbyUpdate();
    console.log('  -> Zurueck in die Lobby');
}

// ============================================
// Co-op Gegner-KI
// ============================================
function updateCoopEnemies(dt) {
    for (const enemy of coop.enemies) {
        if (!enemy.alive) continue;

        if (enemy.hurtTimer > 0) enemy.hurtTimer -= dt;

        // Naechsten lebenden Spieler finden
        let nearestPlayer = null;
        let nearestDist = Infinity;
        for (const [, p] of players) {
            if (!p.alive) continue;
            const dx = p.x - enemy.x;
            const dy = p.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPlayer = p;
            }
        }

        if (!nearestPlayer) continue;

        const canSee = nearestDist < 16 &&
            hasLineOfSight(enemy.x, enemy.y, nearestPlayer.x, nearestPlayer.y);

        // Zustandsmaschine (wie Singleplayer-KI)
        switch (enemy.state) {
            case 'idle':
                if (canSee) enemy.state = 'chase';
                break;

            case 'chase':
                if (!canSee) {
                    enemy.state = 'idle';
                } else if (nearestDist < 8) {
                    enemy.state = 'attack';
                } else {
                    moveEnemy(enemy, nearestPlayer.x, nearestPlayer.y, dt, 1.0);
                }
                break;

            case 'attack':
                if (!canSee) {
                    enemy.state = 'idle';
                } else if (nearestDist > 10) {
                    enemy.state = 'chase';
                } else {
                    moveEnemy(enemy, nearestPlayer.x, nearestPlayer.y, dt, 0.5);
                    enemy.attackTimer -= dt;
                    if (enemy.attackTimer <= 0) {
                        enemy.attackTimer = enemy.boss ? ENEMY_ATTACK_COOLDOWN * 0.7 : ENEMY_ATTACK_COOLDOWN;
                        const hitChance = Math.max(0.3, 1.0 - nearestDist / 8);
                        if (Math.random() < hitChance) {
                            const dmg = enemy.damage || ENEMY_DAMAGE;
                            nearestPlayer.health -= dmg;
                            io.to(nearestPlayer.id).emit('hit', {
                                damage: dmg,
                                attackerName: enemy.boss ? 'BOSS' : 'Gegner'
                            });
                            if (nearestPlayer.health <= 0) {
                                nearestPlayer.health = 0;
                                nearestPlayer.alive = false;
                                nearestPlayer.deathTime = Date.now();
                                nearestPlayer.deaths++;
                                io.emit('kill', {
                                    killerId: null,
                                    killerName: 'Gegner',
                                    victimId: nearestPlayer.id,
                                    victimName: nearestPlayer.name
                                });
                                checkCoopGameOver();
                            }
                        }
                    }
                }
                break;
        }
    }
}

// Gegner in Richtung Ziel bewegen (mit Wandkollision)
function moveEnemy(enemy, targetX, targetY, dt, speedMul) {
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    const speed = enemy.speed * dt * speedMul;
    const mx = (dx / dist) * speed;
    const my = (dy / dist) * speed;

    const r = enemy.radius;
    const nx = enemy.x + mx;
    if (!isWall(nx + r, enemy.y + r) && !isWall(nx + r, enemy.y - r) &&
        !isWall(nx - r, enemy.y + r) && !isWall(nx - r, enemy.y - r)) {
        enemy.x = nx;
    }
    const ny = enemy.y + my;
    if (!isWall(enemy.x + r, ny + r) && !isWall(enemy.x + r, ny - r) &&
        !isWall(enemy.x - r, ny + r) && !isWall(enemy.x - r, ny - r)) {
        enemy.y = ny;
    }
}

// ============================================
// Schuss-Treffer-Erkennung
// ============================================

// Gegen Spieler (Deathmatch)
function checkShotPlayers(shooter) {
    let closestHit = null;
    let closestDist = Infinity;
    // Schrotflinte hat breiteren Trefferwinkel
    const extraAngle = shooter.currentWeapon === 'shotgun' ? 0.08 : 0;

    for (const [id, target] of players) {
        if (id === shooter.id || !target.alive) continue;
        const dx = target.x - shooter.x;
        const dy = target.y - shooter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - shooter.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const hitAngle = Math.atan2(PLAYER_RADIUS + 0.15, dist) + extraAngle;
        if (Math.abs(angleDiff) < hitAngle + 0.03) {
            if (hasLineOfSight(shooter.x, shooter.y, target.x, target.y)) {
                if (dist < closestDist) {
                    closestDist = dist;
                    closestHit = target;
                }
            }
        }
    }
    return closestHit;
}

// Gegen Co-op Gegner
function checkShotEnemies(shooter) {
    let closestHit = null;
    let closestDist = Infinity;
    // Schrotflinte hat breiteren Trefferwinkel
    const extraAngle = shooter.currentWeapon === 'shotgun' ? 0.08 : 0;

    for (const enemy of coop.enemies) {
        if (!enemy.alive) continue;
        const dx = enemy.x - shooter.x;
        const dy = enemy.y - shooter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - shooter.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const hitAngle = Math.atan2((enemy.radius || ENEMY_RADIUS) + 0.15, dist) + extraAngle;
        if (Math.abs(angleDiff) < hitAngle + 0.03) {
            if (hasLineOfSight(shooter.x, shooter.y, enemy.x, enemy.y)) {
                if (dist < closestDist) {
                    closestDist = dist;
                    closestHit = enemy;
                }
            }
        }
    }
    return closestHit;
}

// ============================================
// Socket.io Verbindungs-Events
// ============================================
io.on('connection', (socket) => {
    console.log(`Verbindung: ${socket.id}`);

    // --- Ping-Messung ---
    socket.on('ping', (data) => {
        socket.emit('pong', data);
    });

    // --- Ping-Bericht vom Client (fuer Lag-Compensation) ---
    socket.on('reportPing', (data) => {
        if (typeof data.ping === 'number' && data.ping >= 0 && data.ping < 5000) {
            playerPings.set(socket.id, data.ping);
        }
    });

    // --- Spieler tritt bei ---
    socket.on('join', (data) => {
        const spawn = getRandomSpawn();
        const color = PLAYER_COLORS[nextColorIndex % PLAYER_COLORS.length];
        nextColorIndex++;

        const angle = Math.random() * Math.PI * 2;
        const player = {
            id: socket.id,
            name: (data.name || 'Spieler').substring(0, 15),
            x: spawn.x,
            y: spawn.y,
            angle: angle,
            dirX: Math.cos(angle),
            dirY: Math.sin(angle),
            health: 100,
            alive: true,
            color: color,
            kills: 0,
            deaths: 0,
            input: { forward: false, backward: false, left: false, right: false },
            shooting: false,
            canShoot: true,
            shootTimer: 0,
            deathTime: 0,
            gold: 0,
            currentWeapon: 'pistol',
            weapons: {
                pistol:     { owned: true,  damage: 25, cooldown: 0.35 },
                shotgun:    { owned: false, damage: 60, cooldown: 0.8 },
                machinegun: { owned: false, damage: 15, cooldown: 0.1 }
            }
        };

        players.set(socket.id, player);

        // Erster Spieler wird Host
        if (!lobby.hostId) {
            lobby.hostId = socket.id;
        }

        socket.emit('welcome', { id: socket.id, color: color });

        // Wenn Spiel laeuft -> direkt rein (Late-Join)
        if (lobby.state === 'playing') {
            socket.emit('gameStart', { mode: lobby.mode });
        }

        io.emit('playerJoined', { id: socket.id, name: player.name, color: color });
        sendLobbyUpdate();
        console.log(`  -> ${player.name} (${color}) beigetreten [${players.size} Spieler]`);
    });

    // --- Modus-Auswahl (nur Host, nur in Lobby) ---
    socket.on('selectMode', (data) => {
        if (socket.id !== lobby.hostId) return;
        if (lobby.state !== 'waiting') return;
        lobby.mode = data.mode === 'coop' ? 'coop' : 'deathmatch';
        sendLobbyUpdate();
        console.log(`  Modus: ${lobby.mode}`);
    });

    // --- Spiel starten (nur Host) ---
    socket.on('startGame', () => {
        if (socket.id !== lobby.hostId) return;
        if (lobby.state !== 'waiting') return;

        lobby.state = 'playing';
        Doors.init(); // Tueren zuruecksetzen
        io.emit('gameStart', { mode: lobby.mode });
        console.log(`  === SPIEL GESTARTET (${lobby.mode}) ===`);

        if (lobby.mode === 'coop') {
            coop.wave = 0;
            coop.gameOver = false;
            coop.gameOverTime = null;
            coop.enemies = [];
            coop.pickups = [];
            startWavePause();
        }
    });

    // --- Eingabe-Update vom Client ---
    socket.on('input', (data) => {
        const p = players.get(socket.id);
        if (!p || !p.alive) return;
        p.input.forward  = !!data.forward;
        p.input.backward = !!data.backward;
        p.input.left     = !!data.left;
        p.input.right    = !!data.right;
        p.angle = Number(data.angle) || 0;
        p.dirX = Math.cos(p.angle);
        p.dirY = Math.sin(p.angle);
        // Waffenwechsel vom Client uebernehmen (Kauf passiert lokal)
        if (data.weapon && p.weapons[data.weapon]) {
            p.weapons[data.weapon].owned = true;
            p.currentWeapon = data.weapon;
        }
    });

    // --- Schuss vom Client ---
    socket.on('shoot', () => {
        const p = players.get(socket.id);
        if (!p || !p.alive) return;
        p.shooting = true;
    });

    // --- Interaktion (Tuer oeffnen) ---
    socket.on('interact', (data) => {
        const p = players.get(socket.id);
        if (!p || !p.alive) return;

        const dirX = Math.cos(data.angle || 0);
        const dirY = Math.sin(data.angle || 0);

        // Nahe und ferne Tuer pruefen
        const checks = [
            { x: Math.floor(p.x + dirX * 0.8), y: Math.floor(p.y + dirY * 0.8) },
            { x: Math.floor(p.x + dirX * 1.8), y: Math.floor(p.y + dirY * 1.8) }
        ];

        for (const c of checks) {
            const door = Doors.getDoor(c.x, c.y);
            if (door && door.state === 'closed') {
                const key = c.x + ',' + c.y;
                Doors.openDoor(key);
                io.emit('doorOpened', { key });
                break;
            }
        }
    });

    // --- Chat-Nachricht ---
    socket.on('chat', (data) => {
        const p = players.get(socket.id);
        if (!p) return;
        const msg = (data.message || '').substring(0, 100);
        if (msg.length > 0) {
            io.emit('chat', { name: p.name, message: msg, color: p.color });
        }
    });

    // --- Verbindung getrennt ---
    socket.on('disconnect', () => {
        const p = players.get(socket.id);
        if (p) {
            console.log(`  <- ${p.name} verlassen [${players.size - 1} Spieler]`);
            io.emit('playerLeft', { id: socket.id, name: p.name });
            players.delete(socket.id);
            lastSentState.delete(socket.id);
            playerPings.delete(socket.id);

            // Host-Wechsel wenn noetig
            if (lobby.hostId === socket.id) {
                const next = players.keys().next();
                lobby.hostId = next.done ? null : next.value;
                if (lobby.hostId) {
                    console.log(`  Neuer Host: ${players.get(lobby.hostId).name}`);
                }
            }

            if (players.size === 0) {
                // Alle weg -> zurueck in Lobby
                lobby.state = 'waiting';
                lobby.hostId = null;
                coop.gameOver = false;
                coop.wave = 0;
                coop.enemies = [];
                coop.pickups = [];
            } else if (lobby.mode === 'coop' && lobby.state === 'playing') {
                checkCoopGameOver();
            }

            sendLobbyUpdate();
        }
    });
});

// ============================================
// Lag-Compensation: Schuss mit Positions-Rewind
// ============================================
function checkShotWithLagComp(shooter, checkFn) {
    const ping = playerPings.get(shooter.id) || 0;
    // Kein Rewind noetig bei niedrigem Ping
    if (ping < 30 || positionHistory.length === 0) return checkFn(shooter);

    // Zeitpunkt berechnen an dem der Schuss abgefeuert wurde
    const rewindTime = Date.now() - Math.floor(ping / 2);

    // Naechsten historischen Snapshot finden
    let bestSnap = null;
    let bestDiff = Infinity;
    for (const snap of positionHistory) {
        const diff = Math.abs(snap.timestamp - rewindTime);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestSnap = snap;
        }
    }

    if (!bestSnap) return checkFn(shooter);

    // Positionen temporaer zurueckspulen
    const saved = new Map();
    for (const [id, pos] of bestSnap.positions) {
        const p = players.get(id);
        if (p && id !== shooter.id) {
            saved.set(id, { x: p.x, y: p.y });
            p.x = pos.x;
            p.y = pos.y;
        }
    }

    // Schuss mit historischen Positionen pruefen
    const result = checkFn(shooter);

    // Positionen wiederherstellen
    for (const [id, pos] of saved) {
        const p = players.get(id);
        if (p) {
            p.x = pos.x;
            p.y = pos.y;
        }
    }

    return result;
}

// ============================================
// Server Game Loop (20 Ticks/Sekunde)
// ============================================
setInterval(() => {
    if (lobby.state !== 'playing') return;

    const dt = 1 / TICK_RATE;

    // --- Tueren aktualisieren ---
    Doors.update(dt);

    // --- Co-op: Wellen-Logik ---
    if (lobby.mode === 'coop' && !coop.gameOver) {
        if (coop.betweenWaves) {
            coop.countdown -= dt;
            if (coop.countdown <= 0) {
                startNextWave();
            }
        } else {
            // Gegner-KI aktualisieren
            updateCoopEnemies(dt);

            // Welle geschafft?
            const allEnemiesDead = coop.enemies.length > 0 &&
                coop.enemies.every(e => !e.alive);
            if (allEnemiesDead) {
                console.log(`  Welle ${coop.wave} geschafft!`);
                startWavePause();
            }
        }
    }

    // --- Co-op Game Over: nach 8 Sekunden zurueck in Lobby ---
    if (lobby.mode === 'coop' && coop.gameOver && coop.gameOverTime) {
        if (Date.now() - coop.gameOverTime > 8000) {
            resetToLobby();
            return;
        }
    }

    // --- Spieler-Updates ---
    for (const [id, p] of players) {
        // Tote Spieler: Respawn pruefen
        if (!p.alive) {
            if (lobby.mode === 'coop') {
                // Co-op: nur respawnen wenn nicht Game Over
                if (!coop.gameOver && Date.now() - p.deathTime >= RESPAWN_TIME_COOP) {
                    const spawn = getRandomSpawn();
                    p.x = spawn.x;
                    p.y = spawn.y;
                    p.health = 100;
                    p.alive = true;
                    p.angle = Math.random() * Math.PI * 2;
                    p.dirX = Math.cos(p.angle);
                    p.dirY = Math.sin(p.angle);
                }
            } else {
                // Deathmatch: normaler Respawn
                if (Date.now() - p.deathTime >= RESPAWN_TIME_DM) {
                    const spawn = getRandomSpawn();
                    p.x = spawn.x;
                    p.y = spawn.y;
                    p.health = 100;
                    p.alive = true;
                    p.angle = Math.random() * Math.PI * 2;
                    p.dirX = Math.cos(p.angle);
                    p.dirY = Math.sin(p.angle);
                }
            }
            continue;
        }

        // --- Bewegung berechnen ---
        let moveX = 0;
        let moveY = 0;
        if (p.input.forward)  { moveX += p.dirX; moveY += p.dirY; }
        if (p.input.backward) { moveX -= p.dirX; moveY -= p.dirY; }
        if (p.input.left)     { moveX += p.dirY; moveY -= p.dirX; }
        if (p.input.right)    { moveX -= p.dirY; moveY += p.dirX; }

        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        if (len > 0) {
            const speed = PLAYER_SPEED * dt;
            moveX = (moveX / len) * speed;
            moveY = (moveY / len) * speed;

            const r = PLAYER_RADIUS;
            const nx = p.x + moveX;
            if (!isWall(nx + r, p.y + r) && !isWall(nx + r, p.y - r) &&
                !isWall(nx - r, p.y + r) && !isWall(nx - r, p.y - r)) {
                p.x = nx;
            }
            const ny = p.y + moveY;
            if (!isWall(p.x + r, ny + r) && !isWall(p.x + r, ny - r) &&
                !isWall(p.x - r, ny + r) && !isWall(p.x - r, ny - r)) {
                p.y = ny;
            }
        }

        // --- Schuss-Cooldown ---
        if (!p.canShoot) {
            p.shootTimer -= dt;
            if (p.shootTimer <= 0) p.canShoot = true;
        }

        // --- Schiessen verarbeiten ---
        if (p.shooting) {
            p.shooting = false;
            if (p.canShoot) {
                const wpn = p.weapons[p.currentWeapon];
                p.canShoot = false;
                p.shootTimer = wpn.cooldown;

                if (lobby.mode === 'coop') {
                    // Co-op: Gegner treffen
                    const enemy = checkShotEnemies(p);
                    if (enemy) {
                        enemy.health -= wpn.damage;
                        enemy.hurtTimer = 0.15;
                        if (enemy.state === 'idle') enemy.state = 'chase';

                        // Treffer-Bestaetigung an Schuetzen
                        io.to(p.id).emit('shotHit');

                        if (enemy.health <= 0) {
                            enemy.health = 0;
                            enemy.alive = false;
                            p.kills++;
                            io.emit('enemyKilled', {
                                id: enemy.id,
                                killerName: p.name,
                                x: enemy.x,
                                y: enemy.y,
                                boss: enemy.boss || false
                            });
                        }
                    }
                } else {
                    // Deathmatch: Spieler treffen (mit Lag-Compensation)
                    const hit = checkShotWithLagComp(p, checkShotPlayers);
                    if (hit) {
                        hit.health -= wpn.damage;

                        // Treffer-Bestaetigung an Schuetzen
                        io.to(p.id).emit('shotHit');

                        // Opfer benachrichtigen
                        io.to(hit.id).emit('hit', {
                            damage: wpn.damage,
                            attackerName: p.name
                        });

                        if (hit.health <= 0) {
                            hit.health = 0;
                            hit.alive = false;
                            hit.deathTime = Date.now();
                            hit.deaths++;
                            p.kills++;
                            io.emit('kill', {
                                killerId: p.id, killerName: p.name,
                                victimId: hit.id, victimName: hit.name
                            });
                            console.log(`  ** ${p.name} -> ${hit.name}`);
                        }
                    }
                }
            }
        }

        // --- Co-op: Pickup-Kollision ---
        if (lobby.mode === 'coop') {
            for (const pickup of coop.pickups) {
                if (!pickup.active) continue;
                const dx = pickup.x - p.x;
                const dy = pickup.y - p.y;
                if (dx * dx + dy * dy < 0.64 && p.health < 100) {
                    pickup.active = false;
                    p.health = Math.min(100, p.health + 25);
                    io.emit('pickupCollected', { id: pickup.id, playerId: p.id });
                }
            }
        }
    }

    // --- Positionshistorie speichern (fuer Lag-Compensation) ---
    const histEntry = { timestamp: Date.now(), positions: new Map() };
    for (const [id, p] of players) {
        histEntry.positions.set(id, { x: p.x, y: p.y });
    }
    positionHistory.push(histEntry);
    if (positionHistory.length > HISTORY_SIZE) positionHistory.shift();

    // --- Spielzustand mit Delta-Compression senden ---
    tickCount++;
    const isFullTick = tickCount % FULL_STATE_INTERVAL === 0;
    const state = { t: Date.now(), p: {} };

    for (const [id, p] of players) {
        const curr = {
            x: round2(p.x), y: round2(p.y), a: round2(p.angle),
            h: p.health, al: p.alive
        };

        if (isFullTick) {
            // Voller Snapshot: alle Daten mitsenden
            state.p[id] = {
                ...curr,
                n: p.name, c: p.color,
                k: p.kills, d: p.deaths
            };
        } else {
            // Delta: nur senden wenn sich etwas geaendert hat
            const last = lastSentState.get(id);
            if (!last ||
                curr.x !== last.x || curr.y !== last.y ||
                curr.a !== last.a || curr.h !== last.h ||
                curr.al !== last.al ||
                p.kills !== last.k || p.deaths !== last.d) {
                state.p[id] = curr;
                if (!last || p.kills !== last.k) state.p[id].k = p.kills;
                if (!last || p.deaths !== last.d) state.p[id].d = p.deaths;
            }
        }

        lastSentState.set(id, {
            x: curr.x, y: curr.y, a: curr.a,
            h: curr.h, al: curr.al,
            k: p.kills, d: p.deaths
        });
    }

    // Entfernte Spieler markieren
    const removed = [];
    for (const [id] of lastSentState) {
        if (!players.has(id)) {
            removed.push(id);
            lastSentState.delete(id);
        }
    }
    if (removed.length > 0) state.r = removed;
    if (isFullTick) state.f = 1;

    // Co-op: Gegner, Pickups und Wellen-Info (gerundete Koordinaten)
    if (lobby.mode === 'coop') {
        state.enemies = coop.enemies.map(e => ({
            id: e.id, x: round2(e.x), y: round2(e.y),
            health: e.health, maxHealth: e.maxHealth,
            alive: e.alive, hurtTimer: e.hurtTimer > 0 ? round2(e.hurtTimer) : 0,
            boss: e.boss || false
        }));
        state.pickups = coop.pickups.filter(pk => pk.active).map(pk => ({
            id: pk.id, x: round2(pk.x), y: round2(pk.y)
        }));
        state.wave = coop.wave;
        state.betweenWaves = coop.betweenWaves;
        state.countdown = Math.ceil(coop.countdown);
        state.gameOver = coop.gameOver;
    }

    // Tuer-Zustaende mitsenden
    state.doors = Doors.serialize();

    io.volatile.emit('gameState', state);

}, 1000 / TICK_RATE);

// ============================================
// Server starten
// ============================================
server.listen(PORT, () => {
    const localIP = getLocalIP();
    console.log('');
    console.log('=================================');
    console.log('  WOLFENSTEIN 3D MULTIPLAYER');
    console.log(`  Lokal:    http://localhost:${PORT}`);
    if (localIP) {
        console.log(`  Netzwerk: http://${localIP}:${PORT}`);
    }
    console.log(`  Tick-Rate: ${TICK_RATE} Hz`);
    console.log('=================================');
    if (localIP) {
        console.log(`  Teile diesen Link mit Mitspielern`);
        console.log(`  im gleichen Netzwerk:`);
        console.log(`  -> http://${localIP}:${PORT}`);
    }
    console.log('');
});
