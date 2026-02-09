// ============================================
// renderer.js - Zeichnet alles auf den Canvas
// Erweitert um Multiplayer-Sprites und Nametags
// ============================================

const Renderer = {
    canvas: null,
    ctx: null,
    width: 640,
    height: 480,
    screenImageData: null,
    screenBuf: null,
    enemySprite: null,
    enemyHurtSprite: null,
    pickupSprite: null,
    _playerSpriteCache: {}, // Farbe -> Canvas (gecacht)

    // Renderer initialisieren
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.screenImageData = this.ctx.createImageData(this.width, this.height);
        this.screenBuf = this.screenImageData.data;
        this._createSprites();
    },

    // SP-Sprites vorrendern (Gegner + Pickups)
    _createSprites() {
        // --- Gegner-Sprite (64x64, gruener Soldat) ---
        this.enemySprite = this._createSpriteCanvas(64, 64, (ctx) => {
            ctx.fillStyle = '#2a7a2a';
            ctx.fillRect(18, 22, 28, 30);
            ctx.fillRect(10, 24, 44, 10);
            ctx.fillStyle = '#3a9a3a';
            ctx.beginPath(); ctx.arc(32, 16, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1a5a1a';
            ctx.fillRect(21, 6, 22, 10);
            ctx.fillRect(19, 10, 26, 4);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(26, 14, 4, 3);
            ctx.fillRect(34, 14, 4, 3);
            ctx.fillStyle = '#1a5a1a';
            ctx.fillRect(20, 52, 10, 12);
            ctx.fillRect(34, 52, 10, 12);
            ctx.fillStyle = '#444';
            ctx.fillRect(48, 28, 12, 4);
            ctx.fillRect(54, 26, 4, 8);
        });

        // --- Gegner bei Treffer (rot getoent) ---
        this.enemyHurtSprite = this._createSpriteCanvas(64, 64, (ctx) => {
            ctx.fillStyle = '#aa3333';
            ctx.fillRect(18, 22, 28, 30);
            ctx.fillRect(10, 24, 44, 10);
            ctx.fillStyle = '#cc4444';
            ctx.beginPath(); ctx.arc(32, 16, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#882222';
            ctx.fillRect(21, 6, 22, 10);
            ctx.fillRect(19, 10, 26, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(26, 14, 4, 3);
            ctx.fillRect(34, 14, 4, 3);
            ctx.fillStyle = '#882222';
            ctx.fillRect(20, 52, 10, 12);
            ctx.fillRect(34, 52, 10, 12);
            ctx.fillStyle = '#666';
            ctx.fillRect(48, 28, 12, 4);
        });

        // --- Health-Pickup-Sprite (32x32) ---
        this.pickupSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#dd2222';
            ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#991111'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(10, 13, 12, 6);
            ctx.fillRect(13, 10, 6, 12);
        });
    },

    // Hilfs-Canvas fuer Sprite erzeugen
    _createSpriteCanvas(w, h, drawFunc) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        drawFunc(c.getContext('2d'));
        return c;
    },

    // Farbiges Spieler-Sprite erzeugen oder aus Cache holen
    _getPlayerSprite(hexColor) {
        if (this._playerSpriteCache[hexColor]) return this._playerSpriteCache[hexColor];

        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        const sprite = this._createSpriteCanvas(64, 64, (ctx) => {
            const dark = `rgb(${Math.max(0,r-60)},${Math.max(0,g-60)},${Math.max(0,b-60)})`;
            const light = `rgb(${Math.min(255,r+40)},${Math.min(255,g+40)},${Math.min(255,b+40)})`;
            // Koerper
            ctx.fillStyle = hexColor;
            ctx.fillRect(18, 22, 28, 30);
            ctx.fillRect(10, 24, 44, 10);
            // Kopf
            ctx.fillStyle = light;
            ctx.beginPath(); ctx.arc(32, 16, 11, 0, Math.PI * 2); ctx.fill();
            // Helm
            ctx.fillStyle = dark;
            ctx.fillRect(21, 6, 22, 10);
            ctx.fillRect(19, 10, 26, 4);
            // Augen
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(26, 14, 4, 3);
            ctx.fillRect(34, 14, 4, 3);
            // Beine
            ctx.fillStyle = dark;
            ctx.fillRect(20, 52, 10, 12);
            ctx.fillRect(34, 52, 10, 12);
            // Waffe
            ctx.fillStyle = '#444';
            ctx.fillRect(48, 28, 12, 4);
            ctx.fillRect(54, 26, 4, 8);
        });

        this._playerSpriteCache[hexColor] = sprite;
        return sprite;
    },

    // ============================================
    // Haupt-Renderfunktion pro Frame
    // remotePlayers: Array von Remote-Spieler-Objekten (MP)
    // ============================================
    renderFrame(player, enemies, pickups, remotePlayers) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Raycasting
        const wallSlices = Engine.castRays(player);

        // Decke + Boden + Waende in Pixelpuffer
        this._drawWallsToBuffer(wallSlices);
        ctx.putImageData(this.screenImageData, 0, 0);

        // Sprites (Gegner + Remote-Spieler + Pickups)
        this._drawSprites(ctx, player, enemies, pickups, remotePlayers || []);

        // Waffe
        this._drawWeapon(ctx, player);

        // Schadensblitz
        if (player.damageFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${player.damageFlash * 0.35})`;
            ctx.fillRect(0, 0, w, h);
        }
    },

    // Decke, Boden und texturierte Waende in den Pixelpuffer zeichnen
    _drawWallsToBuffer(wallSlices) {
        const buf = this.screenBuf;
        const w = this.width;
        const h = this.height;
        const halfH = Math.floor(h / 2);

        for (let y = 0; y < h; y++) {
            const isCeiling = y < halfH;
            const r = isCeiling ? 80 : 50;
            const g = isCeiling ? 80 : 50;
            const b = isCeiling ? 90 : 50;
            const row = y * w * 4;
            for (let x = 0; x < w; x++) {
                const i = row + x * 4;
                buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
            }
        }

        for (let x = 0; x < w; x++) {
            const slice = wallSlices[x];
            if (!slice) continue;
            const tex = Engine.textures[slice.wallType];
            if (!tex) continue;

            const texData = tex.data;
            const texH = tex.height;
            const texW = tex.width;
            const texX = slice.texX;
            const lineH = slice.lineHeight;
            const step = texH / lineH;
            let texPos = (slice.drawStart - h / 2 + lineH / 2) * step;

            for (let y = slice.drawStart; y <= slice.drawEnd; y++) {
                const texY = Math.floor(texPos) & (texH - 1);
                texPos += step;
                const ti = (texY * texW + texX) * 4;
                let r = texData[ti], g = texData[ti+1], b = texData[ti+2];
                if (slice.side === 1) { r >>= 1; g >>= 1; b >>= 1; }
                const si = (y * w + x) * 4;
                buf[si] = r; buf[si+1] = g; buf[si+2] = b; buf[si+3] = 255;
            }
        }
    },

    // Alle Sprites als Billboards zeichnen (Gegner, Spieler, Pickups)
    _drawSprites(ctx, player, enemies, pickups, remotePlayers) {
        const sprites = [];

        // --- Gegner (Singleplayer) ---
        for (const e of enemies) {
            if (!e.alive) continue;
            const dx = e.x - player.x, dy = e.y - player.y;
            sprites.push({
                x: e.x, y: e.y,
                dist: dx * dx + dy * dy,
                sprite: e.hurtTimer > 0 ? this.enemyHurtSprite : this.enemySprite
            });
        }

        // --- Remote-Spieler (Multiplayer) ---
        for (const rp of remotePlayers) {
            if (!rp.alive) continue;
            const px = rp.displayX !== undefined ? rp.displayX : rp.x;
            const py = rp.displayY !== undefined ? rp.displayY : rp.y;
            const dx = px - player.x, dy = py - player.y;
            sprites.push({
                x: px, y: py,
                dist: dx * dx + dy * dy,
                sprite: this._getPlayerSprite(rp.color || '#ff4444'),
                name: rp.name,
                nameColor: rp.color
            });
        }

        // --- Pickups ---
        for (const p of pickups) {
            if (!p.active) continue;
            const dx = p.x - player.x, dy = p.y - player.y;
            sprites.push({
                x: p.x, y: p.y,
                dist: dx * dx + dy * dy,
                sprite: this.pickupSprite,
                yOffset: Math.sin(Date.now() * 0.003 + p.bobPhase) * 0.1
            });
        }

        // Nach Entfernung sortieren (weit -> nah)
        sprites.sort((a, b) => b.dist - a.dist);

        const w = this.width;
        const h = this.height;
        const zBuf = Engine.zBuffer;

        for (const s of sprites) {
            const sx = s.x - player.x;
            const sy = s.y - player.y;

            // Transformation in Kameraraum
            const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
            const transformX = invDet * (player.dirY * sx - player.dirX * sy);
            const transformY = invDet * (-player.planeY * sx + player.planeX * sy);

            if (transformY <= 0.1) continue;

            const screenX = Math.floor(w / 2 * (1 + transformX / transformY));
            const spriteHeight = Math.abs(Math.floor(h / transformY));
            const spriteWidth = spriteHeight;
            const yOff = s.yOffset ? Math.floor(s.yOffset * h / transformY) : 0;

            const drawStartY = Math.max(0, Math.floor(-spriteHeight / 2 + h / 2 + yOff));
            const drawEndY = Math.min(h - 1, Math.floor(spriteHeight / 2 + h / 2 + yOff));
            const drawStartX = Math.max(0, Math.floor(-spriteWidth / 2 + screenX));
            const drawEndX = Math.min(w - 1, Math.floor(spriteWidth / 2 + screenX));

            const spriteW = s.sprite.width;
            const spriteH = s.sprite.height;

            let visibleCols = 0;
            for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
                const texX = Math.floor((stripe - (screenX - spriteWidth / 2)) * spriteW / spriteWidth);
                if (transformY < zBuf[stripe] && texX >= 0 && texX < spriteW) {
                    ctx.drawImage(
                        s.sprite,
                        texX, 0, 1, spriteH,
                        stripe, drawStartY, 1, drawEndY - drawStartY
                    );
                    visibleCols++;
                }
            }

            // Nametag ueber sichtbaren Spielern zeichnen
            if (s.name && visibleCols > 0 && transformY < 20) {
                ctx.font = 'bold 11px Courier New';
                ctx.textAlign = 'center';
                const tagY = Math.max(14, drawStartY - 8);
                // Schwarzer Rand fuer Lesbarkeit
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText(s.name, screenX, tagY);
                // Farbiger Text
                ctx.fillStyle = s.nameColor || '#fff';
                ctx.fillText(s.name, screenX, tagY);
                ctx.textAlign = 'left';
            }
        }
    },

    // Waffe am unteren Bildschirmrand zeichnen
    _drawWeapon(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 120;
        const bobX = Math.sin(player.weaponBob) * 6;
        const bobY = Math.abs(Math.cos(player.weaponBob)) * 4;
        const kickY = player.weaponKick * 30;
        const wx = cx + bobX - 32;
        const wy = baseY + bobY + kickY;

        // Muendungsfeuer
        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 25, 22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff44';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 25, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 25, 4, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 22, wy - 20, 20, 12);
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(wx + 16, wy - 8, 32, 14);
        ctx.fillStyle = '#505050';
        ctx.fillRect(wx + 18, wy - 6, 28, 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(wx + 24, wy + 6); ctx.lineTo(wx + 24, wy + 18);
        ctx.lineTo(wx + 34, wy + 18); ctx.lineTo(wx + 34, wy + 10);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(wx + 22, wy + 6, 18, 35);
        ctx.fillStyle = '#3a2518';
        for (let i = 0; i < 5; i++) ctx.fillRect(wx + 23, wy + 10 + i * 6, 16, 1);
        ctx.fillStyle = '#111';
        ctx.fillRect(wx + 40, wy - 18, 4, 8);
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 18, wy + 20, 26, 16);
        ctx.fillRect(wx + 14, wy + 24, 8, 12);
    }
};
