// ============================================
// input.js - Tastatur- und Maus-Eingabe
// Erweitert um Chat-Modus und Scoreboard
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

    // Chat-Modus (Tasteneingaben gehen in den Chat)
    chatActive: false,
    chatText: '',

    // Scoreboard sichtbar (Tab gehalten)
    showScoreboard: false,

    // Eingabe-Handler initialisieren
    init(canvas) {
        // --- Tastatur-Events ---
        document.addEventListener('keydown', (e) => {
            // Tab = Scoreboard anzeigen
            if (e.code === 'Tab') {
                e.preventDefault();
                this.showScoreboard = true;
                return;
            }

            // Chat-Modus: Tasten gehen in den Chat-Text
            if (this.chatActive) {
                e.preventDefault();
                this._handleChatKey(e);
                return;
            }

            // Enter oeffnet Chat (nur im Multiplayer)
            if (e.code === 'Enter' && typeof Network !== 'undefined' && Network.connected) {
                e.preventDefault();
                this.chatActive = true;
                this.chatText = '';
                return;
            }

            // Normaler Spielinput
            this.keys[e.code] = true;
            if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'Tab') {
                this.showScoreboard = false;
            }
        });

        // --- Maus-Bewegung ---
        document.addEventListener('mousemove', (e) => {
            if (this.pointerLocked && !this.chatActive) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });

        // --- Mausklick ---
        document.addEventListener('mousedown', () => {
            this.mouseDown = true;
        });
        document.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        // --- Pointer Lock Status ---
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

    // Chat-Tasten verarbeiten
    _handleChatKey(e) {
        if (e.key === 'Enter') {
            // Nachricht senden wenn nicht leer
            if (this.chatText.length > 0) {
                Network.sendChat(this.chatText);
            }
            this.chatText = '';
            this.chatActive = false;
            return;
        }
        if (e.key === 'Escape') {
            // Chat abbrechen
            this.chatText = '';
            this.chatActive = false;
            return;
        }
        if (e.key === 'Backspace') {
            this.chatText = this.chatText.slice(0, -1);
            return;
        }
        // Einzelne Zeichen hinzufuegen
        if (e.key.length === 1 && this.chatText.length < 100) {
            this.chatText += e.key;
        }
    },

    // Pruefe ob eine Taste gedrueckt ist
    // Im Chat-Modus werden Spieltasten blockiert
    isKeyDown(code) {
        if (this.chatActive) return false;
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
        if (this.chatActive) {
            this.shootPressed = false;
            return;
        }
        const shootDown = this.isKeyDown('Space') || this.mouseDown;
        this.shootPressed = shootDown && !this._shootWasPressed;
        this._shootWasPressed = shootDown;
    }
};
