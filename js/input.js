// ============================================
// input.js - Tastatur- und Maus-Eingabe
// ============================================

const Input = {
    // Tastenstatus (true = gedrueckt)
    keys: {},

    // Mausbewegung seit letztem Frame
    mouseDeltaX: 0,
    mouseDeltaY: 0,

    // Mausklick
    mouseDown: false,

    // Pointer Lock aktiv?
    pointerLocked: false,

    // Schuss-Erkennung (einmalig pro Druck)
    shootPressed: false,
    _shootWasPressed: false,

    // Eingabe-Handler initialisieren
    init(canvas) {
        // Tastatur-Events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Maus-Bewegung (nur bei aktivem Pointer Lock)
        document.addEventListener('mousemove', (e) => {
            if (this.pointerLocked) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });

        // Mausklick
        document.addEventListener('mousedown', () => {
            this.mouseDown = true;
        });
        document.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        // Pointer Lock Status
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement === canvas;
        });

        // Klick auf Canvas aktiviert Pointer Lock
        canvas.addEventListener('click', () => {
            if (!this.pointerLocked) {
                canvas.requestPointerLock();
            }
        });
    },

    // Pruefe ob eine Taste gedrueckt ist
    isKeyDown(code) {
        return this.keys[code] === true;
    },

    // Mausbewegung abrufen und zuruecksetzen
    getMouseDelta() {
        const dx = this.mouseDeltaX;
        const dy = this.mouseDeltaY;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        return { x: dx, y: dy };
    },

    // Einmal pro Frame aufrufen
    update() {
        const shootDown = this.isKeyDown('Space') || this.mouseDown;
        this.shootPressed = shootDown && !this._shootWasPressed;
        this._shootWasPressed = shootDown;
    }
};
