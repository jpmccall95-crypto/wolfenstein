// ============================================
// enemy.js - Gegner-KI und Verhalten
// ============================================

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0.3;

        // Status
        this.health = 50;
        this.alive = true;

        // KI-Zustand: 'idle', 'chase', 'attack'
        this.state = 'idle';
        this.sightRange = 16;
        this.attackRange = 8;
        this.moveSpeed = 1.8;

        // Angriff
        this.damage = 8;
        this.attackCooldown = 1.5;
        this.attackTimer = 0;

        // Animation
        this.hurtTimer = 0;
    }

    // Gegner pro Frame aktualisieren
    update(dt, player) {
        if (!this.alive) return;

        // Hurt-Timer
        if (this.hurtTimer > 0) this.hurtTimer -= dt;

        // Abstand zum Spieler
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Sichtlinie zum Spieler pruefen
        const canSee = dist < this.sightRange && hasLineOfSight(this.x, this.y, player.x, player.y);

        // Zustandsmaschine
        switch (this.state) {
            case 'idle':
                // Spieler gesehen? -> Verfolgen
                if (canSee) {
                    this.state = 'chase';
                }
                break;

            case 'chase':
                if (!canSee) {
                    // Spieler aus den Augen verloren
                    this.state = 'idle';
                } else if (dist < this.attackRange) {
                    // Nah genug zum Angreifen
                    this.state = 'attack';
                } else {
                    // Auf Spieler zubewegen
                    this._moveToward(player.x, player.y, dt);
                }
                break;

            case 'attack':
                if (!canSee) {
                    this.state = 'idle';
                } else if (dist > this.attackRange + 2) {
                    // Spieler zu weit weg -> wieder verfolgen
                    this.state = 'chase';
                } else {
                    // Angreifen und langsam naeherkommen
                    this._moveToward(player.x, player.y, dt * 0.5);
                    this.attackTimer -= dt;
                    if (this.attackTimer <= 0) {
                        this._attack(player, dist);
                        this.attackTimer = this.attackCooldown;
                    }
                }
                break;
        }
    }

    // In Richtung Ziel bewegen
    _moveToward(targetX, targetY, dt) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.5) return;

        const speed = this.moveSpeed * dt;
        const mx = (dx / dist) * speed;
        const my = (dy / dist) * speed;

        // Kollisionserkennung (gleiche Methode wie Spieler)
        const r = this.radius;
        const nx = this.x + mx;
        if (!isWall(nx + r, this.y + r) && !isWall(nx + r, this.y - r) &&
            !isWall(nx - r, this.y + r) && !isWall(nx - r, this.y - r)) {
            this.x = nx;
        }

        const ny = this.y + my;
        if (!isWall(this.x + r, ny + r) && !isWall(this.x + r, ny - r) &&
            !isWall(this.x - r, ny + r) && !isWall(this.x - r, ny - r)) {
            this.y = ny;
        }
    }

    // Spieler angreifen
    _attack(player, dist) {
        // Trefferchance sinkt mit Entfernung
        const hitChance = Math.max(0.3, 1.0 - dist / this.attackRange);
        if (Math.random() < hitChance) {
            player.takeDamage(this.damage);
        }
    }

    // Schaden nehmen
    takeDamage(amount) {
        if (!this.alive) return;
        this.health -= amount;
        this.hurtTimer = 0.15;
        // Bei Treffer sofort aggressiv werden
        if (this.state === 'idle') this.state = 'chase';

        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
    }
}

// ============================================
// Pickup-Klasse (Items die man aufheben kann)
// Typen: health, gold, gold_big, weapon_shotgun, weapon_mg
// ============================================

class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        this.radius = 0.3;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Typ-abhaengige Werte
        this.healAmount = 0;
        this.goldValue = 0;
        this.weaponType = null;
        this.weaponCost = 0;

        switch (type) {
            case 'health':
                this.healAmount = 25;
                break;
            case 'gold':
                this.goldValue = 10 + Math.floor(Math.random() * 15);
                break;
            case 'gold_big':
                this.goldValue = 50;
                break;
            case 'weapon_shotgun':
                this.weaponType = 'shotgun';
                this.weaponCost = 50;
                break;
            case 'weapon_mg':
                this.weaponType = 'machinegun';
                this.weaponCost = 100;
                break;
        }
    }
}
