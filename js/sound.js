// ============================================
// sound.js - Prozedural generierte Soundeffekte
// + Chiptune-Hintergrundmusik
// Web Audio API, kein externes Audio noetig
// ============================================

const Sound = {
    ctx: null,
    enabled: false,

    // Hintergrundmusik
    musicPlaying: false,
    musicGain: null,
    musicVolume: 0.12,
    musicBPM: 140,
    musicBeat: 0,
    musicTimer: null,

    // Audio-Context initialisieren
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;
        } catch (e) {
            this.enabled = false;
        }
    },

    // Context nach User-Interaktion entsperren (Browser-Policy)
    unlock() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // === SOUNDEFFEKTE ===

    // --- Schuss-Sound (kurzer Noise-Burst mit Bandpass) ---
    playShoot() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const bufLen = Math.floor(ctx.sampleRate * 0.12);
        const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.1);
        filter.Q.value = 1.2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
        noise.stop(t + 0.12);
    },

    // --- Treffer-Sound (dumpfer Schlag) ---
    playHit() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    // --- Pickup-Sound (heller Bling) ---
    playPickup() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1320, t + 0.06);
        osc.frequency.setValueAtTime(1760, t + 0.12);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.28);
    },

    // --- Schritte (leises Tappen) ---
    _lastStepTime: 0,
    playStep() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        if (t - this._lastStepTime < 0.32) return;
        this._lastStepTime = t;

        const bufLen = Math.floor(ctx.sampleRate * 0.04);
        const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
        noise.stop(t + 0.04);
    },

    // --- Wellen-Start Sound (aufsteigender Sweep) ---
    playWaveStart() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
    },

    // --- Tuer-Oeffnungs-Sound (metallisches Knarren) ---
    playDoorOpen() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.linearRampToValueAtTime(120, t + 0.2);
        osc.frequency.linearRampToValueAtTime(60, t + 0.4);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    },

    // --- Gold-Pickup (helles Kling-Kling) ---
    playGoldPickup() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200 + i * 400, t + i * 0.05);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.15, t + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + i * 0.05);
            osc.stop(t + i * 0.05 + 0.15);
        }
    },

    // --- Waffen-Pickup (tiefer Auflade-Sound) ---
    playWeaponPickup() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.25);
        osc.frequency.setValueAtTime(800, t + 0.25);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
    },

    // --- Waffen-Wechsel (kurzer Klick) ---
    playWeaponSwitch() {
        if (!this.enabled) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 800;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    },

    // === HINTERGRUNDMUSIK (Chiptune-Stil) ===

    // Musik starten
    startMusic() {
        if (!this.enabled || this.musicPlaying) return;
        this.musicPlaying = true;

        const ctx = this.ctx;
        this.musicGain = ctx.createGain();
        this.musicGain.gain.value = this.musicVolume;
        this.musicGain.connect(ctx.destination);

        this.musicBeat = 0;
        this._scheduleMusicBeat();
    },

    // Musik stoppen
    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    },

    // Naechsten Beat planen
    _scheduleMusicBeat() {
        if (!this.musicPlaying) return;
        const beatDuration = 60 / this.musicBPM;
        this._playMusicBeat(this.musicBeat);
        this.musicBeat++;
        this.musicTimer = setTimeout(() => this._scheduleMusicBeat(), beatDuration * 1000);
    },

    // Einen Beat abspielen (Melodie + Bass + Drums)
    _playMusicBeat(beat) {
        if (!this.musicGain) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const beatLen = 60 / this.musicBPM;
        const bar = beat % 16;
        const section = Math.floor(beat / 64) % 2;

        // --- Bass (immer, tiefe Square-Wave) ---
        const bassNotes = [
            110, 110, 110, 110,
            130.81, 130.81, 130.81, 130.81,
            110, 110, 110, 110,
            146.83, 146.83, 130.81, 110
        ];
        this._playMusicNote(t, bassNotes[bar], beatLen * 0.8, 'square', 0.1);

        // --- Melodie (abwechselnd zwei Patterns) ---
        const melody1 = [
            440, 0, 523.25, 0,
            587.33, 0, 523.25, 440,
            0, 392, 0, 440,
            523.25, 0, 440, 0
        ];
        const melody2 = [
            440, 0, 392, 0,
            349.23, 0, 392, 440,
            0, 523.25, 0, 587.33,
            523.25, 0, 440, 0
        ];
        const mel = section === 0 ? melody1 : melody2;
        if (mel[bar] > 0) {
            this._playMusicNote(t, mel[bar], beatLen * 0.6, 'square', 0.06);
        }

        // --- Schlagzeug ---
        if (bar % 4 === 0) {
            this._playDrum(t, 'kick');
        }
        if (bar % 4 === 2) {
            this._playDrum(t, 'snare');
        }
        if (bar % 2 === 0) {
            this._playDrum(t, 'hihat');
        }
    },

    // Einzelne Musik-Note spielen
    _playMusicNote(time, freq, dur, type, vol) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    },

    // Drum-Sounds spielen
    _playDrum(time, type) {
        const ctx = this.ctx;

        if (type === 'kick') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.14, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
            osc.connect(gain);
            gain.connect(this.musicGain);
            osc.start(time);
            osc.stop(time + 0.12);
        } else if (type === 'snare') {
            const bufLen = Math.floor(ctx.sampleRate * 0.08);
            const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const hpf = ctx.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.value = 2000;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.08, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
            noise.connect(hpf);
            hpf.connect(gain);
            gain.connect(this.musicGain);
            noise.start(time);
            noise.stop(time + 0.08);
        } else if (type === 'hihat') {
            const bufLen = Math.floor(ctx.sampleRate * 0.03);
            const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const hpf = ctx.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.value = 8000;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.04, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
            noise.connect(hpf);
            hpf.connect(gain);
            gain.connect(this.musicGain);
            noise.start(time);
            noise.stop(time + 0.03);
        }
    }
};
