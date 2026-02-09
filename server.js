// ============================================
// server.js - Multiplayer-Server (autoritativ)
// Express + Socket.io, 20 Ticks/Sekunde
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

// Karten-Modul laden (wird auch vom Client verwendet)
const {
    MAP_DATA, MAP_WIDTH, MAP_HEIGHT,
    isWall, hasLineOfSight, SPAWN_POINTS
} = require('./js/map.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statische Dateien ausliefern
app.use(express.static(path.join(__dirname)));

// ============================================
// Spiel-Konfiguration
// ============================================
const PORT = process.env.PORT || 3000;
const TICK_RATE = 20;
const PLAYER_SPEED = 3.5;
const PLAYER_RADIUS = 0.2;
const SHOOT_COOLDOWN = 0.35;
const DAMAGE = 25;
const RESPAWN_TIME = 3000; // ms

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

io.on('connection', (socket) => {
    console.log(`Verbindung: ${socket.id}`);

    // --- Spieler tritt bei ---
    socket.on('join', (data) => {
        const spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
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
            deathTime: 0
        };

        players.set(socket.id, player);
        socket.emit('welcome', { id: socket.id, color: color });
        io.emit('playerJoined', { id: socket.id, name: player.name, color: color });
        console.log(`  -> ${player.name} (${color}) beigetreten [${players.size} Spieler]`);
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
    });

    // --- Schuss vom Client ---
    socket.on('shoot', () => {
        const p = players.get(socket.id);
        if (!p || !p.alive) return;
        p.shooting = true;
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
        }
    });
});

// ============================================
// Server Game Loop (20 Ticks/Sekunde)
// ============================================
setInterval(() => {
    const dt = 1 / TICK_RATE;

    for (const [id, p] of players) {
        // --- Tote Spieler: Respawn pruefen ---
        if (!p.alive) {
            if (Date.now() - p.deathTime >= RESPAWN_TIME) {
                const spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
                p.x = spawn.x;
                p.y = spawn.y;
                p.health = 100;
                p.alive = true;
                p.angle = Math.random() * Math.PI * 2;
                p.dirX = Math.cos(p.angle);
                p.dirY = Math.sin(p.angle);
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

            // Kollisionserkennung
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
                p.canShoot = false;
                p.shootTimer = SHOOT_COOLDOWN;

                const hit = checkShot(p);
                if (hit) {
                    hit.health -= DAMAGE;
                    io.to(hit.id).emit('hit', { damage: DAMAGE });

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

    // --- Spielzustand an alle senden (volatile = darf gedroppt werden) ---
    const state = { players: {}, timestamp: Date.now() };
    for (const [id, p] of players) {
        state.players[id] = {
            x: p.x, y: p.y, angle: p.angle,
            health: p.health, alive: p.alive,
            name: p.name, color: p.color,
            kills: p.kills, deaths: p.deaths
        };
    }
    io.volatile.emit('gameState', state);

}, 1000 / TICK_RATE);

// ============================================
// Schuss-Treffer-Erkennung (Raycasting)
// ============================================
function checkShot(shooter) {
    let closestHit = null;
    let closestDist = Infinity;

    for (const [id, target] of players) {
        if (id === shooter.id || !target.alive) continue;

        const dx = target.x - shooter.x;
        const dy = target.y - shooter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - shooter.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const hitAngle = Math.atan2(PLAYER_RADIUS + 0.15, dist);
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

// ============================================
// Server starten
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
