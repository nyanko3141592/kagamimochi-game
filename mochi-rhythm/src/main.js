const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const comboCountEl = document.getElementById('combo-count');
const comboContainer = document.getElementById('combo-container');
const judgmentText = document.getElementById('top-judgment-text') || document.getElementById('judgment-text');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameControls = document.getElementById('game-controls');
const finalScoreEl = document.getElementById('final-score');

const statPerfectEl = document.getElementById('stat-perfect');
const statGreatEl = document.getElementById('stat-great');
const statOkEl = document.getElementById('stat-ok');
const statMissEl = document.getElementById('stat-miss');

// Assets
const images = {
    usu: new Image(),
    pile: new Image(),
    kinePre: new Image(),
    kineAfter: new Image(),
    handHuman: new Image(),
    kineNote: new Image(),
    handNote: new Image(),
};

function processImage(img, callback) {
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) data[i + 3] = 0;
        }
        tempCtx.putImageData(imageData, 0, 0);
        const processedImg = new Image();
        processedImg.src = tempCanvas.toDataURL();
        callback(processedImg);
    };
}

const rawUsu = new Image(); rawUsu.src = '/mochi-rhythm/images/usu.png';
const rawPile = new Image(); rawPile.src = '/mochi-rhythm/images/mochi_pile_white.png';
const rawKinePre = new Image(); rawKinePre.src = '/mochi-rhythm/images/kine-human-pre.png';
const rawKineAfter = new Image(); rawKineAfter.src = '/mochi-rhythm/images/kine-human-after.png';
const rawHandHuman = new Image(); rawHandHuman.src = '/mochi-rhythm/images/hand-human.png';
const rawKineNote = new Image(); rawKineNote.src = '/mochi-rhythm/images/kine_white.png';
const rawHandNote = new Image(); rawHandNote.src = '/mochi-rhythm/images/hand_white.png';

processImage(rawUsu, (img) => images.usu = img);
processImage(rawPile, (img) => images.pile = img);
processImage(rawKinePre, (img) => images.kinePre = img);
processImage(rawKineAfter, (img) => images.kineAfter = img);
processImage(rawHandHuman, (img) => images.handHuman = img);
processImage(rawKineNote, (img) => images.kineNote = img);
processImage(rawHandNote, (img) => images.handNote = img);

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
    }
    playHit() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    playClap() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(700, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    playPerfect() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
    playMiss() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
}

const sounds = new SoundManager();

// Helper to draw image maintaining aspect ratio and centering/grounding correctly
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

// Particle
class Particle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 12; this.vy = (Math.random() - 0.5) * 12;
        this.life = 1.0; this.size = 2 + Math.random() * 6;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.3; this.life -= 0.04; }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.life})`;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}

// Vertical Note
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

        // Note Circle Background
        ctx.fillStyle = this.type === 'usu' ? '#feca57' : '#ff4757';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, noteSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Icon
        const img = this.type === 'usu' ? images.kineNote : images.handNote;
        const iconSize = noteSize * 0.75;
        if (img.complete) ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);

        ctx.restore();
    }
}

// Global State
let gameState = 'start', score = 0, combo = 0, maxCombo = 0, notes = [], startTime = 0, currentTime = 0, bgm = null;
let stats = { perfect: 0, great: 0, ok: 0, miss: 0 };
const dpr = window.devicePixelRatio || 1;

const BPM_CONFIG = { middle: 120, high: 170 };
const JUDGMENT = { PERFECT: 70, GREAT: 120, OK: 170, MISS: 240 };

const mochi = {
    squishX: 1, squishY: 1, rotation: 0,
    impactTimer: 0, impactType: null, particles: [],
    update() {
        this.squishX += (1 - this.squishX) * 0.2; this.squishY += (1 - this.squishY) * 0.2; this.rotation *= 0.8;
        if (this.impactTimer > 0) this.impactTimer--;
        this.particles.forEach((p, i) => { p.update(); if (p.life <= 0) this.particles.splice(i, 1); });
    },
    trigger(type) {
        this.impactType = type; this.impactTimer = 15;
        const width = canvas.width / dpr, height = canvas.height / dpr;
        const judgmentY = height * 0.7;
        const groundY = judgmentY + 80;
        if (type === 'usu') {
            this.squishX = 1.4; this.squishY = 0.7;
            for (let i = 0; i < 15; i++) this.particles.push(new Particle(width / 2, groundY - 60));
        } else {
            this.rotation = Math.PI * 0.2; this.squishX = 0.9; this.squishY = 1.1;
        }
    },
    draw(width, height, judgmentY) {
        const centerX = width / 2;
        // Base H for the right human
        const baseH = height * 0.4;
        const groundY = height * 0.92;

        // Calculate actual widths from heights and aspect ratios to ensure precise overlap
        const kinePreH = baseH * 1.4;
        const kineW = kinePreH * (images.kinePre.width / images.kinePre.height || 1);
        const handW = baseH * (images.handHuman.width / images.handHuman.height || 1);
        const usuH = baseH * (2 / 3);
        const usuW = usuH * (images.usu.width / images.usu.height || 1);

        // Calculate spacing for 1/3 image overlap: spacing = centerOfChar to centerOfUsu
        // Overlap = (w_char/2 + w_usu/2) - spacing = w_char / 3
        const spacingK = (kineW / 6) + (usuW * 0.5);
        const spacingH = (handW / 6) + (usuW * 0.5);

        ctx.save();

        // 1. Usu (Furthest Back)
        drawImageWithAspect(images.usu, centerX, groundY, usuH, true);

        // 2. Mochi (Inside Usu)
        const mochiY = groundY - (usuH * 0.65);
        const mochiSize = usuH * 0.38;
        ctx.save();
        ctx.translate(centerX, mochiY);
        ctx.rotate(this.rotation); ctx.scale(this.squishX, this.squishY);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, mochiSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();

        // 3. Left Human (Kine) - Overlaps Usu
        const isImpact = this.impactType === 'usu' && this.impactTimer > 0;
        const kineH = isImpact ? kinePreH * 0.9 : kinePreH;
        const kineImg = isImpact ? images.kineAfter : images.kinePre;
        drawImageWithAspect(kineImg, centerX - spacingK, groundY, kineH, true);

        // 4. Right Human (Hand) - Overlaps Usu
        ctx.save();
        if (this.impactType === 'hand' && this.impactTimer > 0) ctx.translate(30, 0);
        drawImageWithAspect(images.handHuman, centerX + spacingH, groundY, baseH, true);
        ctx.restore();

        // 5. Input Labels (Top layer)
        ctx.fillStyle = '#feca57'; ctx.strokeStyle = '#000'; ctx.lineWidth = 8; ctx.font = '900 80px Outfit, sans-serif';
        ctx.textAlign = 'center'; ctx.strokeText('F', centerX - spacingK, groundY + 60); ctx.fillText('F', centerX - spacingK, groundY + 60);

        ctx.fillStyle = '#ff4757'; ctx.strokeStyle = '#000'; ctx.lineWidth = 8; ctx.font = '900 80px Outfit, sans-serif';
        ctx.textAlign = 'center'; ctx.strokeText('J', centerX + spacingH, groundY + 60); ctx.fillText('J', centerX + spacingH, groundY + 60);

        ctx.restore();
        this.particles.forEach(p => p.draw());
    }
};

function resize() {
    const parent = canvas.parentElement;
    const width = parent.clientWidth; const height = parent.clientHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

function startGame(tempo) {
    gameState = 'playing'; score = 0; combo = 0; maxCombo = 0;
    stats = { perfect: 0, great: 0, ok: 0, miss: 0 };
    const duration = tempo === 'middle' ? 207000 : 193000;
    notes = generateChart(BPM_CONFIG[tempo], duration);
    startTime = performance.now(); updateUI();
    startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); gameControls.classList.remove('hidden');
    if (bgm) bgm.pause();
    bgm = new Audio(tempo === 'middle' ? '/mochi-rhythm/sounds/middle.mp3' : '/mochi-rhythm/sounds/high.mp3');
    bgm.play();
    requestAnimationFrame(gameLoop);
}

function generateChart(bpm, durationMs) {
    const list = []; const beatMs = 60000 / bpm; const duration = durationMs - 5000;
    let isUsu = true;
    for (let t = 3000; t < duration; t += beatMs) {
        if (Math.random() < 0.05 && !isUsu) { isUsu = true; continue; }
        list.push(new Note(t, isUsu ? 'usu' : 'hand'));
        if (isUsu && Math.random() < 0.15) list.push(new Note(t + beatMs / 2, 'usu'));
        isUsu = !isUsu;
    }
    return list;
}

function gameLoop(time) {
    if (gameState !== 'playing') return;
    const width = canvas.width / dpr, height = canvas.height / dpr;
    // Judgment happens slightly above the mortar mouth
    const judgmentY = height * 0.72;

    currentTime = time - startTime;
    ctx.clearRect(0, 0, width, height);

    drawBackground(width, height, judgmentY);
    drawStack(width, height);
    mochi.update();
    mochi.draw(width, height, judgmentY);

    notes.forEach(n => n.update(currentTime));
    notes.forEach(n => n.draw(currentTime, width, height, judgmentY));

    if (notes.length > 0 && currentTime > notes[notes.length - 1].time + 2000) endGame();
    else requestAnimationFrame(gameLoop);
}

function drawBackground(width, height, judgmentY) {
    const centerX = width / 2;
    // Lanes
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(centerX - 95, 0, 90, height);
    ctx.fillRect(centerX + 5, 0, 90, height);

    // Lane lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 95, 0); ctx.lineTo(centerX - 95, height);
    ctx.moveTo(centerX - 5, 0); ctx.lineTo(centerX - 5, height);
    ctx.moveTo(centerX + 5, 0); ctx.lineTo(centerX + 5, height);
    ctx.moveTo(centerX + 95, 0); ctx.lineTo(centerX + 95, height);
    ctx.stroke();
}

function drawStack(width, height) {
    const piles = Math.floor(score / 10);
    const individuals = score % 10;
    const startX = 70;
    const baseLine = height - 160; // Up from bottom to avoid clutter

    // Draw 10-mochi piles
    const pileSize = 90;
    for (let i = 0; i < piles; i++) {
        const col = Math.floor(i / 10);
        const row = i % 10;
        const x = startX + col * 95;
        const y = baseLine - row * 30;

        if (images.pile.complete) {
            ctx.drawImage(images.pile, x - pileSize / 2, y - pileSize / 2, pileSize, pileSize);
        }
    }

    // Draw current Accumulating
    const mWidth = 46, mHeight = 22;
    const nextCol = Math.floor(piles / 10);
    const nextX = startX + nextCol * 95;
    const nextYBase = baseLine - (piles % 10) * 30 + 20;

    for (let j = 0; j < individuals; j++) {
        const y = nextYBase - j * 7;
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(nextX, y, mWidth / 2, mHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function onInput(inputType) {
    if (gameState !== 'playing') return;
    let closest = null, minD = Infinity;
    notes.forEach(n => {
        if (n.hit || n.missed) return;
        const d = Math.abs(n.time - currentTime);
        if (d < minD) { minD = d; closest = n; }
    });
    if (closest && minD < JUDGMENT.MISS) {
        const correct = (closest.type === 'usu' && inputType === 'kine') || (closest.type === 'hand' && inputType === 'hand');
        closest.hit = true;
        if (correct) {
            mochi.trigger(closest.type);
            if (minD < JUDGMENT.PERFECT) applyJudgment('PERFECT', inputType);
            else if (minD < JUDGMENT.GREAT) applyJudgment('GREAT', inputType);
            else applyJudgment('OK', inputType);
        } else applyJudgment('MISS', inputType);
    }
}

function applyJudgment(type, input) {
    if (type === 'MISS') { combo = 0; stats.miss++; sounds.playMiss(); }
    else {
        combo++; if (combo > maxCombo) maxCombo = combo;
        stats[type.toLowerCase()]++; score++;
        if (type === 'PERFECT') sounds.playPerfect();
        else input === 'kine' ? sounds.playHit() : sounds.playClap();
    }
    showJudgment(type); updateUI();
}

function showJudgment(type) {
    judgmentText.textContent = type;
    judgmentText.style.color = { 'PERFECT': '#feca57', 'GREAT': '#badc58', 'OK': '#48dbfb', 'MISS': '#ff4757' }[type];
    judgmentText.style.webkitTextStroke = "2px #000";
    judgmentText.animate([{ opacity: 0, transform: 'translate(-50%, 0) scale(0.5)' }, { opacity: 1, transform: 'translate(-50%, -15px) scale(1.2)' }, { opacity: 0, transform: 'translate(-50%, -30px) scale(1.3)' }], 250);
    if (combo > 1) { comboContainer.classList.remove('hidden'); comboCountEl.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], 100); }
    else comboContainer.classList.add('hidden');
}

function updateUI() { scoreEl.textContent = score; comboCountEl.textContent = combo; }

function endGame() {
    gameState = 'gameOver'; if (bgm) bgm.pause();
    gameControls.classList.add('hidden');
    finalScoreEl.textContent = score;
    statPerfectEl.textContent = stats.perfect; statGreatEl.textContent = stats.great; statOkEl.textContent = stats.ok; statMissEl.textContent = stats.miss;
    gameOverScreen.classList.remove('hidden');
}

window.addEventListener('keydown', (e) => {
    if (e.repeat || gameState !== 'playing') return;
    if (e.key === 'f' || e.key === 'F') { onInput('kine'); }
    if (e.key === 'j' || e.key === 'J') { onInput('hand'); }
});

// Click detection on characters
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

function animateBtn(id) {
    const b = document.getElementById(id); if (!b) return;
    b.style.transform = 'translateY(10px)'; b.style.boxShadow = '0 0 0 #000';
    setTimeout(() => { b.style.transform = ''; b.style.boxShadow = ''; }, 100);
}

document.getElementById('btn-kine').addEventListener('mousedown', () => onInput('kine'));
document.getElementById('btn-hand').addEventListener('mousedown', () => onInput('hand'));
document.getElementById('start-middle').onclick = () => { sounds.ctx.resume(); startGame('middle'); };
document.getElementById('start-high').onclick = () => { sounds.ctx.resume(); startGame('high'); };
document.getElementById('restart-button').onclick = () => { startScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden'); };
document.getElementById('share-button').onclick = () => {
    const text = `もちリズムで ${score} 個の餅をつき上げた！ #もちリズム`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`, '_blank');
};
