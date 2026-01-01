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

images.usu = new Image(); images.usu.src = '/mochi-rhythm/images/usu.png';
images.pile = new Image(); images.pile.src = '/mochi-rhythm/images/mochi_pile_white.png';
images.kinePre = new Image(); images.kinePre.src = '/mochi-rhythm/images/kine-human-pre.png';
images.kineAfter = new Image(); images.kineAfter.src = '/mochi-rhythm/images/kine-human-after.png';
images.handHuman = new Image(); images.handHuman.src = '/mochi-rhythm/images/hand-human.png';
images.kineNote = new Image(); images.kineNote.src = '/mochi-rhythm/images/kine_white.png';
images.handNote = new Image(); images.handNote.src = '/mochi-rhythm/images/hand_white.png';

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
    playSka() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
        osc.connect(gain); gain.connect(this.masterGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.15);
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
    constructor(x, y, color = '#fff') {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 12; this.vy = (Math.random() - 0.5) * 12;
        this.life = 1.0; this.size = 2 + Math.random() * 6;
        this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.3; this.life -= 0.04; }
    draw() {
        ctx.fillStyle = this.color.replace(')', `, ${this.life})`).replace('rgb', 'rgba');
        if (this.color.startsWith('#')) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.life})`;
        }
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}

// 判定エフェクト（リング拡大）
class HitEffect {
    constructor(x, y, color, judgment) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.judgment = judgment;
        this.life = 1.0;
        this.maxRadius = judgment === 'PERFECT' ? 60 : judgment === 'GREAT' ? 50 : 40;
    }
    update() {
        this.life -= 0.08;
    }
    draw() {
        if (this.life <= 0) return;
        const progress = 1 - this.life;
        const radius = this.maxRadius * progress;
        const alpha = this.life;

        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 6 * this.life;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 内側の光
        if (this.judgment === 'PERFECT') {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha * 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * 0.5, 0, Math.PI * 2);
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

        // Emoji Icon
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
const dpr = window.devicePixelRatio || 1;

const JUDGMENT = { PERFECT: 70, GREAT: 120, OK: 170, MISS: 240 };

// 譜面データキャッシュ
const chartCache = {};

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

        // 2. Left Human (Kine) - Overlaps Usu
        const isImpact = this.impactType === 'usu' && this.impactTimer > 0;
        const kineH = isImpact ? kinePreH * 0.9 : kinePreH;
        const kineImg = isImpact ? images.kineAfter : images.kinePre;
        drawImageWithAspect(kineImg, centerX - spacingK, groundY, kineH, true);

        // 3. Right Human (Hand) - Overlaps Usu
        ctx.save();
        if (this.impactType === 'hand' && this.impactTimer > 0) ctx.translate(30, 0);
        drawImageWithAspect(images.handHuman, centerX + spacingH, groundY, baseH, true);
        ctx.restore();

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

async function loadChart(tempo) {
    if (chartCache[tempo]) return chartCache[tempo];
    const res = await fetch(`/mochi-rhythm/charts/${tempo}.json`);
    const data = await res.json();
    chartCache[tempo] = data;
    return data;
}

async function startGame(tempo) {
    gameState = 'playing'; score = 0; combo = 0; maxCombo = 0;
    stats = { perfect: 0, great: 0, ok: 0, miss: 0 };

    // JSON譜面を読み込み
    const chart = await loadChart(tempo);
    notes = chart.notes.map(n => new Note(n.time, n.type));
    console.log(`📜 譜面読み込み完了: ${tempo} (BPM: ${chart.meta.bpm}, ノート数: ${chart.meta.note_count})`);

    startTime = performance.now(); updateUI();
    startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); gameControls.classList.remove('hidden');
    if (bgm) bgm.pause();
    bgm = new Audio('/mochi-rhythm/sounds/main.wav');
    bgm.play();
    requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
    if (gameState !== 'playing') return;
    const width = canvas.width / dpr, height = canvas.height / dpr;
    // Judgment happens slightly above the mortar mouth
    const judgmentY = height * 0.72;

    currentTime = time - startTime;
    ctx.clearRect(0, 0, width, height);

    drawStack(width, height);

    mochi.update();
    mochi.draw(width, height, judgmentY);

    // レーンと判定円を臼より前面に描画
    drawBackground(width, height, judgmentY);
    drawJudgmentCircles(width, height, judgmentY);

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

    // 判定ライン（横線）
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 100, judgmentY);
    ctx.lineTo(centerX + 100, judgmentY);
    ctx.stroke();
}

// レーンごとの判定円を描画
function drawJudgmentCircles(width, _height, judgmentY) {
    const centerX = width / 2;
    const laneOffset = 60;
    const leftX = centerX - laneOffset;
    const rightX = centerX + laneOffset;
    const circleRadius = 40;

    // タイマー更新
    if (laneState.left.timer > 0) laneState.left.timer--;
    if (laneState.right.timer > 0) laneState.right.timer--;

    // 左レーン（杵 - 黄色）
    drawLaneCircle(leftX, judgmentY, circleRadius, '#feca57', laneState.left);

    // 右レーン（手 - 赤）
    drawLaneCircle(rightX, judgmentY, circleRadius, '#ff4757', laneState.right);

    // ヒットエフェクト描画
    hitEffects.forEach((e, i) => {
        e.update();
        e.draw();
        if (e.life <= 0) hitEffects.splice(i, 1);
    });
}

function drawLaneCircle(x, y, radius, color, state) {
    ctx.save();

    // 押下時のスケール
    const scale = state.timer > 0 ? 0.85 : 1;
    const glowIntensity = state.timer > 0 ? 0.8 : 0.3;

    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 外側のグロー
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.5);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = glowIntensity;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // メインの円（枠線）
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = state.timer > 0 ? 6 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 内側の薄い塗り
    ctx.fillStyle = color;
    ctx.globalAlpha = state.timer > 0 ? 0.4 : 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // 判定テキスト（押した時）
    if (state.timer > 0 && state.judgment) {
        ctx.globalAlpha = state.timer / 15;
        ctx.fillStyle = {
            'PERFECT': '#feca57',
            'GREAT': '#badc58',
            'OK': '#48dbfb',
            'MISS': '#ff4757'
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

    // キーラベル（円の下に表示）
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.font = '900 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = color === '#feca57' ? 'F' : 'J';
    ctx.strokeText(label, x, y + radius + 10);
    ctx.fillText(label, x, y + radius + 10);
    ctx.restore();
}

function drawStack(width, height) {
    if (!images.pile.complete || score === 0) return;

    const stacks = Math.floor(score / 10);  // 10個で1スタック
    const startX = 40;
    const baseLine = height - 30;
    const pileSize = 50;
    const verticalSpacing = 35;  // 縦の間隔
    const horizontalSpacing = 55;  // 横の間隔（列）

    // スタック数だけ画像を表示（縦に積む）
    for (let i = 0; i < stacks; i++) {
        const col = Math.floor(i / 8);  // 8個で次の列へ
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

    // どのレーンか
    const isLeft = inputType === 'kine';
    const laneX = isLeft ? centerX - laneOffset : centerX + laneOffset;
    const lane = isLeft ? laneState.left : laneState.right;

    let closest = null, minD = Infinity;
    notes.forEach(n => {
        if (n.hit || n.missed) return;
        const d = Math.abs(n.time - currentTime);
        if (d < minD) { minD = d; closest = n; }
    });

    // Visual feedback always triggers
    mochi.trigger(inputType === 'kine' ? 'usu' : 'hand');

    // レーン状態を更新
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
            applyJudgment(judgment, inputType);

            // ヒットエフェクト追加
            const effectColor = {
                'PERFECT': '#feca57',
                'GREAT': '#badc58',
                'OK': '#48dbfb'
            }[judgment];
            hitEffects.push(new HitEffect(laneX, judgmentY, effectColor, judgment));

            // パーティクル追加（PERFECT時）
            if (judgment === 'PERFECT') {
                for (let i = 0; i < 8; i++) {
                    mochi.particles.push(new Particle(laneX, judgmentY));
                }
            }
        } else {
            // Wrong lane
            lane.judgment = 'MISS';
            applyJudgment('MISS', inputType, true);
        }
    } else {
        // Dry fire (Ska)
        lane.judgment = 'MISS';
        applyJudgment('MISS', inputType, true);
    }
}

function applyJudgment(type, input, isSka = false) {
    if (type === 'MISS') {
        combo = 0; stats.miss++;
        if (isSka) {
            sounds.playSka(); // Distinct sound for missing notes entirely
        } else {
            sounds.playMiss(); // Sound for hitting but at wrong time/lane
        }
    }
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
    judgmentText.style.opacity = '1';
    const anim = judgmentText.animate([
        { opacity: 0, transform: 'translate(-50%, 0) scale(0.5)' },
        { opacity: 1, transform: 'translate(-50%, -15px) scale(1.2)' },
        { opacity: 0, transform: 'translate(-50%, -30px) scale(1.3)' }
    ], 250);
    anim.onfinish = () => { judgmentText.style.opacity = '0'; };
    if (combo > 1) { comboContainer.classList.remove('hidden'); comboCountEl.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], 100); }
    else comboContainer.classList.add('hidden');
}

function updateUI() { scoreEl.textContent = score; comboCountEl.textContent = combo; }

function endGame() {
    gameState = 'gameOver';
    if (bgm) bgm.pause();
    gameControls.classList.add('hidden');

    // 餅の個数 = スコア
    finalMochiEl.textContent = score;

    // ナイスタイミング = PERFECT + GREAT
    const niceCount = stats.perfect + stats.great;
    statNiceEl.textContent = niceCount;

    // 最大コンボ
    statMaxComboEl.textContent = maxCombo;

    // コメント生成
    const totalNotes = stats.perfect + stats.great + stats.ok + stats.miss;
    const rate = totalNotes > 0 ? score / totalNotes : 0;
    let comment = '';
    if (rate >= 0.95) {
        comment = '名人級の餅つき！お見事！';
    } else if (rate >= 0.8) {
        comment = 'いい感じにつけました！';
    } else if (rate >= 0.6) {
        comment = 'まずまずの出来栄え！';
    } else if (rate >= 0.4) {
        comment = 'もう少し練習しよう！';
    } else {
        comment = '餅つきは難しい...！';
    }
    resultCommentEl.textContent = comment;

    gameOverScreen.classList.remove('hidden');
}

function retryGame() {
    gameState = 'start';
    if (bgm) bgm.pause();
    gameControls.classList.add('hidden');
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
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
document.getElementById('btn-retry').addEventListener('click', () => retryGame());
document.getElementById('start-easy').onclick = () => { sounds.ctx.resume(); startGame('easy'); };
document.getElementById('start-normal').onclick = () => { sounds.ctx.resume(); startGame('normal'); };
document.getElementById('start-hard').onclick = () => { sounds.ctx.resume(); startGame('hard'); };
document.getElementById('restart-button').onclick = () => { startScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden'); };
document.getElementById('share-button').onclick = () => {
    const niceCount = stats.perfect + stats.great;
    const text = `餅つきゲーム「もちリズム」で${score}個の餅をつきました！

ナイスタイミング: ${niceCount}回
最大コンボ: ${maxCombo}

#もちリズム`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`, '_blank');
};
