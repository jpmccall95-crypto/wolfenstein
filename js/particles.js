// ============================================
// particles.js - Einfaches Partikelsystem
// Bildschirm-Koordinaten, Pixel die wegfliegen
// ============================================

const Particles = {
    particles: [],
    maxParticles: 200,

    // Partikel bei Treffer spawnen (Bildschirm-Koordinaten)
    spawnHit(screenX, screenY, color) {
        const count = 6 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 160;
            this.particles.push({
                x: screenX + (Math.random() - 0.5) * 10,
                y: screenY + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                life: 0.25 + Math.random() * 0.35,
                maxLife: 0.6,
                color: color || '#ff4444',
                size: 1 + Math.random() * 2.5
            });
        }
        // Limit einhalten
        while (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    },

    // Blut-Partikel (roter Splash)
    spawnBlood(screenX, screenY) {
        this.spawnHit(screenX, screenY, '#cc0000');
    },

    // Funken-Partikel (gelb/orange, fuer Wand-Treffer etc.)
    spawnSparks(screenX, screenY) {
        const count = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120;
            const colors = ['#ffcc00', '#ff8800', '#ffaa22'];
            this.particles.push({
                x: screenX,
                y: screenY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 0.15 + Math.random() * 0.2,
                maxLife: 0.35,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 1 + Math.random() * 1.5
            });
        }
        while (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    },

    // Pro Frame aktualisieren
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 250 * dt; // Schwerkraft
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    // Alle Partikel zeichnen
    draw(ctx) {
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(
                Math.floor(p.x - p.size / 2),
                Math.floor(p.y - p.size / 2),
                Math.ceil(p.size),
                Math.ceil(p.size)
            );
        }
        ctx.globalAlpha = 1.0;
    }
};
