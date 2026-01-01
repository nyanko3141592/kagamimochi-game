/**
 * DARUMA ROLL - Infinite Runner (New Year Edition)
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const bestScoreValue = document.getElementById('best-score-value');
const bestScoreLabel = document.getElementById('best-score-label');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const shareBtn = document.getElementById('share-btn');
const startScreen = document.getElementById('start-screen');
const resultScreen = document.getElementById('result-screen');

const HIGH_SCORE_KEY = 'daruma_roll_best_score';

// --- Sound System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playJumpSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playLandSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playEventSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.05);
    osc.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playGameOverSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function playNewBestSound() {
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
    });
}

function getBestScore() {
    return parseFloat(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
}

function setBestScore(score) {
    const currentBest = getBestScore();
    if (score > currentBest) {
        localStorage.setItem(HIGH_SCORE_KEY, score);
        return true;
    }
    return false;
}

const EVENTS = [
    { month: 1, day: 7, label: "七草粥到達！無病息災！", short: "七草粥超え", emoji: "🌿" },
    { month: 1, day: 12, label: "成人の日！大人になっても休み！", short: "成人の日超え", emoji: "👘" },
    { month: 1, day: 15, label: "小正月！休みはまだ続く！", short: "小正月超え", emoji: "🎍" },
    { month: 2, day: 3, label: "節分突破！鬼も逃げ出す休み！", short: "節分超え", emoji: "👹" },
    { month: 2, day: 14, label: "バレンタイン越え！愛より休み！", short: "バレンタイン超え", emoji: "🍫" },
    { month: 3, day: 3, label: "ひな祭り！健やかなる連休！", short: "ひな祭り超え", emoji: "🎎" },
    { month: 3, day: 15, label: "卒業シーズン！仕事も卒業！？", short: "卒業シーズン", emoji: "🎓" },
    { month: 4, day: 1, label: "四月馬鹿！仕事再開は嘘だ！", short: "4月バカ超え", emoji: "🃏" },
    { month: 4, day: 6, label: "入学式！新しい休みの始まり！", short: "入学式超え", emoji: "🏫" },
    { month: 4, day: 10, label: "お花見！酒と桜と永遠の休暇！", short: "お花見超え", emoji: "🌸" },
    { month: 5, day: 1, label: "GW突入！真の黄金週間へ！", short: "GW突入", emoji: "✨" },
    { month: 5, day: 5, label: "こどもの日！大人も遊べ！", short: "こどもの日超え", emoji: "🎏" },
    { month: 5, day: 10, label: "母の日！母に感謝しながら休み！", short: "母の日超え", emoji: "🌹" },
    { month: 6, day: 15, label: "梅雨！雨ニモ負ケズ休み！", short: "梅雨入り", emoji: "🐸" },
    { month: 6, day: 21, label: "父の日！父もたまには休め！", short: "父の日超え", emoji: "👔" },
    { month: 7, day: 7, label: "七夕！天の川超えて逃亡！", short: "七夕超え", emoji: "🌌" },
    { month: 8, day: 1, label: "夏祭り！屋台も休みもハシゴ！", short: "夏祭り突入", emoji: "🏮" },
    { month: 8, day: 15, label: "盆休み！伝説の長期休暇へ…", short: "盆休み超え", emoji: "🎆" },
    { month: 9, day: 30, label: "お月見！団子食って寝る！", short: "お月見超え", emoji: "🎑" },
    { month: 10, day: 12, label: "運動会！爆走は終わらない！", short: "運動会超え", emoji: "🏃" },
    { month: 10, day: 31, label: "ハロウィン！仕事はお化け！", short: "ハロウィン超え", emoji: "👻" },
    { month: 11, day: 15, label: "七五三！健やかなる逃亡生活！", short: "七五三超え", emoji: "🎈" },
    { month: 12, day: 25, label: "メリークリスマス！一年間完走！", short: "Xmas完走", emoji: "🎄" },
    { month: 12, day: 31, label: "大晦日！歴史的な正月休みへ！", short: "1年逃亡！", emoji: "🔔" }
];

// 単位を日付と日数に変換する関数
function formatScoreDetailed(score) {
    const startDate = new Date(2026, 0, 1);
    const daysToAdd = Math.floor(score / 25);
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + daysToAdd);

    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const year = targetDate.getFullYear();

    let dateStr = `${month}/${day}`;
    if (year > 2026) dateStr = `${year}/${month}/${day}`;

    // 現在の日付にピッタリ合うイベント
    const currentEvent = EVENTS.find(e => e.month === month && e.day === day);

    // 直近で通過したイベント（shortラベル用）
    let lastPassedEvent = null;
    for (let i = EVENTS.length - 1; i >= 0; i--) {
        const e = EVENTS[i];
        const eDate = new Date(2026, e.month - 1, e.day);
        if (targetDate > eDate) {
            lastPassedEvent = e;
            break;
        }
    }

    return {
        days: daysToAdd,
        dateStr: dateStr,
        comment: currentEvent ? `\n${currentEvent.label}` : "",
        lastPassedLabel: lastPassedEvent ? ` ✨ ${lastPassedEvent.short}！` : ""
    };
}

// イベントマーカークラス
class EventMarker {
    constructor(event, scoreTrigger) {
        this.event = event;
        this.scoreTrigger = scoreTrigger;
        this.worldX = scoreTrigger * 20;
        this.x = 0;
        this.y = 0;
        this.spawned = false;
        this.passed = false;
    }
    update(speed, currentWorldX, currentScore) {
        this.x = (this.worldX - currentWorldX) + 120;
        if (!this.passed && currentScore > this.scoreTrigger) {
            this.passed = true;
            playEventSound();
        }
    }
    draw(ctx, worldX) {
        if (this.x < -100 || this.x > canvas.width + 100) return;

        const groundY = getGroundY(this.x, worldX);
        ctx.save();
        ctx.textAlign = 'center';

        // 旗のポール
        ctx.strokeStyle = '#2D3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, groundY);
        ctx.lineTo(this.x, groundY - 100);
        ctx.stroke();

        // 絵文字フラッグ
        ctx.font = '30px serif';
        ctx.fillText(this.event.emoji, this.x, groundY - 110);

        // ラベル
        ctx.font = 'bold 12px "Kiwi Maru"';
        ctx.fillStyle = '#2D3436';
        ctx.fillText(`${this.event.month}/${this.event.day}`, this.x, groundY - 90);

        ctx.restore();
    }
}

// 画像アセットのロード
const images = {
    daruma: new Image(),
    taka: new Image(),
    nasu: new Image()
};
images.daruma.src = new URL('./daruma.png', import.meta.url).href;
images.taka.src = new URL('./taka.png', import.meta.url).href;
images.nasu.src = new URL('./nasu.png', import.meta.url).href;

// ゲーム設定
const SETTINGS = {
    GRAVITY: 0.8,
    JUMP_STRENGTH: -16,
    BASE_GROUND_Y: 100,
    TERRAIN_AMPLITUDE: 30,
    TERRAIN_WAVELENGTH: 0.005,
    INITIAL_SPEED: 9,
    SPEED_INCREMENT: 0.002,
    SPAWN_INTERVAL: 1400,
};

let gameState = {
    isRunning: false,
    score: 0,
    speed: SETTINGS.INITIAL_SPEED,
    lastSpawnTime: 0,
    obstacles: [],
    particles: [],
    speedLines: [],
    eventMarkers: [],
    shakeIntensity: 0,
    daruma: {
        x: 120,
        y: 0,
        vy: 0,
        radius: 28,
        rotation: 0,
        isJumping: false
    }
};

// パーティクルクラス
class Particle {
    constructor(x, y, color, size, vx, vy, life = 1.0) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.decay = Math.random() * 0.02 + 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

// スピードライン
class SpeedLine {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = canvas.width + Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.length = Math.random() * 100 + 50;
        this.speed = Math.random() * 15 + 10;
        this.opacity = Math.random() * 0.5 + 0.1;
    }
    update(gameSpeed) {
        this.x -= (this.speed + gameSpeed);
        if (this.x < -this.length) {
            this.reset();
            this.x = canvas.width;
        }
    }
    draw(ctx) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.length, this.y);
        ctx.stroke();
    }
}

// 地面の高さを取得する関数
function getGroundY(x, worldX) {
    const absoluteX = x + worldX;
    const wave = Math.sin(absoluteX * SETTINGS.TERRAIN_WAVELENGTH) * SETTINGS.TERRAIN_AMPLITUDE;
    const peaks = Math.max(0, Math.sin(absoluteX * 0.001) - 0.7) * 300;
    return canvas.height - SETTINGS.BASE_GROUND_Y - wave - peaks;
}

// 障害物クラス
class Obstacle {
    constructor(type, x) {
        this.type = type;
        this.x = x;
        this.width = 50;
        this.height = 50;
        this.y = 0;

        if (type === 'taka') {
            this.width = 90;
            this.height = 70;
        } else if (type === 'nasu') {
            this.width = 50;
            this.height = 70;
        }
    }

    update(speed, worldX) {
        this.x -= speed;
        if (this.type === 'nasu') {
            this.y = getGroundY(this.x + this.width / 2, worldX) - this.height;
        } else {
            this.y = getGroundY(this.x + this.width / 2, worldX) - 180;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        let img = null;
        if (this.type === 'taka') img = images.taka;
        else if (this.type === 'nasu') img = images.nasu;

        if (img && img.complete) {
            ctx.drawImage(img, 0, 0, this.width, this.height);
        } else {
            ctx.fillStyle = this.type === 'taka' ? '#744D2A' : '#6C5CE7';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.restore();
    }
}

function resize() {
    canvas.width = 900;
    canvas.height = 450;
}
window.addEventListener('resize', resize);
resize();

function spawnObstacle(now) {
    if (!gameState.nextSpawnTime) {
        gameState.nextSpawnTime = now + SETTINGS.SPAWN_INTERVAL;
    }

    if (now > gameState.nextSpawnTime) {
        // 速度に応じた基本間隔（ms）
        const baseIntervalMs = SETTINGS.SPAWN_INTERVAL / (gameState.speed / 6);
        const jitter = (Math.random() - 0.5) * baseIntervalMs * 0.4;

        // クラスター（連続）は難易度が高くなりすぎないよう低確率かつ最大2連まで
        const isCluster = Math.random() < 0.15 && gameState.speed < 18;
        const count = isCluster ? 2 : 1;

        let lastSpawnX = canvas.width + 100;

        for (let i = 0; i < count; i++) {
            const types = ['taka', 'nasu'];
            const type = types[Math.floor(Math.random() * types.length)];

            // 物理的な最小距離（ピクセル）を計算
            // 速度が速いほど、反応時間を確保するために距離を離す
            const minGapScore = 200 + (gameState.speed * 12);
            const currentX = i === 0 ? lastSpawnX : lastSpawnX + minGapScore + Math.random() * 150;

            gameState.obstacles.push(new Obstacle(type, currentX));
            lastSpawnX = currentX;
        }

        gameState.lastSpawnTime = now;
        // 次回の出現までの時間を設定
        const nextGap = baseIntervalMs + jitter + (isCluster ? baseIntervalMs * 0.7 : 0);
        gameState.nextSpawnTime = now + nextGap;
    }
}

function handleInput() {
    if (!gameState.isRunning) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!gameState.daruma.isJumping) {
        playJumpSound();
        gameState.daruma.vy = SETTINGS.JUMP_STRENGTH;
        gameState.daruma.isJumping = true;
        for (let i = 0; i < 5; i++) {
            gameState.particles.push(new Particle(
                gameState.daruma.x,
                gameState.daruma.y + gameState.daruma.radius,
                '#FFF',
                Math.random() * 4 + 2,
                (Math.random() - 0.5) * 5,
                Math.random() * 2,
                0.8
            ));
        }
    }
}

function checkCollision(daruma, obs) {
    const closestX = Math.max(obs.x, Math.min(daruma.x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(daruma.y, obs.y + obs.height));
    const distanceX = daruma.x - closestX;
    const distanceY = daruma.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared < (daruma.radius * daruma.radius * 0.8);
}

function loop(time) {
    if (!gameState.isRunning) return;

    const worldX = gameState.score * 20;

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#FF4B2B');
    gradient.addColorStop(1, '#FF9068');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // スピードライン
    gameState.speedLines.forEach(line => {
        line.update(gameState.speed);
        line.draw(ctx);
    });

    // カメラ揺れ
    ctx.save();
    if (gameState.shakeIntensity > 0) {
        ctx.translate((Math.random() - 0.5) * gameState.shakeIntensity, (Math.random() - 0.5) * gameState.shakeIntensity);
        gameState.shakeIntensity *= 0.9;
    }

    // 地面の描画
    ctx.beginPath();
    ctx.moveTo(0, getGroundY(0, worldX));
    for (let x = 0; x <= canvas.width; x += 10) {
        ctx.lineTo(x, getGroundY(x, worldX));
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fillStyle = '#FFF';
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.stroke();

    // 飾りの雲
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 3; i++) {
        const cx = (worldX * 0.2 + i * 400) % (canvas.width + 200) - 100;
        ctx.beginPath();
        ctx.arc(cx, 100, 30, 0, Math.PI * 2);
        ctx.arc(cx + 40, 100, 40, 0, Math.PI * 2);
        ctx.arc(cx + 80, 100, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    // マーカーの描画
    gameState.eventMarkers.forEach(m => {
        m.update(gameState.speed, worldX, gameState.score);
        m.draw(ctx, worldX);
    });

    // だるまの更新
    gameState.daruma.vy += SETTINGS.GRAVITY;
    gameState.daruma.y += gameState.daruma.vy;

    const currentGroundY = getGroundY(gameState.daruma.x, worldX) - gameState.daruma.radius;
    if (gameState.daruma.y > currentGroundY) {
        // 着地
        if (gameState.daruma.isJumping && gameState.daruma.vy > 5) {
            playLandSound();
            gameState.shakeIntensity = 5;
            for (let i = 0; i < 8; i++) {
                gameState.particles.push(new Particle(
                    gameState.daruma.x,
                    gameState.daruma.y + gameState.daruma.radius,
                    '#DDD',
                    Math.random() * 5 + 2,
                    (Math.random() - 0.5) * 10,
                    -Math.random() * 5
                ));
            }
        }
        gameState.daruma.y = currentGroundY;
        gameState.daruma.vy = 0;
        gameState.daruma.isJumping = false;
    }

    if (!gameState.daruma.isJumping && Math.random() < 0.3) {
        gameState.particles.push(new Particle(
            gameState.daruma.x - 20,
            gameState.daruma.y + gameState.daruma.radius,
            '#DDD',
            Math.random() * 3 + 1,
            -gameState.speed * 0.5,
            -Math.random() * 2
        ));
    }

    gameState.daruma.rotation += gameState.speed * 0.15;

    // 障害物の更新
    spawnObstacle(time);
    gameState.obstacles.forEach((obs, index) => {
        obs.update(gameState.speed, worldX);
        obs.draw(ctx);
        if (checkCollision(gameState.daruma, obs)) {
            gameOver();
        }
        if (obs.x < -200) {
            gameState.obstacles.splice(index, 1);
        }
    });

    // パーティクルの更新と描画
    gameState.particles.forEach((p, index) => {
        p.update();
        p.draw(ctx);
        if (p.life <= 0) gameState.particles.splice(index, 1);
    });

    // だるま描画
    ctx.save();
    ctx.translate(gameState.daruma.x, gameState.daruma.y);
    ctx.rotate(gameState.daruma.rotation);
    if (images.daruma.complete) {
        const drawSize = gameState.daruma.radius * 2.5;
        ctx.drawImage(images.daruma, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, gameState.daruma.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FF4B2B';
        ctx.fill();
    }
    ctx.restore();

    ctx.restore();

    // スコアとスピードアップ
    gameState.score += gameState.speed * 0.05;
    gameState.speed += SETTINGS.SPEED_INCREMENT;
    const info = formatScoreDetailed(gameState.score);
    scoreDisplay.innerText = `${info.days}日逃亡 (${info.dateStr})${info.lastPassedLabel}`;

    requestAnimationFrame(loop);
}

function gameOver() {
    playGameOverSound();
    gameState.isRunning = false;
    resultScreen.classList.remove('hidden');
    const info = formatScoreDetailed(gameState.score);
    finalScore.innerHTML = `<span class="days-num">${info.days}</span>日逃亡<br><span class="date-str">${info.dateStr}まで守り抜いた！</span><div class="event-comment">${info.comment}</div>`;

    const isNewBest = setBestScore(gameState.score);
    const bestInfo = formatScoreDetailed(getBestScore());
    bestScoreValue.innerText = `${bestInfo.days}日 (${bestInfo.dateStr})`;

    if (isNewBest) {
        bestScoreLabel.classList.add('new-best');
        bestScoreLabel.innerText = '最長記録更新!';
        setTimeout(() => playNewBestSound(), 300);
    } else {
        bestScoreLabel.classList.remove('new-best');
        bestScoreLabel.innerText = '最長記録';
    }
}

function initGame() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const startWorldX = 0;
    const startY = getGroundY(120, startWorldX) - 28;

    const markers = EVENTS.map(e => {
        const target = new Date(2026, e.month - 1, e.day);
        const start = new Date(2026, 0, 1);
        const days = (target - start) / (1000 * 60 * 60 * 24);
        return new EventMarker(e, days * 25);
    });

    gameState = {
        isRunning: true,
        score: 0,
        speed: SETTINGS.INITIAL_SPEED,
        lastSpawnTime: performance.now(),
        obstacles: [],
        particles: [],
        speedLines: Array.from({ length: 20 }, () => new SpeedLine()),
        eventMarkers: markers,
        nextSpawnTime: 0,
        shakeIntensity: 0,
        daruma: {
            x: 120,
            y: startY,
            vy: 0,
            radius: 28,
            rotation: 0,
            isJumping: false
        }
    };
    requestAnimationFrame(loop);
}

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    initGame();
});

restartBtn.addEventListener('click', () => {
    resultScreen.classList.add('hidden');
    initGame();
});

shareBtn.addEventListener('click', () => {
    const info = formatScoreDetailed(gameState.score);
    const text = `DARUMA ROLLで正月休みを【${info.days}日間】死守しました！
${info.dateStr}まで逃亡成功！
#DARUMAROLL #初夢脱出爆走 #正月バカゲー`;
    const url = "https://game.nya3neko2.dev/daruma-game/";
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInput();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleInput();
});
