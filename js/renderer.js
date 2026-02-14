// ============================================
// renderer.js - Zeichnet alles auf den Canvas
// Erweitert um Multiplayer-Sprites, Nametags,
// Gold/Waffen-Pickups und 3 Waffen-Grafiken
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
    bossSprite: null,
    bossHurtSprite: null,
    pickupSprite: null,
    goldSprite: null,
    treasureSprite: null,
    shotgunSprite: null,
    smgSprite: null,
    mgSprite: null,
    sniperSprite: null,
    flamethrowerSprite: null,
    launcherSprite: null,
    railgunSprite: null,
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

    // Sprites vorrendern
    _createSprites() {
        // --- Gegner-Sprite (64x64, brauner Soldat mit Stahlhelm) ---
        // Deutlich anders als Spieler-Sprites (die bunt/farbig sind)
        this.enemySprite = this._createSpriteCanvas(64, 64, (ctx) => {
            // Koerper (braun/khaki Uniform)
            ctx.fillStyle = '#6b5a3a';
            ctx.fillRect(18, 22, 28, 30);
            ctx.fillRect(10, 24, 44, 10);
            // Schulterpolster (dunkler)
            ctx.fillStyle = '#5a4a2a';
            ctx.fillRect(8, 22, 8, 12);
            ctx.fillRect(48, 22, 8, 12);
            // Kopf (haut)
            ctx.fillStyle = '#c4956a';
            ctx.beginPath(); ctx.arc(32, 16, 10, 0, Math.PI * 2); ctx.fill();
            // Stahlhelm (dunkelgrau, kantiger)
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(19, 4, 26, 12);
            ctx.fillRect(17, 8, 30, 6);
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(20, 14, 24, 3); // Helmrand/Schatten
            // Augen (rot leuchtend - boese!)
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(26, 13, 4, 3);
            ctx.fillRect(34, 13, 4, 3);
            // Mund (dunkler Schlitz)
            ctx.fillStyle = '#3a2518';
            ctx.fillRect(28, 20, 8, 2);
            // Guertel
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(18, 40, 28, 3);
            ctx.fillStyle = '#ccaa00';
            ctx.fillRect(29, 39, 6, 5); // Guertelschnalle gold
            // Stiefel (schwarz)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(20, 52, 10, 12);
            ctx.fillRect(34, 52, 10, 12);
            // Waffe (Gewehr, dunkel)
            ctx.fillStyle = '#333';
            ctx.fillRect(48, 26, 14, 4);
            ctx.fillRect(56, 24, 4, 8);
            ctx.fillStyle = '#4a3020';
            ctx.fillRect(48, 30, 8, 6); // Holzschaft
        });

        // --- Gegner bei Treffer (rot aufblitzend) ---
        this.enemyHurtSprite = this._createSpriteCanvas(64, 64, (ctx) => {
            // Koerper rot
            ctx.fillStyle = '#aa3333';
            ctx.fillRect(18, 22, 28, 30);
            ctx.fillRect(10, 24, 44, 10);
            ctx.fillStyle = '#993322';
            ctx.fillRect(8, 22, 8, 12);
            ctx.fillRect(48, 22, 8, 12);
            // Kopf
            ctx.fillStyle = '#dd7755';
            ctx.beginPath(); ctx.arc(32, 16, 10, 0, Math.PI * 2); ctx.fill();
            // Helm rot
            ctx.fillStyle = '#882222';
            ctx.fillRect(19, 4, 26, 12);
            ctx.fillRect(17, 8, 30, 6);
            ctx.fillStyle = '#771111';
            ctx.fillRect(20, 14, 24, 3);
            // Augen weiss (Schmerz)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(26, 13, 4, 3);
            ctx.fillRect(34, 13, 4, 3);
            // Guertel
            ctx.fillStyle = '#661111';
            ctx.fillRect(18, 40, 28, 3);
            // Stiefel
            ctx.fillStyle = '#551111';
            ctx.fillRect(20, 52, 10, 12);
            ctx.fillRect(34, 52, 10, 12);
            // Waffe
            ctx.fillStyle = '#666';
            ctx.fillRect(48, 26, 14, 4);
        });

        // --- Boss-Sprite (64x64, dunkelviolett/rot, groesser wirkend) ---
        this.bossSprite = this._createSpriteCanvas(64, 64, (ctx) => {
            // Koerper (breit, dunkelviolett)
            ctx.fillStyle = '#5a1a5a';
            ctx.fillRect(12, 18, 40, 34);
            ctx.fillRect(4, 20, 56, 14);
            // Kopf
            ctx.fillStyle = '#7a2a7a';
            ctx.beginPath(); ctx.arc(32, 14, 13, 0, Math.PI * 2); ctx.fill();
            // Helm/Hoerner
            ctx.fillStyle = '#3a0a3a';
            ctx.fillRect(16, 2, 32, 12);
            ctx.fillRect(12, 6, 8, 10);
            ctx.fillRect(44, 6, 8, 10);
            // Augen (gelb, boese)
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(24, 12, 5, 4);
            ctx.fillRect(35, 12, 5, 4);
            // Beine
            ctx.fillStyle = '#3a0a3a';
            ctx.fillRect(16, 52, 12, 12);
            ctx.fillRect(36, 52, 12, 12);
            // Waffe (gross)
            ctx.fillStyle = '#666';
            ctx.fillRect(52, 24, 12, 6);
            ctx.fillRect(56, 20, 4, 14);
        });

        // --- Boss bei Treffer ---
        this.bossHurtSprite = this._createSpriteCanvas(64, 64, (ctx) => {
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(12, 18, 40, 34);
            ctx.fillRect(4, 20, 56, 14);
            ctx.fillStyle = '#ee4444';
            ctx.beginPath(); ctx.arc(32, 14, 13, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#aa1111';
            ctx.fillRect(16, 2, 32, 12);
            ctx.fillRect(12, 6, 8, 10);
            ctx.fillRect(44, 6, 8, 10);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(24, 12, 5, 4);
            ctx.fillRect(35, 12, 5, 4);
            ctx.fillStyle = '#aa1111';
            ctx.fillRect(16, 52, 12, 12);
            ctx.fillRect(36, 52, 12, 12);
            ctx.fillStyle = '#888';
            ctx.fillRect(52, 24, 12, 6);
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

        // --- Gold-Pickup-Sprite (32x32, Goldmuenzen) ---
        this.goldSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(16, 18, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffdd44';
            ctx.beginPath(); ctx.arc(14, 15, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff8cc';
            ctx.beginPath(); ctx.arc(12, 12, 4, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(16, 18, 12, 0, Math.PI * 2); ctx.stroke();
        });

        // --- Grosser Schatz-Sprite (32x32, Truhe) ---
        this.treasureSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(4, 12, 24, 16);
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(4, 8, 24, 8);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(13, 10, 6, 4);
            ctx.fillRect(6, 14, 20, 2);
            ctx.fillStyle = '#FFCC00';
            ctx.fillRect(8, 6, 16, 6);
            ctx.fillStyle = '#FFF8DC';
            ctx.fillRect(12, 4, 8, 4);
        });

        // --- Shotgun-Pickup-Sprite (32x32) ---
        this.shotgunSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#555';
            ctx.fillRect(4, 14, 24, 5);
            ctx.fillStyle = '#6B4226';
            ctx.fillRect(2, 16, 12, 8);
            ctx.fillStyle = '#333';
            ctx.fillRect(24, 13, 6, 7);
            // Gelber Rand als Highlight
            ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
            ctx.strokeRect(1, 12, 30, 14);
        });

        // --- SMG-Pickup-Sprite (32x32) ---
        this.smgSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#555';
            ctx.fillRect(4, 14, 22, 4);
            ctx.fillStyle = '#444';
            ctx.fillRect(22, 12, 6, 8);
            ctx.fillStyle = '#6B4226';
            ctx.fillRect(10, 18, 8, 6);
            ctx.fillStyle = '#333';
            ctx.fillRect(6, 18, 4, 8);
            ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
            ctx.strokeRect(2, 11, 28, 16);
        });

        // --- MG-Pickup-Sprite (32x32) ---
        this.mgSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#444';
            ctx.fillRect(2, 14, 28, 4);
            ctx.fillRect(8, 10, 4, 12);
            ctx.fillStyle = '#333';
            ctx.fillRect(26, 12, 4, 8);
            ctx.fillStyle = '#6B4226';
            ctx.fillRect(12, 18, 10, 6);
            ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 1;
            ctx.strokeRect(1, 9, 30, 16);
        });

        // --- Sniper-Pickup-Sprite (32x32) ---
        this.sniperSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(2, 15, 28, 3);
            ctx.fillStyle = '#555';
            ctx.fillRect(24, 12, 6, 8);
            ctx.fillStyle = '#222';
            ctx.fillRect(6, 12, 3, 3); // Zielfernrohr
            ctx.fillStyle = '#6B4226';
            ctx.fillRect(14, 18, 8, 6);
            ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 1;
            ctx.strokeRect(1, 10, 30, 16);
        });

        // --- Flammenwerfer-Pickup-Sprite (32x32) ---
        this.flamethrowerSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#555';
            ctx.fillRect(4, 14, 20, 5);
            ctx.fillStyle = '#884400';
            ctx.fillRect(20, 12, 8, 8);
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(2, 12, 6, 4);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(0, 13, 4, 2);
            ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 1;
            ctx.strokeRect(1, 10, 30, 14);
        });

        // --- Raketenwerfer-Pickup-Sprite (32x32) ---
        this.launcherSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#3a5a3a';
            ctx.fillRect(2, 12, 28, 8);
            ctx.fillStyle = '#2a4a2a';
            ctx.fillRect(4, 10, 6, 12);
            ctx.fillStyle = '#555';
            ctx.fillRect(26, 13, 4, 6);
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(6, 16, 5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#88ff88'; ctx.lineWidth = 1;
            ctx.strokeRect(1, 9, 30, 14);
        });

        // --- Railgun-Pickup-Sprite (32x32) ---
        this.railgunSprite = this._createSpriteCanvas(32, 32, (ctx) => {
            ctx.fillStyle = '#2a2a5a';
            ctx.fillRect(2, 14, 28, 4);
            ctx.fillStyle = '#4444aa';
            ctx.fillRect(6, 11, 20, 10);
            ctx.fillStyle = '#6666ff';
            ctx.fillRect(10, 13, 12, 6);
            ctx.fillStyle = '#aaaaff';
            ctx.fillRect(14, 15, 4, 2);
            ctx.strokeStyle = '#6666ff'; ctx.lineWidth = 1;
            ctx.strokeRect(1, 9, 30, 14);
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
            ctx.fillStyle = hexColor;
            ctx.fillRect(18, 22, 28, 30);
            ctx.fillRect(10, 24, 44, 10);
            ctx.fillStyle = light;
            ctx.beginPath(); ctx.arc(32, 16, 11, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = dark;
            ctx.fillRect(21, 6, 22, 10);
            ctx.fillRect(19, 10, 26, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(26, 14, 4, 3);
            ctx.fillRect(34, 14, 4, 3);
            ctx.fillStyle = dark;
            ctx.fillRect(20, 52, 10, 12);
            ctx.fillRect(34, 52, 10, 12);
            ctx.fillStyle = '#444';
            ctx.fillRect(48, 28, 12, 4);
            ctx.fillRect(54, 26, 4, 8);
        });

        this._playerSpriteCache[hexColor] = sprite;
        return sprite;
    },

    // ============================================
    // Haupt-Renderfunktion pro Frame
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
            const r = isCeiling ? 80 : 30;
            const g = isCeiling ? 80 : 60;
            const b = isCeiling ? 90 : 30;
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

    // Alle Sprites als Billboards zeichnen
    _drawSprites(ctx, player, enemies, pickups, remotePlayers) {
        const sprites = [];

        // --- Gegner ---
        for (const e of enemies) {
            if (!e.alive) continue;
            const dx = e.x - player.x, dy = e.y - player.y;
            let sprite;
            if (e.boss) {
                sprite = e.hurtTimer > 0 ? this.bossHurtSprite : this.bossSprite;
            } else {
                sprite = e.hurtTimer > 0 ? this.enemyHurtSprite : this.enemySprite;
            }
            sprites.push({
                x: e.x, y: e.y,
                dist: dx * dx + dy * dy,
                sprite: sprite,
                scale: e.boss ? 1.6 : 1.0,
                bossHP: e.boss ? e.health : 0,
                bossMaxHP: e.boss ? e.maxHealth : 0
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

        // --- Pickups (verschiedene Sprites je nach Typ) ---
        for (const p of pickups) {
            if (!p.active) continue;
            const dx = p.x - player.x, dy = p.y - player.y;

            // Sprite basierend auf Typ waehlen
            let spriteImg = this.pickupSprite;
            if (p.type === 'gold') spriteImg = this.goldSprite;
            if (p.type === 'gold_big') spriteImg = this.treasureSprite;
            if (p.type === 'weapon_shotgun') spriteImg = this.shotgunSprite;
            if (p.type === 'weapon_smg') spriteImg = this.smgSprite;
            if (p.type === 'weapon_mg') spriteImg = this.mgSprite;
            if (p.type === 'weapon_sniper') spriteImg = this.sniperSprite;
            if (p.type === 'weapon_flamethrower') spriteImg = this.flamethrowerSprite;
            if (p.type === 'weapon_launcher') spriteImg = this.launcherSprite;
            if (p.type === 'weapon_railgun') spriteImg = this.railgunSprite;

            sprites.push({
                x: p.x, y: p.y,
                dist: dx * dx + dy * dy,
                sprite: spriteImg,
                yOffset: Math.sin(Date.now() * 0.003 + (p.bobPhase || 0)) * 0.1
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
            const scaleF = s.scale || 1.0;
            const spriteHeight = Math.abs(Math.floor(h / transformY * scaleF));
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

            // Boss-Lebensbalken ueber dem Boss
            if (s.bossHP > 0 && visibleCols > 0 && transformY < 25) {
                const barW = Math.min(80, spriteWidth * 0.8);
                const barH = 6;
                const barX = screenX - barW / 2;
                const barY = Math.max(8, drawStartY - 14);
                const hpRatio = s.bossHP / s.bossMaxHP;
                // Hintergrund
                ctx.fillStyle = '#000';
                ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
                // HP-Balken (rot -> gelb -> gruen)
                ctx.fillStyle = hpRatio > 0.5 ? '#ff4400' : '#ff0000';
                ctx.fillRect(barX, barY, barW * hpRatio, barH);
                // Text
                ctx.font = 'bold 9px Courier New';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('BOSS', screenX, barY - 2);
                ctx.textAlign = 'left';
            }

            // Nametag ueber sichtbaren Spielern zeichnen
            if (s.name && visibleCols > 0 && transformY < 20) {
                ctx.font = 'bold 11px Courier New';
                ctx.textAlign = 'center';
                const tagY = Math.max(14, drawStartY - 8);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText(s.name, screenX, tagY);
                ctx.fillStyle = s.nameColor || '#fff';
                ctx.fillText(s.name, screenX, tagY);
                ctx.textAlign = 'left';
            }
        }
    },

    // ============================================
    // Waffen-Rendering (verschiedene Waffen)
    // ============================================
    _drawWeapon(ctx, player) {
        const weapon = player.currentWeapon || 'pistol';
        switch (weapon) {
            case 'smg':          this._drawSMG(ctx, player);          break;
            case 'shotgun':      this._drawShotgun(ctx, player);      break;
            case 'machinegun':   this._drawMachineGun(ctx, player);   break;
            case 'sniper':       this._drawSniper(ctx, player);       break;
            case 'flamethrower': this._drawFlamethrower(ctx, player); break;
            case 'launcher':     this._drawLauncher(ctx, player);     break;
            case 'railgun':      this._drawRailgun(ctx, player);      break;
            default:             this._drawPistol(ctx, player);       break;
        }
    },

    // --- Pistole (Original-Waffe) ---
    _drawPistol(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 120;
        const bobX = Math.sin(player.weaponBob) * 8;
        const bobY = Math.abs(Math.cos(player.weaponBob * 2)) * 6;
        const kickY = player.weaponKick * 35;
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
    },

    // --- Schrotflinte (breiter, massiver) ---
    _drawShotgun(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 130;
        const bobX = Math.sin(player.weaponBob) * 6;
        const bobY = Math.abs(Math.cos(player.weaponBob * 2)) * 5;
        const kickY = player.weaponKick * 45;
        const wx = cx + bobX - 40;
        const wy = baseY + bobY + kickY;

        // Muendungsfeuer (groesser als Pistole)
        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 30, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff44';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 30, 16, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 30, 6, 0, Math.PI * 2); ctx.fill();
        }

        // Doppellauf
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 26, wy - 28, 12, 8);
        ctx.fillRect(wx + 42, wy - 28, 12, 8);
        // Lauf-Verbindung
        ctx.fillStyle = '#333';
        ctx.fillRect(wx + 20, wy - 20, 40, 16);
        // Pump
        ctx.fillStyle = '#505050';
        ctx.fillRect(wx + 16, wy - 4, 48, 8);
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(wx + 18, wy - 2, 44, 4);
        // Griff
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(wx + 28, wy + 4, 24, 40);
        ctx.fillStyle = '#3a2518';
        for (let i = 0; i < 6; i++) ctx.fillRect(wx + 29, wy + 8 + i * 6, 22, 1);
        // Kolben
        ctx.fillStyle = '#5a3828';
        ctx.fillRect(wx + 24, wy + 30, 32, 18);
        // Hand
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 22, wy + 20, 30, 14);
        ctx.fillRect(wx + 16, wy + 26, 10, 12);
    },

    // --- Maschinengewehr (lang, schmal, mit Magazin) ---
    _drawMachineGun(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 120;
        const bobX = Math.sin(player.weaponBob * 1.5) * 5;
        const bobY = Math.abs(Math.cos(player.weaponBob * 3)) * 4;
        const kickY = player.weaponKick * 20;
        const wx = cx + bobX - 36;
        const wy = baseY + bobY + kickY;

        // Muendungsfeuer (kleiner, haeufiger)
        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.arc(cx + bobX + 4, wy - 22, 16, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff44';
            ctx.beginPath(); ctx.arc(cx + bobX + 4, wy - 22, 8, 0, Math.PI * 2); ctx.fill();
        }

        // Langer Lauf
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 28, wy - 24, 16, 10);
        // Gehaeuse
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(wx + 14, wy - 14, 44, 16);
        ctx.fillStyle = '#505050';
        ctx.fillRect(wx + 16, wy - 12, 40, 2);
        ctx.fillRect(wx + 16, wy - 4, 40, 2);
        // Magazin (links unten)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 18, wy + 2, 10, 24);
        ctx.fillStyle = '#222';
        ctx.fillRect(wx + 20, wy + 4, 6, 20);
        // Griff
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(wx + 32, wy + 2, 18, 35);
        ctx.fillStyle = '#3a2518';
        for (let i = 0; i < 5; i++) ctx.fillRect(wx + 33, wy + 6 + i * 6, 16, 1);
        // Tragegriff oben
        ctx.fillStyle = '#333';
        ctx.fillRect(wx + 30, wy - 18, 14, 4);
        // Hand
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 28, wy + 18, 26, 14);
        ctx.fillRect(wx + 10, wy + 0, 10, 10);
    },

    // --- SMG (kompakt, schnell) ---
    _drawSMG(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 115;
        const bobX = Math.sin(player.weaponBob * 1.3) * 6;
        const bobY = Math.abs(Math.cos(player.weaponBob * 2.6)) * 5;
        const kickY = player.weaponKick * 22;
        const wx = cx + bobX - 30;
        const wy = baseY + bobY + kickY;

        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 20, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff44';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 20, 9, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 22, wy - 18, 16, 8);
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(wx + 12, wy - 10, 36, 14);
        ctx.fillStyle = '#505050';
        ctx.fillRect(wx + 14, wy - 8, 32, 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 18, wy + 4, 8, 18);
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(wx + 28, wy + 4, 16, 32);
        ctx.fillStyle = '#3a2518';
        for (let i = 0; i < 4; i++) ctx.fillRect(wx + 29, wy + 8 + i * 6, 14, 1);
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 24, wy + 18, 24, 12);
        ctx.fillRect(wx + 8, wy - 2, 10, 10);
    },

    // --- Scharfschuetze (lang, schlank, Zielfernrohr) ---
    _drawSniper(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 130;
        const bobX = Math.sin(player.weaponBob) * 4;
        const bobY = Math.abs(Math.cos(player.weaponBob * 2)) * 3;
        const kickY = player.weaponKick * 50;
        const wx = cx + bobX - 38;
        const wy = baseY + bobY + kickY;

        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath(); ctx.arc(cx + bobX + 2, wy - 32, 20, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx + bobX + 2, wy - 32, 8, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 30, wy - 30, 12, 14);
        ctx.fillStyle = '#444';
        ctx.fillRect(wx + 28, wy - 22, 16, 4);
        ctx.fillStyle = '#00aaff';
        ctx.beginPath(); ctx.arc(wx + 26, wy - 20, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(wx + 18, wy - 16, 38, 14);
        ctx.fillStyle = '#505050';
        ctx.fillRect(wx + 20, wy - 14, 34, 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(wx + 24, wy - 2, 8, 14);
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(wx + 34, wy - 2, 18, 38);
        ctx.fillStyle = '#3a2518';
        for (let i = 0; i < 5; i++) ctx.fillRect(wx + 35, wy + 2 + i * 6, 16, 1);
        ctx.fillStyle = '#5a3828';
        ctx.fillRect(wx + 30, wy + 24, 26, 20);
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 30, wy + 16, 26, 14);
        ctx.fillRect(wx + 14, wy - 6, 10, 10);
    },

    // --- Flammenwerfer (breiter Tank, Flamme vorn) ---
    _drawFlamethrower(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 125;
        const bobX = Math.sin(player.weaponBob) * 5;
        const bobY = Math.abs(Math.cos(player.weaponBob * 2)) * 4;
        const kickY = player.weaponKick * 10;
        const wx = cx + bobX - 36;
        const wy = baseY + bobY + kickY;

        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#ff4400';
            ctx.beginPath(); ctx.arc(cx + bobX + 6, wy - 24, 22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff8800';
            ctx.beginPath(); ctx.arc(cx + bobX + 4, wy - 20, 16, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(cx + bobX + 2, wy - 16, 10, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#555';
        ctx.fillRect(wx + 28, wy - 16, 16, 8);
        ctx.fillStyle = '#333';
        ctx.fillRect(wx + 26, wy - 14, 4, 6);
        ctx.fillStyle = '#884400';
        ctx.fillRect(wx + 10, wy - 8, 40, 18);
        ctx.fillStyle = '#aa5500';
        ctx.fillRect(wx + 12, wy - 6, 36, 4);
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(wx + 44, wy - 4, 6, 6);
        ctx.fillStyle = '#333';
        ctx.fillRect(wx + 24, wy + 10, 6, 8);
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(wx + 30, wy + 10, 16, 32);
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 26, wy + 22, 24, 14);
        ctx.fillRect(wx + 6, wy - 2, 10, 10);
    },

    // --- Raketenwerfer (grosses Rohr) ---
    _drawLauncher(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 130;
        const bobX = Math.sin(player.weaponBob) * 5;
        const bobY = Math.abs(Math.cos(player.weaponBob * 2)) * 4;
        const kickY = player.weaponKick * 55;
        const wx = cx + bobX - 40;
        const wy = baseY + bobY + kickY;

        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#ff6600';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 28, 28, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 28, 16, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffff44';
            ctx.beginPath(); ctx.arc(cx + bobX, wy - 28, 8, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#3a5a3a';
        ctx.fillRect(wx + 18, wy - 22, 44, 18);
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(wx + 20, wy - 20, 40, 14);
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx + 40, wy - 13, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(wx + 40, wy - 13, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#555';
        ctx.fillRect(wx + 32, wy - 28, 4, 6);
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(wx + 28, wy - 4, 20, 38);
        ctx.fillStyle = '#3a2518';
        for (let i = 0; i < 5; i++) ctx.fillRect(wx + 29, wy + 0 + i * 6, 18, 1);
        ctx.fillStyle = '#5a3828';
        ctx.fillRect(wx + 22, wy + 22, 28, 16);
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 24, wy + 14, 28, 14);
        ctx.fillRect(wx + 14, wy - 10, 10, 10);
    },

    // --- Railgun (futuristisch, blau leuchtend) ---
    _drawRailgun(ctx, player) {
        const cx = this.width / 2;
        const baseY = this.height - 125;
        const bobX = Math.sin(player.weaponBob) * 5;
        const bobY = Math.abs(Math.cos(player.weaponBob * 2)) * 4;
        const kickY = player.weaponKick * 45;
        const wx = cx + bobX - 36;
        const wy = baseY + bobY + kickY;

        if (player.muzzleFlash > 0) {
            ctx.fillStyle = '#4444ff';
            ctx.beginPath(); ctx.arc(cx + bobX + 4, wy - 26, 24, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#8888ff';
            ctx.beginPath(); ctx.arc(cx + bobX + 4, wy - 26, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx + bobX + 4, wy - 26, 6, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#2a2a5a';
        ctx.fillRect(wx + 24, wy - 24, 8, 12);
        ctx.fillRect(wx + 40, wy - 24, 8, 12);
        ctx.fillStyle = '#3a3a6a';
        ctx.fillRect(wx + 20, wy - 12, 34, 16);
        const glow = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
        ctx.fillStyle = `rgba(100, 100, 255, ${glow})`;
        ctx.fillRect(wx + 28, wy - 8, 16, 8);
        ctx.fillStyle = '#aaaaff';
        ctx.fillRect(wx + 32, wy - 6, 8, 4);
        ctx.fillStyle = '#4444aa';
        ctx.fillRect(wx + 16, wy + 4, 40, 10);
        ctx.fillStyle = '#5555cc';
        ctx.fillRect(wx + 18, wy + 6, 36, 2);
        ctx.fillStyle = '#333';
        ctx.fillRect(wx + 30, wy + 14, 16, 30);
        ctx.fillStyle = '#222';
        for (let i = 0; i < 4; i++) ctx.fillRect(wx + 31, wy + 18 + i * 6, 14, 1);
        ctx.fillStyle = '#c4956a';
        ctx.fillRect(wx + 26, wy + 26, 24, 14);
        ctx.fillRect(wx + 12, wy + 0, 10, 10);
    }
};
