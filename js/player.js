// ============================================
// player.js - Spieler-Klasse
// ============================================

class Player {
    constructor(x, y, angle) {
        // Position
        this.x = x;
        this.y = y;

        // Blickrichtung (Radians)
        this.angle = angle;
        this.dirX = Math.cos(this.angle);
        this.dirY = Math.sin(this.angle);

        // Kameraebene (senkrecht zur Blickrichtung, bestimmt FOV)
        // FOV ca. 66 Grad (wie Original Wolfenstein)
        this.fov = 0.66;
        this.planeX = 0;
        this.planeY = 0;
        this._updatePlane();

        // Bewegungsparameter
        this.moveSpeed = 3.5;    // Einheiten pro Sekunde
        this.rotSpeed = 0.003;   // Maus-Empfindlichkeit

        // Kollisionsradius
        this.radius = 0.2;

        // Spieler-Status
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;

        // Waffen-Status
        this.canShoot = true;
        this.shootTimer = 0;
        this.shootCooldown = 0.35;
        this.justShot = false; // Wird im aktuellen Frame geschossen?

        // Waffen-Animation
        this.weaponBob = 0;
        this.weaponKick = 0;
        this.muzzleFlash = 0;

        // Schaden-Blitz
        this.damageFlash = 0;
    }

    // Kameraebene aus Blickrichtung berechnen
    _updatePlane() {
        this.planeX = -this.dirY * this.fov;
        this.planeY = this.dirX * this.fov;
    }

    // Spieler pro Frame aktualisieren
    update(dt) {
        if (!this.alive) return;

        this.justShot = false;

        // --- Maus-Drehung ---
        const mouse = Input.getMouseDelta();
        if (mouse.x !== 0) {
            this._rotate(mouse.x * this.rotSpeed);
        }

        // --- Tastatur-Bewegung ---
        let moveX = 0;
        let moveY = 0;

        // Vorwaerts / Rueckwaerts
        if (Input.isKeyDown('KeyW')) { moveX += this.dirX; moveY += this.dirY; }
        if (Input.isKeyDown('KeyS')) { moveX -= this.dirX; moveY -= this.dirY; }

        // Seitwaerts (Strafing)
        // Rechts-Perpendikular von (dirX, dirY) ist (-dirY, dirX) in unserem Koordinatensystem
        if (Input.isKeyDown('KeyA')) { moveX += this.dirY; moveY -= this.dirX; }
        if (Input.isKeyDown('KeyD')) { moveX -= this.dirY; moveY += this.dirX; }

        // Bewegungsvektor normalisieren (diagonal nicht schneller)
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        if (len > 0) {
            const speed = this.moveSpeed * dt;
            moveX = (moveX / len) * speed;
            moveY = (moveY / len) * speed;
            this.weaponBob += dt * 8;
            this._move(moveX, moveY);
        }

        // --- Schiessen ---
        if (!this.canShoot) {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) this.canShoot = true;
        }

        if (Input.shootPressed && this.canShoot) {
            this._shoot();
        }

        // --- Animationen ---
        if (this.weaponKick > 0) {
            this.weaponKick -= dt * 8;
            if (this.weaponKick < 0) this.weaponKick = 0;
        }
        if (this.muzzleFlash > 0) {
            this.muzzleFlash -= dt;
            if (this.muzzleFlash < 0) this.muzzleFlash = 0;
        }
        if (this.damageFlash > 0) {
            this.damageFlash -= dt * 3;
            if (this.damageFlash < 0) this.damageFlash = 0;
        }
    }

    // Blickrichtung drehen
    _rotate(angle) {
        this.angle += angle;
        this.dirX = Math.cos(this.angle);
        this.dirY = Math.sin(this.angle);
        this._updatePlane();
    }

    // Bewegen mit Kollisionserkennung
    _move(dx, dy) {
        const r = this.radius;

        // X und Y getrennt pruefen (ermoeglicht an Waenden entlanggleiten)
        const nx = this.x + dx;
        if (!isWall(nx + r, this.y + r) && !isWall(nx + r, this.y - r) &&
            !isWall(nx - r, this.y + r) && !isWall(nx - r, this.y - r)) {
            this.x = nx;
        }

        const ny = this.y + dy;
        if (!isWall(this.x + r, ny + r) && !isWall(this.x + r, ny - r) &&
            !isWall(this.x - r, ny + r) && !isWall(this.x - r, ny - r)) {
            this.y = ny;
        }
    }

    // Schuss ausloesen
    _shoot() {
        this.justShot = true;
        this.canShoot = false;
        this.shootTimer = this.shootCooldown;
        this.weaponKick = 1.0;
        this.muzzleFlash = 0.08;
    }

    // Schaden nehmen
    takeDamage(amount) {
        if (!this.alive) return;
        this.health -= amount;
        this.damageFlash = 1.0;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
    }

    // Heilen
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
}
