// ==========================================
// Galaxy Raider - Phaser Game Engine
// YouTube Playables Compatible
// ==========================================

const VIRTUAL_WIDTH = 720;
const VIRTUAL_HEIGHT = 1280;

// === GAME STATE ===
const GAME_STATE = { BOOT: 0, MENU: 1, PLAYING: 2, GAMEOVER: 3, PAUSED: 4 };
window.GAME_STATE = GAME_STATE;
var currentState = GAME_STATE.BOOT;
var score = 0, level = 1;
var width = window.innerWidth, height = window.innerHeight;

// === SHIP DEFINITIONS ===
const SHIPS = [
    { 
        id: 0, name: "ALPHA WING", cost: 0, color: "#00ffff", speed: 1.0, fireRate: 15, health: 100, damage: 1,
        desc: "Balanced stats. Reliable standard issue fighter.",
        svg: '<path d="M25 5 L45 45 L25 35 L5 45 Z" fill="#00ffff" stroke="white" stroke-width="1"/>',
        maxLevel: 3, upgradeCost: 500
    },
    { 
        id: 1, name: "STRIKER X", cost: 500, color: "#00ff00", speed: 1.3, fireRate: 10, health: 80, damage: 1,
        desc: "High mobility and rapid fire. Sacrifices armor.",
        svg: '<path d="M25 5 L35 20 L45 10 L40 45 L25 35 L10 45 L5 10 L15 20 Z" fill="#00ff00" stroke="white" stroke-width="1"/>',
        maxLevel: 3, upgradeCost: 800
    },
    { 
        id: 2, name: "TITAN HEAVY", cost: 1500, color: "#ffd700", speed: 0.7, fireRate: 24, health: 200, damage: 2,
        desc: "Heavily armored hull. Fires powerful Pulse Lasers.",
        svg: '<path d="M20 5 L30 5 L45 20 L45 45 L35 40 L15 40 L5 45 L5 20 Z" fill="#ffd700" stroke="white" stroke-width="1"/>',
        maxLevel: 3, upgradeCost: 1500
    },
    { 
        id: 3, name: "PHANTOM", cost: 3000, color: "#9933ff", speed: 1.5, fireRate: 8, health: 60, damage: 1,
        desc: "Extreme speed stealth craft. Triple-gun configuration.",
        svg: '<path d="M25 0 L30 15 L48 20 L40 45 L25 35 L10 45 L2 20 L20 15 Z" fill="#9933ff" stroke="white" stroke-width="1"/>',
        maxLevel: 3, upgradeCost: 2500
    }
];
window.SHIPS = SHIPS;

const POWERUPS = [
    { id: 'shield', name: "FORCE SHIELD", cost: 50, color: "#00ffff", desc: "Absorbs damage. Upgrade for more durability.", icon: "\u{1F6E1}\u{FE0F}", maxLevel: 3, upgradeCost: 1500 },
    { id: 'laser', name: "PLASMA BEAM", cost: 100, color: "#ff00ff", desc: "High-power laser. Upgrade for longer duration.", icon: "\u26A1", maxLevel: 3, upgradeCost: 2000 },
    { id: 'regen', name: "NANO REPAIR", cost: 75, color: "#00ff00", desc: "Restores Hull Integrity. Upgrade for more healing.", icon: "\u2795", maxLevel: 3, upgradeCost: 1200 }
];
window.POWERUPS = POWERUPS;

// === PLAYER STATE ===
var player = { x: 0, y: 0, radius: 18, targetX: 0, targetY: 0, hp: 100, maxHp: 100, lastShot: 0, config: SHIPS[0], shieldHp: 0, laserTimer: 0, scoreMult: 1, scoreMultTimer: 0, combo: 0, comboTimer: 0, damage: 1 };

// === YOUTUBE PLAYABLES SDK WRAPPER ===
const YTPlayables = {
    firstFrameReady() { try { if (window.ytgame) ytgame.game.firstFrameReady(); } catch(e) {} },
    gameReady() { try { if (window.ytgame) ytgame.game.gameReady(); } catch(e) {} },
    onPause(cb) { try { if (window.ytgame) ytgame.system.onPause(cb); } catch(e) {} },
    onResume(cb) { try { if (window.ytgame) ytgame.system.onResume(cb); } catch(e) {} },
    onAudioEnabledChange(cb) { try { if (window.ytgame) ytgame.system.onAudioEnabledChange(cb); } catch(e) {} },
    async saveData(data) { try { if (window.ytgame) await ytgame.game.saveData(data); } catch(e) {} },
    async loadData() {
        try {
            if (window.ytgame) {
                const data = await ytgame.game.loadData();
                if (data && Object.keys(data).length > 0) return data;
            }
        } catch(e) {}
        return null;
    }
};
window.YTPlayables = YTPlayables;

// === SAVE SYSTEM ===
const SaveSystem = {
    key: 'galaxy_raider_save_v15',
    data: {
        coins: 0, 
        highScore: 0,
        unlockedShips: [0],
        currentShip: 0,
        shipLevels: { 0: 1, 1: 1, 2: 1, 3: 1 }, 
        powerupLevels: { shield: 1, laser: 1, regen: 1 },
        inventory: { shield: 0, laser: 0, regen: 0 },
        settings: { sfxVolume: 0.5, musicVolume: 0.5 }
    },
    load() {
        // Synchronous localStorage load
        const stored = localStorage.getItem(this.key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.data = { ...this.data, ...parsed };
                if (typeof this.data.settings.sfxVolume === 'undefined') this.data.settings.sfxVolume = 0.5;
                if (typeof this.data.settings.musicVolume === 'undefined') this.data.settings.musicVolume = 0.5;
                if(!this.data.inventory) this.data.inventory = { shield: 0, laser: 0, regen: 0 };
                if(typeof this.data.inventory.regen === 'undefined') this.data.inventory.regen = 0;
                if(!this.data.shipLevels) this.data.shipLevels = { 0: 1, 1: 1, 2: 1, 3: 1 };
                if(!this.data.powerupLevels) this.data.powerupLevels = { shield: 1, laser: 1, regen: 1 };
                if(typeof this.data.powerupLevels.regen === 'undefined') this.data.powerupLevels.regen = 1;
            } catch (e) { console.error("Save error"); }
        }
        this.applySettingsUI();
        // Async YouTube SDK load (may override)
        this._loadFromSDK();
    },
    async _loadFromSDK() {
        const data = await YTPlayables.loadData();
        if (data) {
            this.data = { ...this.data, ...data };
            this.applySettingsUI();
        }
    },
    save() { 
        const json = JSON.stringify(this.data);
        try { localStorage.setItem(this.key, json); } catch(e) {}
        YTPlayables.saveData(this.data);
    },
    applySettingsUI() {
        const sfxSlider = document.getElementById('sfx-slider');
        const musicSlider = document.getElementById('music-slider');
        if (sfxSlider) sfxSlider.value = this.data.settings.sfxVolume;
        if (musicSlider) musicSlider.value = this.data.settings.musicVolume;
        const sfxVal = document.getElementById('sfx-vol-val');
        const musicVal = document.getElementById('music-vol-val');
        if (sfxVal) sfxVal.innerText = Math.round(this.data.settings.sfxVolume * 100) + '%';
        if (musicVal) musicVal.innerText = Math.round(this.data.settings.musicVolume * 100) + '%';
    }
};
window.SaveSystem = SaveSystem;

// === SOUND MANAGER ===
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let soundCtx = null;
let musicInterval = null;
let musicNodes = [];
let masterGainNode = null, sfxGainNode = null, musicGainNode = null;

const SoundManager = {
    init: () => {
        if(!soundCtx) {
            soundCtx = new AudioCtx();
            masterGainNode = soundCtx.createGain(); masterGainNode.connect(soundCtx.destination);
            sfxGainNode = soundCtx.createGain(); sfxGainNode.connect(masterGainNode);
            musicGainNode = soundCtx.createGain(); musicGainNode.connect(masterGainNode);
            SoundManager.updateVolumes();
        }
        if(soundCtx.state === 'suspended') soundCtx.resume();
        if(SaveSystem.data.settings.musicVolume > 0 && musicNodes.length === 0) SoundManager.startMusic();
    },
    updateVolumes: () => {
        if(sfxGainNode) sfxGainNode.gain.setValueAtTime(SaveSystem.data.settings.sfxVolume, soundCtx.currentTime);
        if(musicGainNode) musicGainNode.gain.setValueAtTime(SaveSystem.data.settings.musicVolume * 0.5, soundCtx.currentTime); 
    },
    playTone: (freq, type, duration, volMultiplier = 1.0) => {
        if(!SaveSystem.data.settings.sfxVolume || !soundCtx) return;
        const osc = soundCtx.createOscillator(); const gain = soundCtx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, soundCtx.currentTime);
        gain.connect(sfxGainNode); osc.connect(gain);
        const finalVol = 0.2 * volMultiplier;
        gain.gain.setValueAtTime(finalVol, soundCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, soundCtx.currentTime + duration);
        osc.start(); osc.stop(soundCtx.currentTime + duration);
    },
    playShoot: () => { SoundManager.playTone(400, 'square', 0.15, 1.0); },
    playExplosion: () => {
        if(!SaveSystem.data.settings.sfxVolume || !soundCtx) return;
        const bufferSize = soundCtx.sampleRate * 0.5; const buffer = soundCtx.createBuffer(1, bufferSize, soundCtx.sampleRate);
        const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        const noise = soundCtx.createBufferSource(); noise.buffer = buffer;
        const filter = soundCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800;
        const gain = soundCtx.createGain(); gain.connect(sfxGainNode); noise.connect(filter); filter.connect(gain);
        gain.gain.setValueAtTime(0.8, soundCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, soundCtx.currentTime + 0.5);
        noise.start();
    },
    playPowerup: () => {
        if(!SaveSystem.data.settings.sfxVolume || !soundCtx) return;
        const osc = soundCtx.createOscillator(); const gain = soundCtx.createGain();
        gain.connect(sfxGainNode); osc.connect(gain);
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, soundCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, soundCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, soundCtx.currentTime); gain.gain.linearRampToValueAtTime(0, soundCtx.currentTime + 0.3);
        osc.start(); osc.stop(soundCtx.currentTime + 0.3);
    },
    playShieldHit: () => { SoundManager.playTone(150, 'sawtooth', 0.1, 0.5); },
    playUI: () => { SoundManager.playTone(800, 'sine', 0.05, 0.5); },
    playBeam: () => { SoundManager.playTone(100, 'sawtooth', 0.5, 1.5); },
    mute: () => {
        if(sfxGainNode && soundCtx) sfxGainNode.gain.setValueAtTime(0, soundCtx.currentTime);
        if(musicGainNode && soundCtx) musicGainNode.gain.setValueAtTime(0, soundCtx.currentTime);
    },
    startMusic: () => {
        if(SaveSystem.data.settings.musicVolume <= 0 || !soundCtx) return;
        SoundManager.stopMusic();
        const createDrone = (freq, type, pan) => {
            const osc = soundCtx.createOscillator(); const gain = soundCtx.createGain();
            const panner = soundCtx.createStereoPanner(); const filter = soundCtx.createBiquadFilter();
            osc.type = type; osc.frequency.setValueAtTime(freq, soundCtx.currentTime);
            filter.type = 'lowpass'; filter.frequency.value = 600; panner.pan.value = pan;
            gain.gain.setValueAtTime(0, soundCtx.currentTime); gain.gain.linearRampToValueAtTime(0.1, soundCtx.currentTime + 4); 
            osc.connect(filter); filter.connect(panner); panner.connect(gain); gain.connect(musicGainNode); 
            osc.start();
            const node = { stop: () => { try { const t = soundCtx.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + 2); osc.stop(t + 2.1); } catch(e) {} } };
            musicNodes.push(node);
        };
        createDrone(73.42, 'sine', 0); createDrone(110.00, 'sine', -0.5); createDrone(130.81, 'triangle', 0.5); createDrone(174.61, 'sine', 0.2); 
        const playSparkle = () => {
            if(SaveSystem.data.settings.musicVolume <= 0) return;
            const t = soundCtx.currentTime; const osc = soundCtx.createOscillator();
            const gain = soundCtx.createGain(); const panner = soundCtx.createStereoPanner();
            osc.type = 'sine';
            const notes = [587, 698, 880, 1046, 1174, 1396]; 
            const freq = notes[Math.floor(Math.random() * notes.length)];
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.05, t + 0.5); gain.gain.linearRampToValueAtTime(0, t + 2.5); 
            panner.pan.value = Math.random() * 2 - 1;
            osc.connect(panner); panner.connect(gain); gain.connect(musicGainNode);
            osc.start(t); osc.stop(t + 2.5);
        };
        musicInterval = setInterval(playSparkle, 3000);
    },
    stopMusic: () => {
        if(musicInterval) clearInterval(musicInterval);
        musicNodes.forEach(node => { try { node.stop(); } catch(e) {} });
        musicNodes = [];
    }
};
window.SoundManager = SoundManager;

// === DAMAGE PLAYER ===
function damagePlayer(amount) {
    if (player.shieldHp > 0) { 
        SoundManager.playShieldHit(); 
        player.shieldHp--; 
        if (window.updateHUD) window.updateHUD(); 
        if(window.phaserScene) window.phaserScene.cameras.main.shake(100, 0.005);
    } else { 
        player.hp -= amount; 
        if (window.updateHUD) window.updateHUD(); 
        if(window.phaserScene) window.phaserScene.cameras.main.shake(200, 0.01);
        if (player.hp <= 0 && window.game) window.game.gameOver(); 
    }
}
window.damagePlayer = damagePlayer;

// ==========================================
// PHASER SCENE
// ==========================================
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.stars = [];
        this.shakeTimer = 0;
        this.swarmTimer = 0;
        this.frameCounter = 0;
    }

    preload() {}

    create() {
        this.cameras.main.setBackgroundColor('#050510');

        // Generate Textures
        const g = this.add.graphics();
        
        // Player Ship 0
        g.clear(); g.fillStyle(0x00ffff); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(25, 5); g.lineTo(45, 45); g.lineTo(25, 35); g.lineTo(5, 45); g.closePath();
        g.fillPath(); g.strokePath();
        g.generateTexture('ship_0', 50, 50);

        // Player Ship 1
        g.clear(); g.fillStyle(0x00ff00); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(25, 5); g.lineTo(35, 20); g.lineTo(45, 10); g.lineTo(40, 45); g.lineTo(25, 35); g.lineTo(10, 45); g.lineTo(5, 10); g.lineTo(15, 20); g.closePath();
        g.fillPath(); g.strokePath();
        g.generateTexture('ship_1', 50, 50);

        // Player Ship 2
        g.clear(); g.fillStyle(0xffd700); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(20, 5); g.lineTo(30, 5); g.lineTo(45, 20); g.lineTo(45, 45); g.lineTo(35, 40); g.lineTo(15, 40); g.lineTo(5, 45); g.lineTo(5, 20); g.closePath();
        g.fillPath(); g.strokePath();
        g.generateTexture('ship_2', 50, 50);

        // Player Ship 3
        g.clear(); g.fillStyle(0x9933ff); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(25, 0); g.lineTo(30, 15); g.lineTo(48, 20); g.lineTo(40, 45); g.lineTo(25, 35); g.lineTo(10, 45); g.lineTo(2, 20); g.lineTo(20, 15); g.closePath();
        g.fillPath(); g.strokePath();
        g.generateTexture('ship_3', 50, 50);

        // Enemies
        g.clear(); g.fillStyle(0xff69b4); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(14, 28); g.lineTo(0, 7); g.lineTo(14, 0); g.lineTo(28, 7); g.closePath(); g.fillPath(); g.strokePath();
        g.generateTexture('enemy_scout', 28, 28);

        g.clear(); g.fillStyle(0xff0000); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(18, 36); g.lineTo(27, 18); g.lineTo(36, 0); g.lineTo(22, 9); g.lineTo(13, 9); g.lineTo(0, 0); g.lineTo(9, 18); g.closePath(); g.fillPath(); g.strokePath();
        g.generateTexture('enemy_fighter', 36, 36);

        g.clear(); g.fillStyle(0xcc0000); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(14, 56); g.lineTo(42, 56); g.lineTo(56, 28); g.lineTo(44, 0); g.lineTo(11, 0); g.lineTo(0, 28); g.closePath(); g.fillPath(); g.strokePath();
        g.generateTexture('enemy_tank', 56, 56);

        g.clear(); g.fillStyle(0xff9900); g.lineStyle(1, 0xffffff);
        g.beginPath(); g.moveTo(8, 0); g.lineTo(16, 8); g.lineTo(8, 20); g.lineTo(0, 8); g.closePath(); g.fillPath(); g.strokePath();
        g.generateTexture('enemy_swarm', 16, 20);

        // Asteroid
        g.clear(); g.fillStyle(0x888888); g.lineStyle(2, 0xaaaaaa);
        g.beginPath(); 
        for(let i=0; i<8; i++) {
            let a = (i/8)*Math.PI*2; let r = 20 + Math.random()*10;
            if(i===0) g.moveTo(Math.cos(a)*r + 30, Math.sin(a)*r + 30);
            else g.lineTo(Math.cos(a)*r + 30, Math.sin(a)*r + 30);
        }
        g.closePath(); g.fillPath(); g.strokePath();
        g.generateTexture('asteroid', 60, 60);

        g.destroy();

        // Stars
        this.stars = [];
        for(let i=0; i<150; i++) { 
            let color = Math.random() > 0.8 ? 0x00ffff : (Math.random() > 0.8 ? 0xff00ff : 0xffffff);
            let star = this.add.circle(
                Math.random() * VIRTUAL_WIDTH, 
                Math.random() * VIRTUAL_HEIGHT, 
                Math.random() * 2 + 0.5, 
                color
            );
            star.alpha = Math.random() * 0.5 + 0.3;
            star.speed = Math.random() * 2 + 0.5;
            this.stars.push(star); 
        }

        this.playerBullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.drops = this.physics.add.group();
        this.particles = this.add.group();

        this.player = this.physics.add.sprite(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 100, 'ship_0');
        this.player.setCircle(15, 10, 10);
        this.playerTarget = { x: this.player.x, y: this.player.y };
        
        // Input setup
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');
        
        this.touchActive = false;
        this.input.on('pointerdown', (pointer) => {
            if (currentState === GAME_STATE.PLAYING) {
                this.touchActive = true;
                this.playerTarget.x = pointer.worldX;
                this.playerTarget.y = pointer.worldY - 50;
            }
        });
        this.input.on('pointermove', (pointer) => {
            if (currentState === GAME_STATE.PLAYING) {
                this.playerTarget.x = pointer.worldX;
                this.playerTarget.y = this.touchActive ? pointer.worldY - 50 : pointer.worldY;
            }
        });
        this.input.on('pointerup', () => { this.touchActive = false; });

        this.physics.add.overlap(this.playerBullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.crashEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.drops, this.collectDrop, null, this);
        
        // Notify game system that Phaser is ready
        window.phaserScene = this;

        // Signal first frame to YouTube SDK
        YTPlayables.firstFrameReady();
    }

    startMission(shipId) {
        this.player.setTexture(`ship_${shipId}`);
        this.player.x = VIRTUAL_WIDTH / 2;
        this.player.y = VIRTUAL_HEIGHT - 100;
        this.playerTarget.x = this.player.x;
        this.playerTarget.y = this.player.y;
        this.frameCounter = 0;
        this.swarmTimer = 0;
        
        // Clear old entities
        this.enemies.clear(true, true);
        this.playerBullets.clear(true, true);
        this.enemyBullets.clear(true, true);
        this.drops.clear(true, true);
        this.particles.clear(true, true);
    }

    update(time, delta) {
        if (currentState !== GAME_STATE.PLAYING) return;
        
        this.frameCounter++;
        
        // Decrement timers
        if (player.laserTimer > 0) player.laserTimer--;
        if (player.scoreMultTimer > 0) { player.scoreMultTimer--; if (player.scoreMultTimer <= 0) { player.scoreMult = 1; if(window.updateHUD) window.updateHUD(); } }
        if (player.comboTimer > 0) { player.comboTimer--; if (player.comboTimer <= 0) { player.combo = 0; if(window.updateHUD) window.updateHUD(); } }
        
        // Stars
        this.stars.forEach(s => {
            s.y += s.speed * (delta / 16);
            if (s.y > VIRTUAL_HEIGHT) { s.y = 0; s.x = Math.random() * VIRTUAL_WIDTH; }
        });

        // Player Movement
        let dx = 0, dy = 0;
        if (this.keys.W.isDown || this.cursors.up.isDown) dy -= 1;
        if (this.keys.S.isDown || this.cursors.down.isDown) dy += 1;
        if (this.keys.A.isDown || this.cursors.left.isDown) dx -= 1;
        if (this.keys.D.isDown || this.cursors.right.isDown) dx += 1;
        
        if (dx !== 0 || dy !== 0) {
            let len = Math.hypot(dx, dy);
            this.playerTarget.x += (dx / len) * 8;
            this.playerTarget.y += (dy / len) * 8;
        }
        
        this.playerTarget.x = Phaser.Math.Clamp(this.playerTarget.x, 25, VIRTUAL_WIDTH - 25);
        this.playerTarget.y = Phaser.Math.Clamp(this.playerTarget.y, 25, VIRTUAL_HEIGHT - 25);
        
        this.player.x += (this.playerTarget.x - this.player.x) * 0.1;
        this.player.y += (this.playerTarget.y - this.player.y) * 0.1;
        
        // Bank angle
        const bank = (this.playerTarget.x - this.player.x) * 0.005;
        this.player.setRotation(Phaser.Math.Clamp(bank, -0.4, 0.4));
        
        // Fire logic
        const fireRate = player.laserTimer > 0 ? 5 : player.config.fireRate;
        if (this.frameCounter - player.lastShot > fireRate) {
            this.firePlayerBullet();
            player.lastShot = this.frameCounter;
        }

        // Spawn Enemies
        this.spawnEnemies();
        
        // Update Enemies
        this.enemies.getChildren().forEach(e => {
            e.y += e.speed;
            if (e.enemyType === 'swarm') {
                e.x += Math.sin(e.y * 0.1) * 2;
            } else if (e.enemyType === 'asteroid') {
                e.rotation += e.rotSpeed;
            } else {
                e.x += Math.sin(e.y * 0.02) * (e.enemyType === 'scout' ? 1.5 : 0.5);
                if (this.frameCounter > e.lastShot + e.fireRate && e.y > 0 && e.y < VIRTUAL_HEIGHT) {
                    this.fireEnemyBullet(e);
                    e.lastShot = this.frameCounter;
                }
            }
            if (e.y > VIRTUAL_HEIGHT + 50) e.destroy();
        });
        
        // Cleanup out-of-bounds
        this.playerBullets.getChildren().forEach(b => { 
            b.y += b.speed;
            if (b.y < -50) b.destroy(); 
        });
        this.enemyBullets.getChildren().forEach(b => { 
            b.y += b.speed;
            if (b.y > VIRTUAL_HEIGHT + 50) b.destroy(); 
        });
        this.drops.getChildren().forEach(d => {
            d.y += 2; d.x += Math.sin(d.y * 0.05);
            if (d.y > VIRTUAL_HEIGHT + 50) d.destroy();
        });
    }

    firePlayerBullet() {
        SoundManager.playShoot();
        const isLaser = player.laserTimer > 0;
        const color = isLaser ? 0xff00ff : 0xffff00;
        const speed = isLaser ? -20 : -15;
        const dmg = player.damage;
        const shipId = player.config.id;
        
        const createBullet = (x, y) => {
            let b = this.add.rectangle(x, y, 6, 16, color);
            this.physics.add.existing(b);
            b.speed = speed;
            b.damage = isLaser ? 3 : dmg;
            b.isLaser = isLaser;
            this.playerBullets.add(b);
        };

        if (shipId === 3) {
            // PHANTOM: Triple-gun
            createBullet(this.player.x, this.player.y - 20);
            createBullet(this.player.x - 20, this.player.y + 10);
            createBullet(this.player.x + 20, this.player.y + 10);
        } else {
            createBullet(this.player.x, this.player.y - 20);
        }
    }
    
    fireEnemyBullet(e) {
        SoundManager.playShoot();
        let b = this.add.rectangle(e.x, e.y + 20, 6, 16, 0xff0055);
        this.physics.add.existing(b);
        b.speed = 8;
        this.enemyBullets.add(b);
    }

    spawnEnemies() {
        const spawnMod = Math.max(0.5, 1.0 - (level * 0.05));
        const scoreFactor = Math.min(50, score/100); 
        let baseRate = Math.max(15, Math.floor((80 - scoreFactor) * spawnMod));
        
        this.swarmTimer++;
        if (this.swarmTimer > 500 * spawnMod) {
            this.swarmTimer = 0;
            const cx = Math.random() * (VIRTUAL_WIDTH - 150) + 75;
            for(let i=0; i<6; i++) {
                this.spawnEnemy(cx + (i-3)*30, -50, 'swarm');
            }
        }
        
        if (this.frameCounter % baseRate === 0) {
            const roll = Math.random();
            let type = 'scout';
            if (score > 1500 || level > 2) { 
                if (roll < 0.3) type = 'scout'; else if (roll < 0.6) type = 'fighter'; else if (roll < 0.8) type = 'tank'; else type = 'asteroid'; 
            } else if (score > 500 || level > 1) { 
                if (roll < 0.4) type = 'scout'; else if (roll < 0.7) type = 'fighter'; else type = 'asteroid'; 
            } else { 
                if (roll < 0.7) type = 'scout'; else type = 'asteroid'; 
            }
            this.spawnEnemy(Math.random() * (VIRTUAL_WIDTH - 80) + 40, -60, type);
        }
    }

    spawnEnemy(x, y, type) {
        const difficultyMultiplier = Math.min(3, 1 + (score / 2000) + (level * 0.2));
        let e;
        if (type === 'swarm') {
            e = this.physics.add.sprite(x, y, 'enemy_swarm');
            e.hp = 1; e.speed = (1.2 + Math.random()) * difficultyMultiplier; e.scoreVal = 5; e.fireRate = Infinity;
        } else if (type === 'asteroid') {
            e = this.physics.add.sprite(x, y, 'asteroid');
            e.hp = 4 * difficultyMultiplier; e.speed = (0.5 + Math.random() * 1.2) * difficultyMultiplier; 
            e.scoreVal = 15; e.fireRate = Infinity; e.rotSpeed = (Math.random() - 0.5) * 0.05;
        } else if (type === 'scout') {
            e = this.physics.add.sprite(x, y, 'enemy_scout');
            e.hp = 1 * difficultyMultiplier; e.speed = (1.0 + Math.random()) * difficultyMultiplier; 
            e.scoreVal = 10; e.fireRate = 120;
        } else if (type === 'fighter') {
            e = this.physics.add.sprite(x, y, 'enemy_fighter');
            e.hp = 2 * difficultyMultiplier; e.speed = (0.8 + Math.random()) * difficultyMultiplier; 
            e.scoreVal = 25; e.fireRate = 90;
        } else {
            e = this.physics.add.sprite(x, y, 'enemy_tank');
            e.hp = 8 * difficultyMultiplier; e.speed = 0.4 * difficultyMultiplier; 
            e.scoreVal = 100; e.fireRate = 240;
        }
        e.enemyType = type;
        e.lastShot = this.frameCounter + Math.random() * 60;
        this.enemies.add(e);
    }

    hitEnemy(bullet, enemy) {
        enemy.hp -= bullet.damage;
        bullet.destroy();
        if (enemy.hp <= 0) {
            SoundManager.playExplosion();
            player.combo++; player.comboTimer = 180;
            let val = Math.floor(enemy.scoreVal * player.scoreMult * (player.combo > 5 ? 1.5 : 1));
            score += val;
            
            if (score > level * 1500) {
                if (window.game) window.game.levelUp();
            }
            
            // Drop powerup (5% chance)
            if (Math.random() < 0.05) {
                let pType = Math.random() < 0.33 ? 'shield' : (Math.random() < 0.66 ? 'laser' : 'regen');
                let d = this.add.circle(enemy.x, enemy.y, 15, 0x00ff00);
                d.dropType = pType;
                this.physics.add.existing(d);
                this.drops.add(d);
            }
            
            // Tank always drops multiplier
            if (enemy.enemyType === 'tank') {
                let d = this.add.circle(enemy.x, enemy.y, 15, 0xffd700);
                d.dropType = 'multiplier';
                this.physics.add.existing(d);
                this.drops.add(d);
            }
            
            enemy.destroy();
            if (window.updateHUD) window.updateHUD();
        }
    }

    crashEnemy(playerSprite, enemy) {
        enemy.destroy();
        SoundManager.playExplosion();
        damagePlayer(20);
    }

    hitPlayer(playerSprite, bullet) {
        bullet.destroy();
        damagePlayer(10);
    }

    collectDrop(playerSprite, drop) {
        SoundManager.playPowerup();
        if (drop.dropType === 'multiplier') {
            player.scoreMult = 2;
            player.scoreMultTimer = 900;
        } else {
            SaveSystem.data.inventory[drop.dropType]++;
        }
        drop.destroy();
        if (window.updateHUD) window.updateHUD();
    }
}

// === PHASER CONFIG ===
const config = {
    type: Phaser.CANVAS,
    canvas: document.getElementById('gameCanvas'),
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: VIRTUAL_WIDTH,
        height: VIRTUAL_HEIGHT
    },
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    transparent: true,
    scene: [MainScene]
};

const phaserGame = new Phaser.Game(config);
