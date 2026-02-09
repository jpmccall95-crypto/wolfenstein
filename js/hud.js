// ============================================
// hud.js - HUD-Elemente (Minimap, Health, etc.)
// ============================================

const HUD = {
    minimapScale: 4,    // Pixel pro Kartenzelle
    minimapAlpha: 0.75, // Transparenz der Minimap

    // Alle HUD-Elemente zeichnen
    draw(ctx, player, enemies, fps) {
        this._drawCrosshair(ctx);
        this._drawHealth(ctx, player);
        this._drawMinimap(ctx, player, enemies);
        this._drawFPS(ctx, fps);

        // Game-Over-Anzeige
        if (!player.alive) {
            this._drawGameOver(ctx);
        }
    },

    // Fadenkreuz in der Bildschirmmitte
    _drawCrosshair(ctx) {
        const cx = Engine.screenWidth / 2;
        const cy = Engine.screenHeight / 2;
        const size = 10;
        const gap = 3;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;

        // Vier Linien des Fadenkreuzes
        ctx.beginPath();
        ctx.moveTo(cx - size, cy); ctx.lineTo(cx - gap, cy);
        ctx.moveTo(cx + gap, cy);  ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size); ctx.lineTo(cx, cy - gap);
        ctx.moveTo(cx, cy + gap);  ctx.lineTo(cx, cy + size);
        ctx.stroke();

        // Mittelpunkt
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, cy - 1, 2, 2);

        ctx.globalAlpha = 1.0;
    },

    // Gesundheitsanzeige (Zahl + Balken)
    _drawHealth(ctx, player) {
        const x = 20;
        const y = Engine.screenHeight - 50;
        const barW = 160;
        const barH = 20;
        const pct = player.health / player.maxHealth;

        // Hintergrund
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 5, y - 25, barW + 80, 55);

        // Label
        ctx.fillStyle = '#aaa';
        ctx.font = '12px Courier New';
        ctx.fillText('HEALTH', x, y - 8);

        // Balken-Hintergrund
        ctx.fillStyle = '#330000';
        ctx.fillRect(x, y, barW, barH);

        // Balken (Farbe je nach Gesundheit)
        let barColor;
        if (pct > 0.6) barColor = '#22aa22';
        else if (pct > 0.3) barColor = '#ccaa00';
        else barColor = '#cc2222';

        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barW * pct, barH);

        // Balken-Rand
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barW, barH);

        // Zahlenwert
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Courier New';
        ctx.fillText(player.health.toString(), x + barW + 10, y + 17);
    },

    // Minimap (Draufsicht in der Ecke)
    _drawMinimap(ctx, player, enemies) {
        const s = this.minimapScale;
        const mapW = MAP_WIDTH * s;
        const mapH = MAP_HEIGHT * s;
        const ox = Engine.screenWidth - mapW - 10; // Oben rechts
        const oy = 10;

        ctx.globalAlpha = this.minimapAlpha;

        // Hintergrund
        ctx.fillStyle = '#000';
        ctx.fillRect(ox - 2, oy - 2, mapW + 4, mapH + 4);

        // Kartenzellen zeichnen
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const tile = MAP_DATA[y][x];
                if (tile === 0) continue;

                switch (tile) {
                    case 1: ctx.fillStyle = '#888'; break; // Stein
                    case 2: ctx.fillStyle = '#a44'; break; // Backstein
                    case 3: ctx.fillStyle = '#864'; break; // Holz
                    case 4: ctx.fillStyle = '#44a'; break; // Metall
                    default: ctx.fillStyle = '#666';
                }
                ctx.fillRect(ox + x * s, oy + y * s, s, s);
            }
        }

        // Gegner als rote Punkte
        ctx.fillStyle = '#ff0000';
        for (const e of enemies) {
            if (!e.alive) continue;
            ctx.fillRect(ox + e.x * s - 1, oy + e.y * s - 1, 3, 3);
        }

        // Spieler als gruener Punkt mit Blickrichtung
        const px = ox + player.x * s;
        const py = oy + player.y * s;

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(px - 2, py - 2, 4, 4);

        // Blickrichtung als Linie
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + player.dirX * 8, py + player.dirY * 8);
        ctx.stroke();

        // Rahmen
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox - 2, oy - 2, mapW + 4, mapH + 4);

        ctx.globalAlpha = 1.0;
    },

    // FPS-Zaehler oben links
    _drawFPS(ctx, fps) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(5, 5, 70, 22);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px Courier New';
        ctx.fillText('FPS: ' + fps, 10, 21);
    },

    // Game-Over-Bildschirm
    _drawGameOver(ctx) {
        const w = Engine.screenWidth;
        const h = Engine.screenHeight;

        // Roter Overlay
        ctx.fillStyle = 'rgba(100, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);

        // Text
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 56px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', w / 2, h / 2 - 20);

        ctx.fillStyle = '#cc0000';
        ctx.font = '20px Courier New';
        ctx.fillText('Klicke zum Neustarten', w / 2, h / 2 + 30);

        ctx.textAlign = 'left'; // Zuruecksetzen
    }
};
