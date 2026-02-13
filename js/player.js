// ============================================
// player.js - Spieler-Klasse
// Erweitert um Waffensystem, Gold, Interaktion
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

        // Gold
        this.gold = 0;

        // Waffen-System (8 Waffen)
        this.weapons = {
            pistol:       { owned: true,  damage: 25,  cooldown: 0.35, name: 'Pistole' },
            smg:          { owned: false, damage: 20,  cooldown: 0.18, name: 'MP' },
            shotgun:      { owned: false, damage: 60,  cooldown: 0.8,  name: 'Schrotflinte' },
            machinegun:   { owned: false, damage: 15,  cooldown: 0.1,  name: 'MG' },
            sniper:       { owned: false, damage: 120, cooldown: 1.2,  name: 'Scharfschuetze' },
            flamethrower: { owned: false, damage: 8,   cooldown: 0.06, name: 'Flammenwerfer' },
            launcher:     { owned: false, damage: 80,  cooldown: 1.5,  name: 'Raketenwerfer' },
            railgun:      { owned: false, damage: 200, cooldown: 2.5,  name: 'Railgun' }
        };
        this.currentWeapon = 'pistol';
        this.weaponList = ['pistol', 'smg', 'shotgun', 'machinegun', 'sniper', 'flamethrower', 'launcher', 'railgun'];

        // Waffen-Status
        this.canShoot = true;
        this.shootTimer = 0;
        this.justShot = false; // Wird im aktuellen Frame geschossen?

        // Waffen-Animation
        this.weaponBob = 0;
        this.weaponKick = 0;
        this.muzzleFlash = 0;

        // Schaden-Blitz
        this.damageFlash = 0;

        // Bewegungsstatus (fuer Schritte-Sound)
        this.isMoving = false;
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
        this.isMoving = false;

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
        if (Input.isKeyDown('KeyA')) { moveX += this.dirY; moveY -= this.dirX; }
        if (Input.isKeyDown('KeyD')) { moveX -= this.dirY; moveY += this.dirX; }

        // Bewegungsvektor normalisieren (diagonal nicht schneller)
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        if (len > 0) {
            const speed = this.moveSpeed * dt;
            moveX = (moveX / len) * speed;
            moveY = (moveY / len) * speed;
            this.weaponBob += dt * 10;
            this.isMoving = true;
            this._move(moveX, moveY);
        } else {
            // Waffe langsam zurueck zur Mitte bewegen
            this.weaponBob *= 0.92;
        }

        // --- Schiessen ---
        if (!this.canShoot) {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) this.canShoot = true;
        }

        // Dauerfeuer-Waffen (Taste gehalten = feuern)
        const holdFire = this.currentWeapon === 'machinegun' || this.currentWeapon === 'smg' || this.currentWeapon === 'flamethrower';
        const wantShoot = holdFire
            ? (Input.isKeyDown('Space') || Input.mouseDown)
            : Input.shootPressed;

        if (wantShoot && this.canShoot) {
            this._shoot();
        }

        // --- Waffenwechsel (1-8 Tasten) ---
        if (Input.isKeyDown('Digit1')) this._switchWeapon('pistol');
        if (Input.isKeyDown('Digit2')) this._switchWeapon('smg');
        if (Input.isKeyDown('Digit3')) this._switchWeapon('shotgun');
        if (Input.isKeyDown('Digit4')) this._switchWeapon('machinegun');
        if (Input.isKeyDown('Digit5')) this._switchWeapon('sniper');
        if (Input.isKeyDown('Digit6')) this._switchWeapon('flamethrower');
        if (Input.isKeyDown('Digit7')) this._switchWeapon('launcher');
        if (Input.isKeyDown('Digit8')) this._switchWeapon('railgun');

        // --- Scrollrad-Waffenwechsel ---
        if (Input.scrollDelta !== 0) {
            this._cycleWeapon(Math.sign(Input.scrollDelta));
            Input.scrollDelta = 0;
        }

        // --- Interaktion (E-Taste) ---
        if (Input.interactPressed) {
            this._interact();
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

    // Schuss ausloesen (benutzt aktuelle Waffen-Stats)
    _shoot() {
        const wp = this.weapons[this.currentWeapon];
        this.justShot = true;
        this.canShoot = false;
        this.shootTimer = wp.cooldown;

        // Waffen-spezifischer Ruecklauf und Muendungsfeuer
        switch (this.currentWeapon) {
            case 'shotgun':      this.weaponKick = 1.5; this.muzzleFlash = 0.10; break;
            case 'machinegun':   this.weaponKick = 0.6; this.muzzleFlash = 0.04; break;
            case 'smg':          this.weaponKick = 0.7; this.muzzleFlash = 0.05; break;
            case 'sniper':       this.weaponKick = 2.0; this.muzzleFlash = 0.12; break;
            case 'flamethrower': this.weaponKick = 0.2; this.muzzleFlash = 0.06; break;
            case 'launcher':     this.weaponKick = 2.5; this.muzzleFlash = 0.15; break;
            case 'railgun':      this.weaponKick = 1.8; this.muzzleFlash = 0.20; break;
            default:             this.weaponKick = 1.0; this.muzzleFlash = 0.08; break;
        }
    }

    // Waffe wechseln (nur wenn man sie besitzt)
    _switchWeapon(name) {
        if (this.weapons[name] && this.weapons[name].owned && this.currentWeapon !== name) {
            this.currentWeapon = name;
            this.weaponKick = 0.5;
            if (typeof Sound !== 'undefined') Sound.playWeaponSwitch();
        }
    }

    // Naechste/vorherige Waffe (Scrollrad)
    _cycleWeapon(direction) {
        const idx = this.weaponList.indexOf(this.currentWeapon);
        let newIdx = idx;
        let attempts = 0;
        do {
            newIdx += direction;
            if (newIdx < 0) newIdx = this.weaponList.length - 1;
            if (newIdx >= this.weaponList.length) newIdx = 0;
            attempts++;
        } while (!this.weapons[this.weaponList[newIdx]].owned && attempts < this.weaponList.length);

        if (this.weapons[this.weaponList[newIdx]].owned) {
            this._switchWeapon(this.weaponList[newIdx]);
        }
    }

    // Interaktion mit der Umgebung (Tueren oeffnen)
    _interact() {
        if (typeof Doors === 'undefined') return;

        // Zwei Distanzen pruefen: nah und etwas weiter
        for (const dist of [0.8, 1.5]) {
            const mx = Math.floor(this.x + this.dirX * dist);
            const my = Math.floor(this.y + this.dirY * dist);
            const door = Doors.getDoor(mx, my);
            if (door && door.state === 'closed') {
                const key = mx + ',' + my;
                Doors.openDoor(key);
                if (typeof Sound !== 'undefined') Sound.playDoorOpen();
                return;
            }
        }
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
