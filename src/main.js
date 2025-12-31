import Matter from 'matter-js';

const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

// 音声合成クラス
class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // 全体の音量
        this.enabled = false;
    }

    enable() {
        if (!this.enabled) {
            this.ctx.resume().then(() => {
                this.enabled = true;
            });
        }
    }

    playTone(freq, type, duration, startTime = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playSpawn() {
        // ポンッ
        this.playTone(300, 'sine', 0.1);
        this.playTone(450, 'sine', 0.1, 0.05);
    }

    playDrop() {
        // ヒュッ
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playLand(size = 'normal') {
        // ドスン
        this.playTone(100, 'square', 0.2);
        this.playTone(50, 'sine', 0.3);
    }

    playPerfect() {
        // キラリーン
        this.playTone(880, 'sine', 0.4, 0);
        this.playTone(1108, 'sine', 0.4, 0.05);
        this.playTone(1320, 'sine', 0.4, 0.1);
    }

    playGood() {
        // コトン
        this.playTone(300, 'triangle', 0.1);
    }

    playGameOver() {
        // ジャーン...
        this.playTone(400, 'sawtooth', 1.5, 0);
        this.playTone(300, 'sawtooth', 1.5, 0.2);
        this.playTone(200, 'sawtooth', 1.5, 0.4);

        // エフェクト的なピッチダウン
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
    }
}

const sounds = new SoundManager();

const CONFIG = {
    MOCHI_WIDTH: 140,
    MOCHI_HEIGHT: 50,
    MOVE_SPEED: 4,
    // 落下距離 = 餅5個分
    DROP_MOCHI_COUNT: 5,
};

const COMPARISONS = [
    { threshold: 0, text: "正月の始まり。" },
    { threshold: 1, text: "まずは1段目！縁起がいいね。" },
    { threshold: 3, text: "膝の高さを超えた！" },
    { threshold: 10, text: "人間と同じ高さ！デカい。" },
    { threshold: 20, text: "キリンと同じくらいの高さ！" },
    { threshold: 50, text: "5階建てビルを超えた！" },
    { threshold: 100, text: "奈良の大仏を超えた！" },
    { threshold: 333, text: "東京タワーを超えた！" },
    { threshold: 634, text: "スカイツリーに到達！" },
    { threshold: 1000, text: "富士山より高い鏡餅！" },
    { threshold: 5000, text: "宇宙へ...神の領域。" }
];

let game = null;

function init() {
    const canvas = document.getElementById('game-canvas');
    const width = canvas.clientWidth || 400;
    const height = canvas.clientHeight || 700;
    canvas.width = width;
    canvas.height = height;

    const engine = Engine.create({
        gravity: { x: 0, y: 1 }
    });

    const render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width,
            height,
            wireframes: false,
            background: 'transparent',
        }
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    // 台座の位置（画面下部に固定）
    const baseTopY = height - 130;

    game = {
        engine,
        render,
        runner,
        canvas,
        width,
        height,
        score: 0,
        state: 'idle',
        currentMochi: null,
        mochiState: 'none', // none, moving, dropping, settling
        stackedMochis: [],
        moveDir: 1,
        moveX: width / 2,
        cameraY: 0,
        baseTopY,
        baseBottomY: height - 40,
        shake: 0,
        particles: [],
        combo: 0,
        maxCombo: 0,
        perfectCount: 0
    };

    createBase();
    setupEvents();
    gameLoop();
}

function createBase() {
    const { engine, width, baseTopY } = game;
    const cx = width / 2;

    // 台座上部（餅を置く横長の台）
    const platform = Bodies.rectangle(cx, baseTopY, 180, 20, {
        isStatic: true,
        label: 'base',
        render: { fillStyle: '#1F1F24', strokeStyle: '#333333', lineWidth: 0 }
    });

    // 台座下部（正方形の土台）
    const stand = Bodies.rectangle(cx, baseTopY + 50, 100, 80, {
        isStatic: true,
        label: 'base',
        render: { fillStyle: '#1F1F24', strokeStyle: '#333333', lineWidth: 0 }
    });

    Composite.add(engine.world, [platform, stand]);
}

function setupEvents() {
    const { canvas } = game;

    document.getElementById('start-button').onclick = (e) => {
        e.stopPropagation();
        startGame();
    };
    document.getElementById('restart-button').onclick = (e) => {
        e.stopPropagation();
        restartGame();
    };
    document.getElementById('share-button').onclick = (e) => {
        e.stopPropagation();
        share();
    };

    // タップで落下
    const onTap = (e) => {
        if (game.state !== 'playing') return;
        if (e.target.tagName === 'BUTTON') return;
        if (e.target.closest('.overlay')) return;
        e.preventDefault();
        dropMochi();
    };

    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchend', onTap);

    // 衝突検知
    Events.on(game.engine, 'collisionStart', handleCollision);
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');

    game.score = 0;
    game.state = 'playing';
    game.stackedMochis = [];
    game.combo = 0;
    game.maxCombo = 0;
    game.perfectCount = 0;
    game.moveX = game.width / 2;
    game.cameraY = 0;

    document.getElementById('score').textContent = '0';
    document.getElementById('comparison-text').textContent = '目指せ、富士山！';

    spawnMochi();
    updateBackground();

    // 初回インタラクションでAudioContext再開
    sounds.enable();
}

function restartGame() {
    // 餅を全削除
    const bodies = Composite.allBodies(game.engine.world);
    bodies.forEach(b => {
        if (b.label === 'mochi' || b.label === 'orange' || b.label === 'leaf') {
            Composite.remove(game.engine.world, b);
        }
    });
    Composite.allConstraints(game.engine.world).forEach(c => {
        Composite.remove(game.engine.world, c);
    });
    game.particles.forEach(p => Composite.remove(game.engine.world, p.body));
    game.particles = [];

    // エフェクトテキスト削除
    document.querySelectorAll('.effect-text').forEach(el => el.remove());

    game.currentMochi = null;
    game.mochiState = 'none';
    startGame();
}

function getTopMochiY() {
    // 一番上の餅のY座標を取得（なければ台座上面）
    if (game.stackedMochis.length > 0) {
        const topMochi = game.stackedMochis.reduce((t, m) =>
            m.position.y < t.position.y ? m : t
        );
        return topMochi.position.y;
    }
    return game.baseTopY;
}

function spawnMochi() {
    if (game.state !== 'playing') return;

    const { engine, width } = game;

    // 一番上の餅から餅5個分上にスポーン
    const topY = getTopMochiY();
    const dropDistance = CONFIG.MOCHI_HEIGHT * CONFIG.DROP_MOCHI_COUNT;
    const spawnY = topY - dropDistance;

    // 角丸の餅を作成（高さの50%の角丸）
    const mochi = Bodies.rectangle(width / 2, spawnY, CONFIG.MOCHI_WIDTH, CONFIG.MOCHI_HEIGHT, {
        chamfer: { radius: CONFIG.MOCHI_HEIGHT * 0.5 },
        isStatic: false,
        friction: 0.9,
        frictionStatic: 1.0,
        restitution: 0.01,
        density: 0.003,
        label: 'mochi',
        render: {
            fillStyle: '#FFFFFF',
            strokeStyle: '#C8C0B0',
            lineWidth: 3
        }
    });

    Composite.add(engine.world, mochi);

    game.currentMochi = mochi;
    game.mochiState = 'moving';
    game.moveX = width / 2;
    // 難易度調整: スコアに応じてスピードアップ (初期値4, 最大12)
    const speed = Math.min(CONFIG.MOVE_SPEED + (game.score * 0.2), 12);
    game.moveDir = Math.random() < 0.5 ? 1 : -1;
    game.currentSpeed = speed;

    // カメラを更新して餅が見えるようにする
    updateCamera();

    // スポーン音
    sounds.playSpawn();
}

function dropMochi() {
    if (game.mochiState !== 'moving' || !game.currentMochi) return;

    const mochi = game.currentMochi;
    game.mochiState = 'dropping';

    // 初速を与える
    Body.setVelocity(mochi, { x: 0, y: 5 });

    sounds.playDrop();
}

function handleCollision(event) {
    if (game.state !== 'playing') return;

    for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB];
        const mochi = game.currentMochi;

        if (!mochi || game.mochiState !== 'dropping') continue;

        // 台座か積まれた餅に着地
        const isCurrent = bodies.includes(mochi);
        const landedOn = bodies.find(b =>
            b.label === 'base' ||
            (b.label === 'mochi' && b !== mochi && game.stackedMochis.includes(b))
        );

        if (isCurrent && landedOn) {
            onLanded(mochi);
            return;
        }
    }
}

function onLanded(mochi) {
    if (game.mochiState !== 'dropping') return;
    game.mochiState = 'settling';

    let settledStartTime = null;
    const SETTLED_DURATION = 100; // 0.1秒間静止を維持

    // 速度と回転が十分に小さくなるまで待ってから固定化
    const checkSettled = () => {
        if (game.state !== 'playing') return;

        const velocity = mochi.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const angularSpeed = Math.abs(mochi.angularVelocity);

        const isSettled = speed <= 0.3 && angularSpeed <= 0.02;

        // まだ動いている or 回転している場合
        if (!isSettled) {
            // 台より下に落ちていたらゲームオーバー
            if (mochi.position.y > game.baseBottomY + 20) {
                gameOver();
                return;
            }
            // 動き出したらタイマーリセット
            settledStartTime = null;
            setTimeout(checkSettled, 50);
            return;
        }

        // 静止状態になった
        if (settledStartTime === null) {
            settledStartTime = Date.now();
        }

        // 0.1秒間静止を維持したか確認
        if (Date.now() - settledStartTime < SETTLED_DURATION) {
            setTimeout(checkSettled, 50);
            return;
        }

        const distFromCenter = Math.abs(mochi.position.x - game.width / 2);

        if (distFromCenter > 160 || mochi.position.y > game.baseBottomY + 20) {
            gameOver();
            return;
        }

        // 成功 - 餅を固定する
        Body.setStatic(mochi, true);

        // ジャスト判定 (ズレが10px以内)
        if (distFromCenter < 10) {
            // Perfect!
            game.combo++;
            game.maxCombo = Math.max(game.maxCombo, game.combo);
            game.perfectCount++;

            // コンボボーナス: 基本2点 + コンボ数
            const points = 2 + Math.min(game.combo, 5);
            game.score += points;

            createEffectText(mochi.position.x, mochi.position.y - 40, `PERFECT!! x${game.combo}`);
            createParticles(mochi.position.x, mochi.position.y + CONFIG.MOCHI_HEIGHT / 2, 10 + game.combo * 2);
            game.shake = 10 + Math.min(game.combo, 10); // コンボでシェイクも強く

            sounds.playPerfect();

        } else if (distFromCenter < 30) {
            // Great
            game.combo = 0; // コンボリセット（厳しい？桜井さんならこれくらいするか）
            createEffectText(mochi.position.x, mochi.position.y - 40, "GREAT!");
            game.shake = 5;
            game.score += 2;
            sounds.playGood();
        } else {
            // Good (ギリギリ)
            game.combo = 0;
            game.shake = 2;
            game.score++;
            sounds.playLand();
        }

        document.getElementById('score').textContent = game.score;
        game.stackedMochis.push(mochi);

        // 背景色を更新
        updateBackground();

        game.mochiState = 'none';
        game.currentMochi = null;

        const comp = [...COMPARISONS].reverse().find(c => c.threshold <= game.score);
        if (comp) {
            document.getElementById('comparison-text').textContent = comp.text;
        }

        // 次の餅を生成
        spawnMochi();
    };

    // 少し待ってから安定チェック開始
    setTimeout(checkSettled, 100);
}

function checkCollapse() {
    // 積まれた餅が台の一番下より下に落ちたかチェック
    for (const mochi of game.stackedMochis) {
        if (mochi.position.y > game.baseBottomY + 50) {
            return true;
        }
    }

    // 落下中の餅が画面外に落ちたかチェック
    if (game.currentMochi && game.mochiState === 'dropping') {
        if (game.currentMochi.position.y > game.baseBottomY + 100) {
            return true;
        }
    }

    return false;
}

function updateCamera() {
    // 一番上の餅の位置を取得
    const topY = getTopMochiY();

    // 落下距離 + マージン（餅5個分）を上に確保
    const dropDistance = CONFIG.MOCHI_HEIGHT * CONFIG.DROP_MOCHI_COUNT;
    const margin = CONFIG.MOCHI_HEIGHT * 5;

    // 画面上部に表示すべきY座標
    const neededTopY = topY - dropDistance - margin;

    // neededTopYが0より小さくなったらカメラを上にスクロール
    if (neededTopY < 0) {
        game.cameraY = neededTopY;
    } else {
        game.cameraY = 0;
    }
}

function applyCamera() {
    const { render, width, height, cameraY } = game;

    // cameraYが負の値のとき、その分だけ上を表示する
    // 例: cameraY = -100 のとき、y: -100 ~ height-100 を表示
    // シェイク適用
    const shakeX = (Math.random() - 0.5) * game.shake;
    const shakeY = (Math.random() - 0.5) * game.shake;

    Render.lookAt(render, {
        min: { x: shakeX, y: cameraY + shakeY },
        max: { x: width + shakeX, y: height + cameraY + shakeY }
    });
}

function createEffectText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'effect-text';
    el.textContent = text;
    // Canvas座標を画面座標に変換（簡易的）
    // 実際にはcameraYなどを考慮する必要があるが、UIオーバーレイ上での表示位置計算

    // 現在の表示領域から相対位置を計算
    const canvasRect = game.canvas.getBoundingClientRect();
    // ここではシンプルに、CSSのアニメーションに任せるため、screen座標系でのoffsetは無視しつつ
    // ゲーム内座標(x,y)をDOM座標にマッピングする。
    // 注: 本格的なマッピングは複雑になるため、今回は簡易的にCanvas中央付近に出すか、
    // あるいはcameraYを考慮して計算する。

    // cameraYは負の値（上にスクロールしている）。
    // 画面上のY = ワールドY - cameraY（基準）... ではなく
    // Render.lookAtでビューポートが移動している。

    // 画面内での相対Y
    const screenY = y - game.cameraY;

    el.style.left = canvasRect.left + x + 'px';
    el.style.top = canvasRect.top + screenY + 'px';

    document.body.appendChild(el);

    setTimeout(() => el.remove(), 1000);
}

function createParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        const particle = Bodies.circle(x, y, Math.random() * 4 + 2, {
            render: { fillStyle: '#C0A062' },
            frictionAir: 0.05,
            isSensor: true, // 衝突判定なし（見た目だけ）
            label: 'particle'
        });

        Body.setVelocity(particle, {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 1) * 10
        });

        Composite.add(game.engine.world, particle);
        game.particles.push({ body: particle, life: 60 });
    }
}

function gameOver() {
    if (game.state === 'gameover') return;
    game.state = 'gameover';
    game.mochiState = 'none';

    dropOrange();

    // ズームアウトして全体を見せる
    zoomOutToShowAll();

    setTimeout(() => {
        // 効果音
        sounds.playGameOver();

        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').textContent = game.score;
        document.getElementById('max-combo').textContent = game.maxCombo;
        document.getElementById('perfect-count').textContent = game.perfectCount;

        const comp = [...COMPARISONS].reverse().find(c => c.threshold <= game.score);
        document.getElementById('final-comparison').textContent = comp ? comp.text : 'もっと積めるはず！';
    }, 1500);
}

function zoomOutToShowAll() {
    const { render, width, height, stackedMochis, baseBottomY } = game;

    // 一番上の餅の位置を取得
    let topY = game.baseTopY;
    if (stackedMochis.length > 0) {
        const topMochi = stackedMochis.reduce((t, m) =>
            m.position.y < t.position.y ? m : t
        );
        topY = topMochi.position.y - 100; // 上に少しマージン
    }

    // 台座の下を含む範囲
    const bottomY = baseBottomY + 50;

    // 全体の高さ
    const totalHeight = bottomY - topY;

    // 画面に収まるようにスケールを計算
    const viewHeight = height;
    const viewWidth = width;

    // アスペクト比を維持しながらフィットさせる
    if (totalHeight > viewHeight) {
        // 高さが画面を超える場合、全体が見えるようにズームアウト
        const scale = viewHeight / totalHeight;
        const centerY = (topY + bottomY) / 2;
        const centerX = width / 2;

        // スケーリングされた表示範囲を計算
        const scaledWidth = viewWidth / scale;
        const scaledHeight = viewHeight / scale;

        Render.lookAt(render, {
            min: { x: centerX - scaledWidth / 2, y: centerY - scaledHeight / 2 },
            max: { x: centerX + scaledWidth / 2, y: centerY + scaledHeight / 2 }
        });
    } else {
        // 画面に収まる場合はそのまま表示
        Render.lookAt(render, {
            min: { x: 0, y: topY },
            max: { x: width, y: bottomY }
        });
    }
}

function dropOrange() {
    const { engine, width, height, stackedMochis } = game;

    const topMochi = stackedMochis.length > 0
        ? stackedMochis.reduce((t, m) => m.position.y < t.position.y ? m : t)
        : null;

    const x = topMochi ? topMochi.position.x : width / 2;
    const y = topMochi ? topMochi.position.y - 150 : height - 250;

    const orange = Bodies.circle(x, y, 24, {
        label: 'orange',
        render: { fillStyle: '#ff9800', strokeStyle: '#e65100', lineWidth: 2 }
    });

    const leaf = Bodies.circle(x, y - 30, 8, {
        label: 'leaf',
        isSensor: true,
        render: { fillStyle: '#4caf50' }
    });

    Composite.add(engine.world, [orange, leaf]);

    const constraint = Matter.Constraint.create({
        bodyA: orange,
        pointA: { x: 0, y: -20 },
        bodyB: leaf,
        stiffness: 0.1,
        render: { visible: false }
    });
    Composite.add(engine.world, constraint);
}

function share() {
    const text = `餅を【${game.score}段】積んだ！`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
}

function gameLoop() {
    update();
    requestAnimationFrame(gameLoop);
}

function updateBackground() {
    // スコアに応じて背景色を変更（昼 -> 夕方 -> 夜 -> 宇宙）
    const container = document.getElementById('game-container');
    const score = game.score;

    let color = '#EFECDF'; // Default (Day)
    const colors = [
        { score: 0, color: [239, 236, 223] },   // #EFECDF
        { score: 10, color: [255, 183, 77] },   // Sunset Orange
        { score: 20, color: [40, 53, 147] },    // Night Blue
        { score: 50, color: [10, 10, 30] }      // Deep Space
    ];

    // 現在のスコア区間によって色を補間なんかしないで、段階的に変えるアプローチ（フラットデザインっぽさ重視）
    // あるいはスムーズな遷移が良いか。桜井さんなら「手触り」重視でスムーズな遷移を好むはず。

    // 補間ロジック
    let start = colors[0];
    let end = colors[colors.length - 1];

    for (let i = 0; i < colors.length - 1; i++) {
        if (score >= colors[i].score && score < colors[i + 1].score) {
            start = colors[i];
            end = colors[i + 1];
            break;
        } else if (score >= colors[colors.length - 1].score) {
            start = colors[colors.length - 1];
            end = colors[colors.length - 1];
            break;
        }
    }

    // 進行度 (0.0 - 1.0)
    let progress = 0;
    if (start !== end) {
        progress = (score - start.score) / (end.score - start.score);
    }

    // RGB補間
    const r = Math.round(start.color[0] + (end.color[0] - start.color[0]) * progress);
    const g = Math.round(start.color[1] + (end.color[1] - start.color[1]) * progress);
    const b = Math.round(start.color[2] + (end.color[2] - start.color[2]) * progress);

    container.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

    // 文字色の調整（背景が暗い時は白くする）
    // Night Blueあたり(score 20)から白文字に固定
    if (score >= 15) {
        document.getElementById('score-container').style.color = '#FFFFFF';
        document.querySelector('.unit').style.color = '#CCCCCC';
    } else {
        document.getElementById('score-container').style.color = '#D72638'; // Original Red
        document.querySelector('.unit').style.color = '#888';
    }
}

function update() {
    if (game.state !== 'playing') return;

    // 崩れ検知
    if (checkCollapse()) {
        gameOver();
        return;
    }

    const mochi = game.currentMochi;

    // シェイク減衰
    if (game.shake > 0) {
        game.shake *= 0.9;
        if (game.shake < 0.5) game.shake = 0;
    }

    // パーティクル更新
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.life--;
        p.body.render.opacity = p.life / 60;
        if (p.life <= 0) {
            Composite.remove(game.engine.world, p.body);
            game.particles.splice(i, 1);
        }
    }

    if (!mochi) return;

    // 移動中の餅の位置を手動更新
    if (game.mochiState === 'moving') {
        // 重力を打ち消す
        Body.setVelocity(mochi, { x: 0, y: 0 });

        // 左右移動
        game.moveX += game.currentSpeed * game.moveDir;

        const margin = CONFIG.MOCHI_WIDTH / 2 + 20;
        if (game.moveX > game.width - margin) {
            game.moveX = game.width - margin;
            game.moveDir = -1;
        } else if (game.moveX < margin) {
            game.moveX = margin;
            game.moveDir = 1;
        }

        // 位置を直接設定（一番上の餅から餅5個分上）
        const topY = getTopMochiY();
        const dropDistance = CONFIG.MOCHI_HEIGHT * CONFIG.DROP_MOCHI_COUNT;
        const moveY = topY - dropDistance;
        Body.setPosition(mochi, { x: game.moveX, y: moveY });
    }

    // カメラ更新と適用
    updateCamera();
    applyCamera();
}

// 初期化
window.addEventListener('DOMContentLoaded', init);
