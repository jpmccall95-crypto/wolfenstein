// ============================================
// hud.js - HUD-Elemente
// Minimap, Health, Gold, Waffe, Crosshair, FPS
// Multiplayer: Scoreboard, Kill-Feed, Chat
// Co-op: Wellen-Anzeige, Countdown
// Tueren: Interaktionshinweis
// ============================================

const HUD = {
    minimapScale: 4,
    minimapAlpha: 0.75,

    // Alle HUD-Elemente zeichnen
    // net = Network-Objekt (oder null fuer Singleplayer)
    draw(ctx, player, enemies, fps, net, pickups) {
        this._drawCrosshair(ctx);
        this._drawHealth(ctx, player);
        this._drawGold(ctx, player);
        this._drawWeaponIndicator(ctx, player);
        this._drawMinimap(ctx, player, enemies, net);
        this._drawFPS(ctx, fps);

        // Tuer-Interaktionshinweis
        this._drawInteractHint(ctx, player);

        // Waffen-Kauf-Hinweis
        if (pickups) {
            this._drawPurchaseHint(ctx, player, pickups);
        }

        // --- Multiplayer-HUD ---
        if (net && net.connected) {
            this._drawKillFeed(ctx, net.killFeed);
            this._drawChat(ctx, net.chatMessages);

            if (Input.chatActive) {
                this._drawChatInput(ctx);
            }

            if (Input.showScoreboard) {
                this._drawScoreboard(ctx, net.getScoreboard(), net.gameMode);
            }

            // Co-op: Wellen-Anzeige
            if (net.gameMode === 'coop') {
                this._drawWaveInfo(ctx, net);
            }

            // Tod-Bildschirme
            if (!player.alive) {
                if (net.coopGameOver) {
                    this._drawCoopGameOver(ctx, net.coopWave);
                } else {
                    this._drawMPDeath(ctx, net);
                }
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
        const barW = 140, barH = 20;
        const pct = player.health / player.maxHealth;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 5, y - 25, barW + 70, 55);

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

    // --- Gold-Anzeige ---
    _drawGold(ctx, player) {
        const x = 240, y = Engine.screenHeight - 50;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 5, y - 25, 80, 55);

        ctx.fillStyle = '#ffcc00';
        ctx.font = '12px Courier New';
        ctx.fillText('GOLD', x, y - 8);

        ctx.font = 'bold 20px Courier New';
        ctx.fillText(player.gold.toString(), x, y + 17);
    },

    // --- Aktuelle Waffe (unten rechts) ---
    _drawWeaponIndicator(ctx, player) {
        const wp = player.weapons[player.currentWeapon];
        if (!wp) return;
        const x = Engine.screenWidth - 180;
        const y = Engine.screenHeight - 50;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 5, y - 25, 175, 55);

        ctx.fillStyle = '#aaa';
        ctx.font = '12px Courier New';
        ctx.fillText('WAFFE', x, y - 8);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText(wp.name, x, y + 10);

        // Tasten-Hinweis
        ctx.fillStyle = '#555';
        ctx.font = '9px Courier New';
        const hints = [];
        if (player.weapons.pistol.owned) hints.push('1-Pist');
        if (player.weapons.shotgun.owned) hints.push('2-Schrot');
        if (player.weapons.machinegun.owned) hints.push('3-MG');
        ctx.fillText(hints.join(' '), x, y + 26);
    },

    // --- Interaktionshinweis (Tuer vor dem Spieler) ---
    _drawInteractHint(ctx, player) {
        if (!player.alive) return;
        if (typeof Doors === 'undefined') return;

        for (const dist of [0.8, 1.5]) {
            const mx = Math.floor(player.x + player.dirX * dist);
            const my = Math.floor(player.y + player.dirY * dist);
            const door = Doors.getDoor(mx, my);
            if (door && door.state === 'closed') {
                const w = Engine.screenWidth;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(w / 2 - 80, Engine.screenHeight / 2 + 30, 160, 24);
                ctx.fillStyle = '#ffcc00';
                ctx.font = '13px Courier New';
                ctx.textAlign = 'center';
                const label = (door.type === 6) ? '[E] Wand untersuchen' : '[E] Tuer oeffnen';
                ctx.fillText(label, w / 2, Engine.screenHeight / 2 + 47);
                ctx.textAlign = 'left';
                return;
            }
        }
    },

    // --- Waffen-Kauf-Hinweis ---
    _drawPurchaseHint(ctx, player, pickups) {
        for (const p of pickups) {
            if (!p.active || !p.weaponType) continue;
            const dx = p.x - player.x, dy = p.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 2.0) {
                const wp = player.weapons[p.weaponType];
                if (wp && !wp.owned) {
                    const w = Engine.screenWidth;
                    const cy = Engine.screenHeight / 2;
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(w / 2 - 110, cy + 55, 220, 24);
                    ctx.textAlign = 'center';
                    const canAfford = player.gold >= p.weaponCost;
                    ctx.fillStyle = canAfford ? '#44ff44' : '#ff4444';
                    ctx.font = '12px Courier New';
                    const text = wp.name + ': ' + p.weaponCost + ' Gold'
                        + (canAfford ? '' : ' (zu wenig!)');
                    ctx.fillText(text, w / 2, cy + 72);
                    ctx.textAlign = 'left';
                    return;
                }
            }
        }
    },

    // --- Minimap ---
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
                    case 5: // Normale Tuer
                        // Offene Tueren anders darstellen
                        if (typeof Doors !== 'undefined') {
                            const door = Doors.getDoor(x, y);
                            ctx.fillStyle = (door && door.progress > 0.5) ? '#443311' : '#886622';
                        } else {
                            ctx.fillStyle = '#886622';
                        }
                        break;
                    case 6: // Geheimtuer: gleiche Farbe wie umgebende Wand
                        ctx.fillStyle = '#888';
                        break;
                    default: ctx.fillStyle = '#666';
                }
                ctx.fillRect(ox + x * s, oy + y * s, s, s);
            }
        }

        // SP-Gegner oder Co-op-Gegner als rote Punkte
        ctx.fillStyle = '#ff0000';
        for (const e of enemies) {
            if (!e.alive) continue;
            const ex = e.displayX !== undefined ? e.displayX : e.x;
            const ey = e.displayY !== undefined ? e.displayY : e.y;
            ctx.fillRect(ox + ex * s - 1, oy + ey * s - 1, 3, 3);
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

            // Co-op Pickups als gruene Punkte
            if (net.gameMode === 'coop') {
                ctx.fillStyle = '#44ff44';
                for (const pk of net.coopPickups) {
                    ctx.fillRect(ox + pk.x * s - 1, oy + pk.y * s - 1, 3, 3);
                }
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
            ctx.font = '11px Courier New';
            const tw = ctx.measureText(text).width || 150;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x - tw - 16, y - 12, tw + 14, 16);

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
        let y = Engine.screenHeight - 110;
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

    // --- Scoreboard (Tab-Taste) mit Ping ---
    _drawScoreboard(ctx, scores, gameMode) {
        const w = Engine.screenWidth;
        const h = Engine.screenHeight;
        const bw = 400;
        const lineH = 24;
        const bh = 65 + scores.length * lineH;
        const bx = (w - bw) / 2;
        const by = (h - bh) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        const title = gameMode === 'coop' ? 'CO-OP' : 'DEATHMATCH';
        ctx.fillText(title, w / 2, by + 24);

        ctx.fillStyle = '#888';
        ctx.font = '11px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('SPIELER', bx + 15, by + 46);
        ctx.textAlign = 'right';
        ctx.fillText('KILLS', bx + bw - 115, by + 46);
        ctx.fillText('TODE', bx + bw - 60, by + 46);
        ctx.fillText('PING', bx + bw - 15, by + 46);

        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 10, by + 52);
        ctx.lineTo(bx + bw - 10, by + 52);
        ctx.stroke();

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
            ctx.fillText(s.kills.toString(), bx + bw - 115, ly + 1);
            ctx.fillText(s.deaths.toString(), bx + bw - 60, ly + 1);
            const pingText = typeof s.ping === 'number' ? s.ping + 'ms' : s.ping;
            ctx.fillText(pingText, bx + bw - 15, ly + 1);
            ly += lineH;
        }
        ctx.textAlign = 'left';
    },

    // === CO-OP HUD ===

    // --- Wellen-Anzeige (oben mittig) ---
    _drawWaveInfo(ctx, net) {
        const w = Engine.screenWidth;

        if (net.coopBetweenWaves && net.coopCountdown > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(w / 2 - 130, 35, 260, 50);

            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            if (net.coopWave === 0) {
                ctx.fillText('SPIEL STARTET IN', w / 2, 55);
            } else {
                ctx.fillText('NAECHSTE WELLE IN', w / 2, 55);
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px Courier New';
            ctx.fillText(Math.ceil(net.coopCountdown).toString(), w / 2, 78);
            ctx.textAlign = 'left';
        } else if (net.coopWave > 0) {
            const isBossWave = net.coopWave % 5 === 0;
            const bossAlive = net.coopEnemies.some(e => e.boss && e.alive);

            ctx.fillStyle = isBossWave ? 'rgba(80, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(w / 2 - 80, 35, 160, 24);

            ctx.fillStyle = isBossWave ? '#ff4444' : '#ffcc00';
            ctx.font = 'bold 14px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText((isBossWave ? 'BOSS ' : '') + 'WELLE ' + net.coopWave, w / 2, 52);

            const alive = net.coopEnemies.filter(e => e.alive).length;
            if (alive > 0) {
                ctx.fillStyle = '#ff4444';
                ctx.font = '12px Courier New';
                const bossText = bossAlive ? ' (+ BOSS)' : '';
                ctx.fillText(alive + ' Gegner' + bossText, w / 2, 70);
            }
            ctx.textAlign = 'left';
        }
    },

    // --- Co-op Game Over ---
    _drawCoopGameOver(ctx, wave) {
        const w = Engine.screenWidth, h = Engine.screenHeight;
        ctx.fillStyle = 'rgba(100, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', w / 2, h / 2 - 30);

        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 24px Courier New';
        ctx.fillText('Welle ' + wave + ' erreicht', w / 2, h / 2 + 15);

        ctx.fillStyle = '#888';
        ctx.font = '14px Courier New';
        ctx.fillText('Zurueck zur Lobby...', w / 2, h / 2 + 50);
        ctx.textAlign = 'left';
    },

    // --- MP Tod-Bildschirm ---
    _drawMPDeath(ctx, net) {
        const w = Engine.screenWidth, h = Engine.screenHeight;
        ctx.fillStyle = 'rgba(100, 0, 0, 0.5)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 40px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('ELIMINIERT', w / 2, h / 2 - 25);

        if (net.lastKillerName) {
            ctx.fillStyle = '#ff8800';
            ctx.font = '16px Courier New';
            ctx.fillText('von ' + net.lastKillerName, w / 2, h / 2 + 5);
        }

        const elapsed = (Date.now() - net.deathTime) / 1000;
        const respawnTime = net.gameMode === 'coop' ? 5 : 3;
        const remaining = Math.max(0, respawnTime - elapsed);
        if (remaining > 0) {
            ctx.fillStyle = '#cc8800';
            ctx.font = '18px Courier New';
            ctx.fillText('Respawn in ' + Math.ceil(remaining) + '...', w / 2, h / 2 + 35);
        } else {
            ctx.fillStyle = '#cc8800';
            ctx.font = '18px Courier New';
            ctx.fillText('Respawn...', w / 2, h / 2 + 35);
        }
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
