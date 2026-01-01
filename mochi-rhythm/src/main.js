const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const comboCountEl = document.getElementById('combo-count');
const comboContainer = document.getElementById('combo-container');
const judgmentText = document.getElementById('top-judgment-text') || document.getElementById('judgment-text');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameControls = document.getElementById('game-controls');
const finalMochiEl = document.getElementById('final-mochi');
const statNiceEl = document.getElementById('stat-nice');
const statMaxComboEl = document.getElementById('stat-max-combo');
const resultCommentEl = document.getElementById('result-comment');

// 和の伝統色
const COLORS = {
    sakura: '#fedfe1',
    kokin: '#f7c242',
    shu: '#eb6238',
    matsuba: '#3b7960',
    sora: '#77b5d9',
    beni: '#c53d43',
    shironeri: '#fcfaf2',
    wasurenagusa: '#7bced7'
};

// Assets
const images = {
    usu: new Image(),
    pile: new Image(),
    kinePre: new Image(),
    kineAfter: new Image(),
    handHuman: new Image(),
};

images.usu.src = '/mochi-rhythm/images/usu.png';
images.pile.src = '/mochi-rhythm/images/mochi_pile_white.png';
images.kinePre.src = '/mochi-rhythm/images/kine-human-pre.png';
images.kineAfter.src = '/mochi-rhythm/images/kine-human-after.png';
images.handHuman.src = '/mochi-rhythm/images/hand-human.png';

// サウンドマネージャー（失敗音のみ）
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.7;
        this.masterGain.connect(this.ctx.destination);
    }

    // 空振り音（軽いスカッ）
    playSka() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        // 風切り音的なノイズ
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);
    }

    // 失敗音（ガッカリ感のある下降音）
    playMiss() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        // 低い不協和音
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(180, t);
        osc1.frequency.exponentialRampToValueAtTime(80, t + 0.25);
        gain1.gain.setValueAtTime(0.2, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(t);
        osc1.stop(t + 0.35);

        // 不快な高音
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(350, t);
        osc2.frequency.exponentialRampToValueAtTime(150, t + 0.15);
        gain2.gain.setValueAtTime(0.08, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(t);
        osc2.stop(t + 0.25);

        // ノイズ成分
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.15;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.1, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
    }

    // 和風ファンファーレ（リザルト用）- より豪華に
    playFanfare() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;

        // 三和音を同時に鳴らす
        const chords = [
            { freq: 261.6, delay: 0 },     // ド
            { freq: 329.6, delay: 0.05 },  // ミ
            { freq: 392.0, delay: 0.1 },   // ソ
            { freq: 523.3, delay: 0.3 },   // 高いド
        ];

        chords.forEach(({ freq, delay }) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + delay);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.2, t + delay + 0.05);
            gain.gain.setValueAtTime(0.2, t + delay + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.01, t + delay + 0.8);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 1.5);
        });

        // キラキラ音
        for (let i = 0; i < 5; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const freq = 800 + Math.random() * 800;
            osc.frequency.setValueAtTime(freq, t + 0.5 + i * 0.1);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.08, t + 0.5 + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7 + i * 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 1.2);
        }
    }

    // ドラムロール（リザルト演出用）
    playDrumroll(duration = 1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const t = this.ctx.currentTime;
        const hits = Math.floor(duration * 30);

        for (let i = 0; i < hits; i++) {
            const hitTime = t + (i / hits) * duration;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100 + Math.random() * 30, hitTime);
            const volume = 0.05 + (i / hits) * 0.15;
            gain.gain.setValueAtTime(volume, hitTime);
            gain.gain.exponentialRampToValueAtTime(0.01, hitTime + 0.03);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(hitTime);
            osc.stop(hitTime + 0.05);
        }
    }
}

const sounds = new SoundManager();

// 桜の花びらクラス
class SakuraPetal {
    constructor(width, height) {
        this.reset(width, height, true);
    }
    reset(width, height, initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -20;
        this.size = 6 + Math.random() * 8;
        this.speedY = 0.5 + Math.random() * 1;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.05;
        this.alpha = 0.4 + Math.random() * 0.4;
    }
    update(width, height) {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.02) * 0.3;
        this.rotation += this.rotSpeed;
        if (this.y > height + 20) this.reset(width, height);
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = COLORS.sakura;
        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.bezierCurveTo(this.size / 2, -this.size / 4, this.size / 2, this.size / 4, 0, this.size / 2);
        ctx.bezierCurveTo(-this.size / 2, this.size / 4, -this.size / 2, -this.size / 4, 0, -this.size / 2);
        ctx.fill();
        ctx.restore();
    }
}

// 紙吹雪クラス（リザルト用）- より派手に
class Confetti {
    constructor(width, height, fromBottom = true) {
        this.x = Math.random() * width;
        this.y = fromBottom ? height + 20 : -20;
        this.size = 6 + Math.random() * 10;
        this.speedY = fromBottom ? -8 - Math.random() * 8 : 2 + Math.random() * 3;
        this.speedX = (Math.random() - 0.5) * 6;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.3;
        this.color = [COLORS.kokin, COLORS.shu, COLORS.matsuba, COLORS.sora, COLORS.sakura][Math.floor(Math.random() * 5)];
        this.life = 1;
        this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    }
    update() {
        this.y += this.speedY;
        this.speedY += 0.2;
        this.x += this.speedX;
        this.speedX *= 0.99;
        this.rotation += this.rotSpeed;
        this.life -= 0.006;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        if (this.shape === 'rect') {
            ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// 桜パーティクル（PERFECT用）
class SakuraParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12 - 4;
        this.life = 1.0;
        this.size = 5 + Math.random() * 8;
        this.rotation = Math.random() * Math.PI * 2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.25;
        this.vx *= 0.98;
        this.rotation += 0.15;
        this.life -= 0.025;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = COLORS.sakura;
        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.bezierCurveTo(this.size / 2, -this.size / 4, this.size / 2, this.size / 4, 0, this.size / 2);
        ctx.bezierCurveTo(-this.size / 2, this.size / 4, -this.size / 2, -this.size / 4, 0, -this.size / 2);
        ctx.fill();
        ctx.restore();
    }
}

// ゴールドパーティクル（コンボ・スコア用）
class GoldParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = -2 - Math.random() * 4;
        this.life = 1.0;
        this.size = 3 + Math.random() * 4;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.life -= 0.03;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = COLORS.kokin;
        ctx.shadowColor = COLORS.kokin;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 画面エフェクト管理
const screenEffects = {
    flash: { active: false, color: '', alpha: 0 },
    shake: { active: false, intensity: 0, duration: 0 }
};

function drawImageWithAspect(img, x, y, targetDim, useHeight = false, alignY = 'bottom') {
    if (!img.complete || img.width === 0) return;
    const aspect = img.width / img.height;
    let w, h;
    if (useHeight) {
        h = targetDim;
        w = h * aspect;
    } else {
        w = targetDim;
        h = w / aspect;
    }
    const drawY = alignY === 'bottom' ? y - h : y - h / 2;
    ctx.drawImage(img, x - w / 2, drawY, w, h);
}

// 判定エフェクト（リング拡大）
class HitEffect {
    constructor(x, y, color, judgment) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.judgment = judgment;
        this.life = 1.0;
        this.maxRadius = judgment === 'PERFECT' ? 80 : judgment === 'GREAT' ? 60 : 45;
    }
    update() {
        this.life -= 0.06;
    }
    draw() {
        if (this.life <= 0) return;
        const progress = 1 - this.life;
        const radius = this.maxRadius * progress;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 10 * this.life;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        if (this.judgment === 'PERFECT') {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.life * 0.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// レーン判定円の状態
const laneState = {
    left: { pressed: false, timer: 0, judgment: null },
    right: { pressed: false, timer: 0, judgment: null }
};

// エフェクト管理
const hitEffects = [];
const sakuraParticles = [];
const goldParticles = [];
let sakuraPetals = [];
let confettis = [];

// Note クラス
class Note {
    constructor(time, type) {
        this.time = time;
        this.type = type;
        this.hit = false;
        this.missed = false;
    }
    update(currentTime) {
        if (!this.hit && !this.missed && currentTime > this.time + JUDGMENT.MISS) {
            this.missed = true;
            applyJudgment('MISS');
        }
    }
    draw(currentTime, width, height, judgmentY) {
        if (this.hit || this.missed) return;
        const timeDiff = this.time - currentTime;
        const speed = (height * 0.8) / 1000;

        if (timeDiff > 1200 || timeDiff < -JUDGMENT.MISS) return;

        const centerX = width / 2;
        const laneOffset = 60;
        const x = this.type === 'usu' ? centerX - laneOffset : centerX + laneOffset;
        const y = judgmentY - (timeDiff * speed);

        const noteSize = 75;
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = this.type === 'usu' ? COLORS.kokin : COLORS.wasurenagusa;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, noteSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const emoji = this.type === 'usu' ? '🔨' : '✋';
        ctx.font = `${noteSize * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);

        ctx.restore();
    }
}

// Global State
let gameState = 'start', score = 0, combo = 0, maxCombo = 0, notes = [], startTime = 0, currentTime = 0, bgm = null;
let stats = { perfect: 0, great: 0, ok: 0, miss: 0 };
let currentDifficulty = 'normal';
const dpr = window.devicePixelRatio || 1;

const JUDGMENT = { PERFECT: 70, GREAT: 120, OK: 170, MISS: 240 };

const chartCache = {};

const mochi = {
    squishX: 1, squishY: 1, rotation: 0,
    impactTimer: 0, impactType: null,
    update() {
        this.squishX += (1 - this.squishX) * 0.15;
        this.squishY += (1 - this.squishY) * 0.15;
        this.rotation *= 0.85;
        if (this.impactTimer > 0) this.impactTimer--;
    },
    trigger(type) {
        this.impactType = type;
        this.impactTimer = 18;
        if (type === 'usu') {
            this.squishX = 1.5;
            this.squishY = 0.6;
        } else {
            this.rotation = Math.PI * 0.15;
            this.squishX = 0.85;
            this.squishY = 1.15;
        }
    },
    draw(width, height) {
        const centerX = width / 2;
        const baseH = height * 0.4;
        const groundY = height * 0.92;

        const kinePreH = baseH * 1.4;
        const kineW = kinePreH * (images.kinePre.width / images.kinePre.height || 1);
        const handW = baseH * (images.handHuman.width / images.handHuman.height || 1);
        const usuH = baseH * (2 / 3);
        const usuW = usuH * (images.usu.width / images.usu.height || 1);

        const spacingK = (kineW / 6) + (usuW * 0.5);
        const spacingH = (handW / 6) + (usuW * 0.5);

        ctx.save();

        drawImageWithAspect(images.usu, centerX, groundY, usuH, true);

        const isImpact = this.impactType === 'usu' && this.impactTimer > 0;
        const kineH = isImpact ? kinePreH * 0.85 : kinePreH;
        const kineImg = isImpact ? images.kineAfter : images.kinePre;
        drawImageWithAspect(kineImg, centerX - spacingK, groundY, kineH, true);

        ctx.save();
        if (this.impactType === 'hand' && this.impactTimer > 0) {
            ctx.translate(35, 0);
        }
        drawImageWithAspect(images.handHuman, centerX + spacingH, groundY, baseH, true);
        ctx.restore();

        ctx.restore();
    }
};

function resize() {
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    sakuraPetals = [];
    for (let i = 0; i < 25; i++) {
        sakuraPetals.push(new SakuraPetal(width, height));
    }
}
window.addEventListener('resize', resize);
resize();

async function loadChart(tempo) {
    if (chartCache[tempo]) return chartCache[tempo];
    const res = await fetch(`/mochi-rhythm/charts/${tempo}.json`);
    const data = await res.json();
    chartCache[tempo] = data;
    return data;
}

async function startGame(tempo) {
    gameState = 'playing';
    currentDifficulty = tempo;
    score = 0;
    combo = 0;
    maxCombo = 0;
    stats = { perfect: 0, great: 0, ok: 0, miss: 0 };
    confettis = [];
    sakuraParticles.length = 0;
    goldParticles.length = 0;
    hitEffects.length = 0;

    const chart = await loadChart(tempo);
    notes = chart.notes.map(n => new Note(n.time, n.type));
    console.log(`📜 譜面読み込み完了: ${tempo} (BPM: ${chart.meta.bpm}, ノート数: ${chart.meta.note_count})`);

    startTime = performance.now();
    updateUI();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameControls.classList.remove('hidden');
    if (bgm) bgm.pause();
    bgm = new Audio('/mochi-rhythm/sounds/main.wav');
    bgm.play();
    requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
    if (gameState !== 'playing') return;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const judgmentY = height * 0.72;

    currentTime = time - startTime;

    ctx.save();
    if (screenEffects.shake.active) {
        const shakeX = (Math.random() - 0.5) * screenEffects.shake.intensity;
        const shakeY = (Math.random() - 0.5) * screenEffects.shake.intensity;
        ctx.translate(shakeX, shakeY);
        screenEffects.shake.duration--;
        if (screenEffects.shake.duration <= 0) {
            screenEffects.shake.active = false;
        }
    }

    ctx.clearRect(-10, -10, width + 20, height + 20);

    sakuraPetals.forEach(petal => {
        petal.update(width, height);
        petal.draw(ctx);
    });

    drawStack(width, height);

    mochi.update();
    mochi.draw(width, height);

    drawBackground(width, height, judgmentY);
    drawJudgmentCircles(width, height, judgmentY);

    notes.forEach(n => n.update(currentTime));
    notes.forEach(n => n.draw(currentTime, width, height, judgmentY));

    // パーティクル
    for (let i = sakuraParticles.length - 1; i >= 0; i--) {
        sakuraParticles[i].update();
        sakuraParticles[i].draw(ctx);
        if (sakuraParticles[i].life <= 0) sakuraParticles.splice(i, 1);
    }

    for (let i = goldParticles.length - 1; i >= 0; i--) {
        goldParticles[i].update();
        goldParticles[i].draw(ctx);
        if (goldParticles[i].life <= 0) goldParticles.splice(i, 1);
    }

    // 画面フラッシュ
    if (screenEffects.flash.active) {
        ctx.fillStyle = screenEffects.flash.color;
        ctx.globalAlpha = screenEffects.flash.alpha;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        screenEffects.flash.alpha -= 0.06;
        if (screenEffects.flash.alpha <= 0) {
            screenEffects.flash.active = false;
        }
    }

    ctx.restore();

    if (notes.length > 0 && currentTime > notes[notes.length - 1].time + 2000) endGame();
    else requestAnimationFrame(gameLoop);
}

function drawBackground(width, height, judgmentY) {
    const centerX = width / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(centerX - 95, 0, 90, height);
    ctx.fillRect(centerX + 5, 0, 90, height);

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 95, 0);
    ctx.lineTo(centerX - 95, height);
    ctx.moveTo(centerX - 5, 0);
    ctx.lineTo(centerX - 5, height);
    ctx.moveTo(centerX + 5, 0);
    ctx.lineTo(centerX + 5, height);
    ctx.moveTo(centerX + 95, 0);
    ctx.lineTo(centerX + 95, height);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 100, judgmentY);
    ctx.lineTo(centerX + 100, judgmentY);
    ctx.stroke();
}

function drawJudgmentCircles(width, _height, judgmentY) {
    const centerX = width / 2;
    const laneOffset = 60;
    const leftX = centerX - laneOffset;
    const rightX = centerX + laneOffset;
    const circleRadius = 40;

    if (laneState.left.timer > 0) laneState.left.timer--;
    if (laneState.right.timer > 0) laneState.right.timer--;

    drawLaneCircle(leftX, judgmentY, circleRadius, COLORS.kokin, laneState.left);
    drawLaneCircle(rightX, judgmentY, circleRadius, COLORS.wasurenagusa, laneState.right);

    for (let i = hitEffects.length - 1; i >= 0; i--) {
        hitEffects[i].update();
        hitEffects[i].draw();
        if (hitEffects[i].life <= 0) hitEffects.splice(i, 1);
    }
}

function drawLaneCircle(x, y, radius, color, state) {
    ctx.save();

    const scale = state.timer > 0 ? 0.85 : 1;
    const glowIntensity = state.timer > 0 ? 0.9 : 0.3;

    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.5);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = glowIntensity;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = state.timer > 0 ? 6 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.globalAlpha = state.timer > 0 ? 0.5 : 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    if (state.timer > 0 && state.judgment) {
        ctx.globalAlpha = state.timer / 15;
        ctx.fillStyle = {
            'PERFECT': COLORS.kokin,
            'GREAT': COLORS.matsuba,
            'OK': COLORS.sora,
            'MISS': COLORS.beni
        }[state.judgment] || '#fff';
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(state.judgment, 0, 0);
        ctx.fillText(state.judgment, 0, 0);
    }

    ctx.restore();

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = '900 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = color === COLORS.kokin ? 'F' : 'J';
    ctx.strokeText(label, x, y + radius + 10);
    ctx.fillText(label, x, y + radius + 10);
    ctx.restore();
}

function drawStack(width, height) {
    if (!images.pile.complete || score === 0) return;

    const stacks = Math.floor(score / 10);
    const startX = 40;
    const baseLine = height - 30;
    const pileSize = 50;
    const verticalSpacing = 35;
    const horizontalSpacing = 55;

    for (let i = 0; i < stacks; i++) {
        const col = Math.floor(i / 8);
        const row = i % 8;
        const x = startX + col * horizontalSpacing;
        const y = baseLine - row * verticalSpacing;

        ctx.drawImage(images.pile, x - pileSize / 2, y - pileSize / 2, pileSize, pileSize);
    }
}

function onInput(inputType) {
    if (gameState !== 'playing') return;

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const judgmentY = height * 0.72;
    const centerX = width / 2;
    const laneOffset = 60;

    const isLeft = inputType === 'kine';
    const laneX = isLeft ? centerX - laneOffset : centerX + laneOffset;
    const lane = isLeft ? laneState.left : laneState.right;

    let closest = null, minD = Infinity;
    notes.forEach(n => {
        if (n.hit || n.missed) return;
        const d = Math.abs(n.time - currentTime);
        if (d < minD) { minD = d; closest = n; }
    });

    mochi.trigger(inputType === 'kine' ? 'usu' : 'hand');

    lane.pressed = true;
    lane.timer = 15;

    if (closest && minD < JUDGMENT.MISS) {
        const correct = (closest.type === 'usu' && inputType === 'kine') || (closest.type === 'hand' && inputType === 'hand');
        closest.hit = true;
        if (correct) {
            let judgment;
            if (minD < JUDGMENT.PERFECT) judgment = 'PERFECT';
            else if (minD < JUDGMENT.GREAT) judgment = 'GREAT';
            else judgment = 'OK';

            lane.judgment = judgment;
            applyJudgment(judgment, inputType, laneX, judgmentY);

            const effectColor = {
                'PERFECT': COLORS.kokin,
                'GREAT': COLORS.matsuba,
                'OK': COLORS.sora
            }[judgment];
            hitEffects.push(new HitEffect(laneX, judgmentY, effectColor, judgment));

            // PERFECT時は豪華なパーティクルエフェクト（画面フラッシュなし）
            if (judgment === 'PERFECT') {
                for (let i = 0; i < 15; i++) {
                    sakuraParticles.push(new SakuraParticle(laneX, judgmentY));
                }
                for (let i = 0; i < 8; i++) {
                    goldParticles.push(new GoldParticle(laneX, judgmentY));
                }
            } else if (judgment === 'GREAT') {
                // GREAT時も軽いエフェクト
                for (let i = 0; i < 5; i++) {
                    goldParticles.push(new GoldParticle(laneX, judgmentY));
                }
            }
        } else {
            lane.judgment = 'MISS';
            applyJudgment('MISS', inputType, laneX, judgmentY, true);
        }
    } else {
        lane.judgment = 'MISS';
        applyJudgment('MISS', inputType, laneX, judgmentY, true);
    }
}

function applyJudgment(type, input, laneX, judgmentY, isSka = false) {
    if (type === 'MISS') {
        combo = 0;
        stats.miss++;
        if (isSka) {
            sounds.playSka();
        } else {
            sounds.playMiss();
            screenEffects.shake.active = true;
            screenEffects.shake.intensity = 12;
            screenEffects.shake.duration = 8;
            screenEffects.flash.active = true;
            screenEffects.flash.color = COLORS.beni;
            screenEffects.flash.alpha = 0.35;
        }
    } else {
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        stats[type.toLowerCase()]++;
        score++;
        // 成功時はSEを鳴らさない（視覚エフェクトのみ）
    }
    showJudgment(type);
    updateUI();
}

function showJudgment(type) {
    judgmentText.textContent = type;
    judgmentText.style.color = {
        'PERFECT': COLORS.kokin,
        'GREAT': COLORS.matsuba,
        'OK': COLORS.sora,
        'MISS': COLORS.beni
    }[type];
    judgmentText.style.webkitTextStroke = "2px #000";
    judgmentText.style.opacity = '1';
    const anim = judgmentText.animate([
        { opacity: 0, transform: 'translate(-50%, 0) scale(0.5)' },
        { opacity: 1, transform: 'translate(-50%, -15px) scale(1.2)' },
        { opacity: 0, transform: 'translate(-50%, -30px) scale(1.3)' }
    ], 250);
    anim.onfinish = () => { judgmentText.style.opacity = '0'; };

    if (combo > 1) {
        comboContainer.classList.remove('hidden');
        const pulseScale = Math.min(1.8, 1.2 + combo * 0.03);
        comboCountEl.animate([
            { transform: `scale(${pulseScale})`, color: COLORS.kokin },
            { transform: 'scale(1)', color: '#000' }
        ], 180);
    } else {
        comboContainer.classList.add('hidden');
    }
}

function updateUI() {
    scoreEl.textContent = score;
    comboCountEl.textContent = combo;
}

function endGame() {
    gameState = 'gameOver';
    if (bgm) bgm.pause();
    gameControls.classList.add('hidden');

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // ドラムロール → ファンファーレ
    sounds.playDrumroll(0.8);
    setTimeout(() => {
        sounds.playFanfare();
    }, 900);

    // 紙吹雪を大量に発生
    for (let i = 0; i < 80; i++) {
        setTimeout(() => {
            confettis.push(new Confetti(width, height, true));
        }, i * 25);
    }

    // 上からも降らせる
    setTimeout(() => {
        for (let i = 0; i < 40; i++) {
            setTimeout(() => {
                confettis.push(new Confetti(width, height, false));
            }, i * 50);
        }
    }, 500);

    // 紙吹雪アニメーション
    function animateConfetti() {
        if (gameState !== 'gameOver') return;
        ctx.clearRect(0, 0, width, height);

        sakuraPetals.forEach(petal => {
            petal.update(width, height);
            petal.draw(ctx);
        });

        for (let i = confettis.length - 1; i >= 0; i--) {
            confettis[i].update();
            confettis[i].draw(ctx);
            if (confettis[i].life <= 0) confettis.splice(i, 1);
        }

        requestAnimationFrame(animateConfetti);
    }
    animateConfetti();

    // リザルト表示を遅延させてドラマチックに
    setTimeout(() => {
        showResult();
    }, 1000);
}

function showResult() {
    const totalNotes = stats.perfect + stats.great + stats.ok + stats.miss;
    const rate = totalNotes > 0 ? score / totalNotes : 0;
    const perfectRate = totalNotes > 0 ? stats.perfect / totalNotes : 0;

    // ランク計算
    let rank, rankClass;
    if (rate >= 0.95 && perfectRate >= 0.7) {
        rank = 'S'; rankClass = 'rank-s';
    } else if (rate >= 0.85) {
        rank = 'A'; rankClass = 'rank-a';
    } else if (rate >= 0.7) {
        rank = 'B'; rankClass = 'rank-b';
    } else {
        rank = 'C'; rankClass = 'rank-c';
    }

    // ランク表示
    const rankEl = document.getElementById('result-rank');
    rankEl.textContent = rank;
    rankEl.className = 'result-rank ' + rankClass;

    // 餅スタック表示（最大10個）
    const mochiStack = document.getElementById('mochi-stack');
    mochiStack.innerHTML = '';
    const stackCount = Math.min(Math.ceil(score / 5), 10);
    for (let i = 0; i < stackCount; i++) {
        const mochi = document.createElement('div');
        mochi.className = 'mochi-item';
        mochi.style.animationDelay = `${i * 0.1}s`;
        mochiStack.appendChild(mochi);
    }

    // 数字カウントアップアニメーション
    animateCounter(finalMochiEl, score, 800);

    const niceCount = stats.perfect + stats.great;
    setTimeout(() => {
        animateCounter(statNiceEl, niceCount, 500);
    }, 300);

    setTimeout(() => {
        animateCounter(statMaxComboEl, maxCombo, 500);
    }, 500);

    // PERFECT率表示
    const perfectRateEl = document.getElementById('stat-perfect-rate');
    setTimeout(() => {
        const pctValue = Math.round(perfectRate * 100);
        animateCounter(perfectRateEl, pctValue, 500);
        setTimeout(() => {
            perfectRateEl.textContent = pctValue + '%';
        }, 550);
    }, 700);

    // コメント生成（ランクに応じた詳細コメント）
    let comment = '';
    if (rank === 'S') {
        comment = '🎊 名人級の餅つき！完璧！ 🎊';
    } else if (rank === 'A') {
        comment = '✨ 素晴らしい腕前です！ ✨';
    } else if (rank === 'B') {
        comment = '👍 いい感じにつけました！';
    } else {
        comment = 'もっと練習して上を目指そう！';
    }

    setTimeout(() => {
        resultCommentEl.textContent = comment;
        resultCommentEl.animate([
            { opacity: 0, transform: 'scale(0.8)' },
            { opacity: 1, transform: 'scale(1.1)' },
            { opacity: 1, transform: 'scale(1)' }
        ], 400);
    }, 900);

    gameOverScreen.classList.remove('hidden');
    gameOverScreen.animate([
        { opacity: 0 },
        { opacity: 1 }
    ], 300);
}

function animateCounter(element, target, duration) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // イージング（最後がゆっくり）
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
            // 最後にポップエフェクト
            element.animate([
                { transform: 'scale(1.3)' },
                { transform: 'scale(1)' }
            ], 200);
        }
    }

    requestAnimationFrame(update);
}

function retryGame() {
    gameState = 'start';
    if (bgm) bgm.pause();
    gameControls.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    confettis = [];
}

window.addEventListener('keydown', (e) => {
    if (e.repeat || gameState !== 'playing') return;
    if (e.key === 'f' || e.key === 'F') { onInput('kine'); }
    if (e.key === 'j' || e.key === 'J') { onInput('hand'); }
});

canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr;
    const width = canvas.width / dpr;

    if (x < width / 2) {
        onInput('kine');
    } else {
        onInput('hand');
    }
});

document.getElementById('btn-kine').addEventListener('mousedown', () => onInput('kine'));
document.getElementById('btn-hand').addEventListener('mousedown', () => onInput('hand'));
document.getElementById('btn-retry').addEventListener('click', () => retryGame());
document.getElementById('start-easy').onclick = () => { sounds.ctx.resume(); startGame('easy'); };
document.getElementById('start-normal').onclick = () => { sounds.ctx.resume(); startGame('normal'); };
document.getElementById('start-hard').onclick = () => { sounds.ctx.resume(); startGame('hard'); };
document.getElementById('start-expert').onclick = () => { sounds.ctx.resume(); startGame('expert'); };
document.getElementById('restart-button').onclick = () => { gameOverScreen.classList.add('hidden'); confettis = []; startGame(currentDifficulty); };
document.getElementById('back-to-start-button').onclick = () => { startScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden'); confettis = []; };
document.getElementById('share-button').onclick = () => {
    const totalNotes = stats.perfect + stats.great + stats.ok + stats.miss;
    const rate = totalNotes > 0 ? score / totalNotes : 0;
    const perfectRate = totalNotes > 0 ? stats.perfect / totalNotes : 0;

    // ランク計算
    let rank;
    if (rate >= 0.95 && perfectRate >= 0.7) rank = 'S';
    else if (rate >= 0.85) rank = 'A';
    else if (rate >= 0.7) rank = 'B';
    else rank = 'C';

    const difficultyName = { easy: 'ゆっくり', normal: 'ふつう', hard: 'はやい', expert: 'おに' }[currentDifficulty];
    const rankEmoji = { S: '👑', A: '🌟', B: '✨', C: '💪' }[rank];
    const mochiEmoji = '🍡'.repeat(Math.min(Math.ceil(score / 10), 5));

    const text = `【もちリズム】${difficultyName}モード

${rankEmoji} ランク${rank} ${rankEmoji}
${mochiEmoji} ${score}個の餅をつきあげた！

🎯 PERFECT率: ${Math.round(perfectRate * 100)}%
🔥 最大コンボ: ${maxCombo}

#もちリズム`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`, '_blank');
};
