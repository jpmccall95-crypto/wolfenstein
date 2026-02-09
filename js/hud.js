// ============================================
// hud.js - HUD-Elemente
// Minimap, Health, Crosshair, FPS
// Multiplayer: Scoreboard, Kill-Feed, Chat
// ============================================

const HUD = {
    minimapScale: 4,
    minimapAlpha: 0.75,

    // Alle HUD-Elemente zeichnen
    // net = Network-Objekt (oder null fuer Singleplayer)
    draw(ctx, player, enemies, fps, net) {
        this._drawCrosshair(ctx);
        this._drawHealth(ctx, player);
        this._drawMinimap(ctx, player, enemies, net);
        this._drawFPS(ctx, fps);

        // --- Multiplayer-HUD ---
        if (net && net.connected) {
            this._drawKillFeed(ctx, net.killFeed);
            this._drawChat(ctx, net.chatMessages);

            if (Input.chatActive) {
                this._drawChatInput(ctx);
            }

            if (Input.showScoreboard) {
                this._drawScoreboard(ctx, net.getScoreboard());
            }

            // MP Tod-Bildschirm
            if (!player.alive) {
                this._drawMPDeath(ctx);
            }
        } else if (!player.alive) {
            // SP Game-Over
            this._drawGameOver(ctx);
        }
    },

    // --- Fadenkreuz ---
    _drawCrosshair(ctx) {
        const cx = Engine.screenWidth / 2;
        const cy = Engine.screenHeight / 2;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 3, cy);
        ctx.moveTo(cx + 3, cy);  ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 3);
        ctx.moveTo(cx, cy + 3);  ctx.lineTo(cx, cy + 10);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        ctx.globalAlpha = 1.0;
    },

    // --- Gesundheitsanzeige ---
    _drawHealth(ctx, player) {
        const x = 20, y = Engine.screenHeight - 50;
        const barW = 160, barH = 20;
        const pct = player.health / player.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 5, y - 25, barW + 80, 55);

        ctx.fillStyle = '#aaa';
        ctx.font = '12px Courier New';
        ctx.fillText('HEALTH', x, y - 8);

        ctx.fillStyle = '#330000';
        ctx.fillRect(x, y, barW, barH);

        ctx.fillStyle = pct > 0.6 ? '#22aa22' : pct > 0.3 ? '#ccaa00' : '#cc2222';
        ctx.fillRect(x, y, barW * pct, barH);

        ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Courier New';
        ctx.fillText(player.health.toString(), x + barW + 10, y + 17);
    },

    // --- Minimap (erweitert um Remote-Spieler) ---
    _drawMinimap(ctx, player, enemies, net) {
        const s = this.minimapScale;
        const mapW = MAP_WIDTH * s;
        const mapH = MAP_HEIGHT * s;
        const ox = Engine.screenWidth - mapW - 10;
        const oy = 10;

        ctx.globalAlpha = this.minimapAlpha;

        ctx.fillStyle = '#000';
        ctx.fillRect(ox - 2, oy - 2, mapW + 4, mapH + 4);

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tile = MAP_DATA[y][x];
                if (tile === 0) continue;
                switch (tile) {
                    case 1: ctx.fillStyle = '#888'; break;
                    case 2: ctx.fillStyle = '#a44'; break;
                    case 3: ctx.fillStyle = '#864'; break;
                    case 4: ctx.fillStyle = '#44a'; break;
                    default: ctx.fillStyle = '#666';
                }
                ctx.fillRect(ox + x * s, oy + y * s, s, s);
            }
        }

        // Gegner als rote Punkte (SP)
        ctx.fillStyle = '#ff0000';
        for (const e of enemies) {
            if (!e.alive) continue;
            ctx.fillRect(ox + e.x * s - 1, oy + e.y * s - 1, 3, 3);
        }

        // Remote-Spieler als farbige Punkte (MP)
        if (net && net.connected) {
            for (const rp of Object.values(net.remotePlayers)) {
                if (!rp.alive) continue;
                ctx.fillStyle = rp.color || '#ff0000';
                const rx = rp.displayX !== undefined ? rp.displayX : rp.x;
                const ry = rp.displayY !== undefined ? rp.displayY : rp.y;
                ctx.fillRect(ox + rx * s - 1, oy + ry * s - 1, 3, 3);
            }
        }

        // Spieler als gruener Punkt
        const px = ox + player.x * s;
        const py = oy + player.y * s;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(px - 2, py - 2, 4, 4);
        ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + player.dirX * 8, py + player.dirY * 8);
        ctx.stroke();

        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        ctx.strokeRect(ox - 2, oy - 2, mapW + 4, mapH + 4);
        ctx.globalAlpha = 1.0;
    },

    // --- FPS-Zaehler ---
    _drawFPS(ctx, fps) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(5, 5, 70, 22);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px Courier New';
        ctx.fillText('FPS: ' + fps, 10, 21);
    },

    // === MULTIPLAYER HUD-ELEMENTE ===

    // --- Kill-Feed (unter der Minimap) ---
    _drawKillFeed(ctx, killFeed) {
        if (killFeed.length === 0) return;
        const now = Date.now();
        const x = Engine.screenWidth - 10;
        let y = MAP_HEIGHT * this.minimapScale + 24;

        const recent = killFeed.slice(-5);
        for (const k of recent) {
            const age = (now - k.time) / 5000;
            ctx.globalAlpha = Math.max(0.2, 1.0 - age);

            const text = k.killerName + ' > ' + k.victimName;
            const tw = ctx.measureText(text).width || 150;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x - tw - 16, y - 12, tw + 14, 16);

            ctx.font = '11px Courier New';
            ctx.fillStyle = '#ff8800';
            ctx.textAlign = 'right';
            ctx.fillText(text, x - 4, y);
            y += 18;
        }
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1.0;
    },

    // --- Chat-Nachrichten ---
    _drawChat(ctx, chatMessages) {
        const now = Date.now();
        const x = 10;
        let y = Engine.screenHeight - 90;
        const recent = chatMessages.filter(m => now - m.time < 10000).slice(-5);

        for (const msg of recent) {
            const age = (now - msg.time) / 10000;
            ctx.globalAlpha = Math.max(0.15, 1.0 - age * age);

            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(x - 2, y - 12, 320, 16);

            ctx.font = '11px Courier New';
            ctx.fillStyle = msg.color || '#fff';
            const prefix = msg.name + ': ';
            ctx.fillText(prefix, x, y);
            ctx.fillStyle = '#ddd';
            ctx.fillText(msg.message, x + ctx.measureText(prefix).width, y);
            y += 16;
        }
        ctx.globalAlpha = 1.0;
    },

    // --- Chat-Eingabefeld ---
    _drawChatInput(ctx) {
        const x = 10;
        const y = Engine.screenHeight - 20;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - 2, y - 14, 360, 20);
        ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
        ctx.strokeRect(x - 2, y - 14, 360, 20);

        ctx.fillStyle = '#ffcc00';
        ctx.font = '12px Courier New';
        const cursor = (Date.now() % 1000 < 500) ? '_' : '';
        ctx.fillText('> ' + Input.chatText + cursor, x + 2, y);
    },

    // --- Scoreboard (Tab-Taste) ---
    _drawScoreboard(ctx, scores) {
        const w = Engine.screenWidth;
        const h = Engine.screenHeight;
        const bw = 340;
        const lineH = 24;
        const bh = 65 + scores.length * lineH;
        const bx = (w - bw) / 2;
        const by = (h - bh) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Titel
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('DEATHMATCH', w / 2, by + 24);

        // Header
        ctx.fillStyle = '#888';
        ctx.font = '11px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('SPIELER', bx + 15, by + 46);
        ctx.textAlign = 'right';
        ctx.fillText('KILLS', bx + bw - 65, by + 46);
        ctx.fillText('TODE', bx + bw - 15, by + 46);

        // Trennlinie
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 10, by + 52);
        ctx.lineTo(bx + bw - 10, by + 52);
        ctx.stroke();

        // Spieler-Zeilen
        let ly = by + 68;
        for (const s of scores) {
            if (s.isLocal) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
                ctx.fillRect(bx + 2, ly - 15, bw - 4, lineH);
            }
            ctx.fillStyle = s.color;
            ctx.font = s.isLocal ? 'bold 13px Courier New' : '13px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText(s.name, bx + 15, ly + 1);
            ctx.fillStyle = '#ddd';
            ctx.textAlign = 'right';
            ctx.fillText(s.kills.toString(), bx + bw - 70, ly + 1);
            ctx.fillText(s.deaths.toString(), bx + bw - 20, ly + 1);
            ly += lineH;
        }
        ctx.textAlign = 'left';
    },

    // --- MP Tod-Bildschirm ---
    _drawMPDeath(ctx) {
        const w = Engine.screenWidth, h = Engine.screenHeight;
        ctx.fillStyle = 'rgba(100, 0, 0, 0.5)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 44px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('ELIMINIERT', w / 2, h / 2 - 15);
        ctx.fillStyle = '#cc8800';
        ctx.font = '18px Courier New';
        ctx.fillText('Respawn in Kuerze...', w / 2, h / 2 + 20);
        ctx.textAlign = 'left';
    },

    // --- SP Game-Over ---
    _drawGameOver(ctx) {
        const w = Engine.screenWidth, h = Engine.screenHeight;
        ctx.fillStyle = 'rgba(100, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 56px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', w / 2, h / 2 - 20);
        ctx.fillStyle = '#cc0000';
        ctx.font = '20px Courier New';
        ctx.fillText('Klicke zum Neustarten', w / 2, h / 2 + 30);
        ctx.textAlign = 'left';
    }
};
