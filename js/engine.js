// ============================================
// engine.js - Raycasting-Engine (DDA-Algorithmus)
// ============================================

const Engine = {
    textures: {},       // Wandtyp -> { data, width, height }
    screenWidth: 640,
    screenHeight: 480,
    screenBuffer: null, // ImageData fuer schnelles Pixel-Rendering
    zBuffer: null,      // Tiefenpuffer fuer Sprite-Clipping

    // Engine initialisieren
    init(width, height) {
        this.screenWidth = width;
        this.screenHeight = height;
        this.zBuffer = new Float64Array(width);
        this._generateTextures();
    },

    // Prozedurale Texturen erzeugen
    _generateTextures() {
        const s = TEX_SIZE;

        // Hilfsfunktion: Farbwert begrenzen
        const clamp = (v) => Math.max(0, Math.min(255, Math.floor(v)));

        // --- Steinmauer (grau, Typ 1) ---
        this.textures[1] = this._createTexture(s, (x, y) => {
            // Steinblock-Muster mit Fugen
            const blockW = 16, blockH = 8;
            const offsetX = (Math.floor(y / blockH) % 2) * (blockW / 2);
            const bx = (x + offsetX) % blockW;
            const by = y % blockH;
            const isGrout = bx === 0 || by === 0;
            if (isGrout) return { r: 70, g: 70, b: 72 };
            const n = (Math.sin(x * 1.3) * Math.cos(y * 0.7) + 1) * 10;
            const base = 130 + n;
            return { r: clamp(base), g: clamp(base), b: clamp(base + 5) };
        });

        // --- Backsteinmauer (rot, Typ 2) ---
        this.textures[2] = this._createTexture(s, (x, y) => {
            const brickH = 8, brickW = 16;
            const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
            const bx = (x + offset) % brickW;
            const by = y % brickH;
            const isMortar = bx < 1 || by < 1;
            if (isMortar) return { r: 140, g: 130, b: 115 };
            const n = (Math.sin(x * 2.1 + y * 1.3) + 1) * 12;
            return { r: clamp(165 + n), g: clamp(55 + n * 0.3), b: clamp(45 + n * 0.2) };
        });

        // --- Holzwand (braun, Typ 3) ---
        this.textures[3] = this._createTexture(s, (x, y) => {
            const grain = Math.sin(y * 0.6 + Math.sin(x * 0.3) * 2) * 15;
            const plank = (x % 16 < 1) ? -30 : 0;
            const n = (Math.sin(y * 0.8 + x * 0.2) + 1) * 5;
            const base = 115 + grain + plank + n;
            return { r: clamp(base + 10), g: clamp(base * 0.7), b: clamp(base * 0.35) };
        });

        // --- Metalltuer (blau, Typ 4) ---
        this.textures[4] = this._createTexture(s, (x, y) => {
            const border = x < 3 || x >= s - 3 || y < 3 || y >= s - 3;
            const panel = x > 8 && x < s - 8 && y > 18 && y < s - 18;
            const handle = x > s - 16 && x < s - 10 && y > 26 && y < 38;
            const n = (Math.sin(x * 3 + y * 3) + 1) * 3;
            if (border) return { r: 50, g: 55, b: 70 };
            if (handle) return { r: 200, g: 190, b: 60 };
            if (panel) return { r: clamp(65 + n), g: clamp(85 + n), b: clamp(155 + n) };
            return { r: clamp(75 + n), g: clamp(95 + n), b: clamp(175 + n) };
        });
    },

    // Einzelne Textur als Pixeldaten erzeugen
    _createTexture(size, colorFunc) {
        const data = new Uint8ClampedArray(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const c = colorFunc(x, y);
                const i = (y * size + x) * 4;
                data[i]     = c.r;
                data[i + 1] = c.g;
                data[i + 2] = c.b;
                data[i + 3] = 255;
            }
        }
        return { data, width: size, height: size };
    },

    // ============================================
    // DDA-Raycasting - Herzst ueck der Engine
    // ============================================
    castRays(player) {
        const w = this.screenWidth;
        const h = this.screenHeight;
        const wallSlices = new Array(w);

        for (let x = 0; x < w; x++) {
            // Kamera-X-Koordinate: -1 (links) bis +1 (rechts)
            const cameraX = 2 * x / w - 1;

            // Strahlrichtung
            const rayDirX = player.dirX + player.planeX * cameraX;
            const rayDirY = player.dirY + player.planeY * cameraX;

            // Aktuelle Gitterposition
            let mapX = Math.floor(player.x);
            let mapY = Math.floor(player.y);

            // Abstand den der Strahl zuruecklegen muss um ein Gitter zu kreuzen
            const deltaDistX = Math.abs(1 / rayDirX);
            const deltaDistY = Math.abs(1 / rayDirY);

            // Schrittrichtung und anfaenglicher Seitenabstand
            let stepX, stepY, sideDistX, sideDistY;

            if (rayDirX < 0) {
                stepX = -1;
                sideDistX = (player.x - mapX) * deltaDistX;
            } else {
                stepX = 1;
                sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
            }

            if (rayDirY < 0) {
                stepY = -1;
                sideDistY = (player.y - mapY) * deltaDistY;
            } else {
                stepY = 1;
                sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
            }

            // DDA: Schritt fuer Schritt durch das Gitter
            let side = 0; // 0 = vertikale Wand (X), 1 = horizontale Wand (Y)
            let hit = false;

            while (!hit) {
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }

                if (mapY >= 0 && mapY < MAP_HEIGHT && mapX >= 0 && mapX < MAP_WIDTH) {
                    if (MAP_DATA[mapY][mapX] > 0) hit = true;
                } else {
                    hit = true; // Kartenrand
                }
            }

            // Senkrechter Wandabstand (Fisheye-Korrektur!)
            let perpWallDist;
            if (side === 0) {
                perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
            } else {
                perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
            }

            // Wandhoehe auf dem Bildschirm
            const lineHeight = Math.floor(h / perpWallDist);

            // Start- und Endpixel der Wandlinie
            let drawStart = Math.floor(-lineHeight / 2 + h / 2);
            let drawEnd = Math.floor(lineHeight / 2 + h / 2);
            if (drawStart < 0) drawStart = 0;
            if (drawEnd >= h) drawEnd = h - 1;

            // Textur-X-Koordinate berechnen (wo genau die Wand getroffen wurde)
            let wallX;
            if (side === 0) {
                wallX = player.y + perpWallDist * rayDirY;
            } else {
                wallX = player.x + perpWallDist * rayDirX;
            }
            wallX -= Math.floor(wallX);

            // Textur-Pixel-X
            let texX = Math.floor(wallX * TEX_SIZE);
            if (side === 0 && rayDirX > 0) texX = TEX_SIZE - texX - 1;
            if (side === 1 && rayDirY < 0) texX = TEX_SIZE - texX - 1;

            // Wandtyp
            const wallType = (mapY >= 0 && mapY < MAP_HEIGHT && mapX >= 0 && mapX < MAP_WIDTH)
                ? MAP_DATA[mapY][mapX] : 1;

            wallSlices[x] = {
                drawStart,
                drawEnd,
                lineHeight,
                texX,
                wallType,
                side,
                perpDist: perpWallDist
            };

            // Z-Buffer fuellen
            this.zBuffer[x] = perpWallDist;
        }

        return wallSlices;
    }
};
