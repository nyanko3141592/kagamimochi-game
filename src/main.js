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

class BackgroundManager {
    constructor() {
        this.layer = document.getElementById('background-layer');
        this.container = document.getElementById('game-container');
        this.objects = [];
        this.lastCameraY = 0;

        // ランドマーク定義
        this.landmarks = [
            { score: 3, emoji: '🐈', size: 40, offset: -100, spawned: false }, // 膝の高さ？
            { score: 10, emoji: '🦒', size: 100, offset: 50, spawned: false },
            { score: 20, emoji: '🦕', size: 120, offset: -80, spawned: false }, // 恐竜？
            { score: 50, emoji: '🦅', size: 60, offset: 120, spawned: false },
            { score: 100, emoji: '🗻', size: 200, offset: 0, spawned: false },
            { score: 333, emoji: '🗼', size: 150, offset: 80, spawned: false },
            { score: 634, emoji: '☁️', size: 180, offset: -50, spawned: false }, // スカイツリー的な高さ
            { score: 1000, emoji: '✈️', size: 80, offset: 100, spawned: false },
            { score: 2000, emoji: '🛰️', size: 70, offset: -80, spawned: false },
            { score: 3000, emoji: '🌑', size: 120, offset: 0, spawned: false },
            { score: 5000, emoji: '🛸', size: 90, offset: 120, spawned: false },
            { score: 10000, emoji: '🪐', size: 200, offset: -50, spawned: false },
        ];
    }

    reset() {
        this.layer.innerHTML = '';
        this.objects = [];
        this.landmarks.forEach(l => l.spawned = false);
        this.updateColor(0);
        this.lastCameraY = 0;
    }

    update(score, cameraY, width, height) {
        this.updateColor(score);
        this.spawnObjects(score, cameraY, width);
        this.updatePositions(cameraY, height);
        this.lastCameraY = cameraY;
    }

    updateColor(score) {
        const colors = [
            { score: 0, color: [239, 236, 223] },   // #EFECDF (昼)
            { score: 20, color: [255, 183, 77] },   // Sunset
            { score: 50, color: [40, 53, 147] },    // Night
            { score: 100, color: [10, 10, 30] }      // Space
        ];

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

        let progress = 0;
        if (start !== end) {
            progress = (score - start.score) / (end.score - start.score);
        }

        const r = Math.round(start.color[0] + (end.color[0] - start.color[0]) * progress);
        const g = Math.round(start.color[1] + (end.color[1] - start.color[1]) * progress);
        const b = Math.round(start.color[2] + (end.color[2] - start.color[2]) * progress);

        this.container.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

        if (score >= 40) {
            document.getElementById('score-container').style.color = '#FFFFFF';
            document.querySelector('.unit').style.color = '#CCCCCC';
        } else {
            document.getElementById('score-container').style.color = '#D72638';
            document.querySelector('.unit').style.color = '#888';
        }
    }

    spawnObjects(score, cameraY, width) {
        // ランドマーク生成
        this.landmarks.forEach(l => {
            if (!l.spawned && score >= l.score) {
                this.createLandmark(l, cameraY, width);
                l.spawned = true;
            }
        });

        // ランダム装飾生成 (上にスクロールしている時のみ)
        if (cameraY < this.lastCameraY) {
            // スクロール距離分だけ生成チャンス
            const dist = this.lastCameraY - cameraY;
            if (Math.random() < dist * 0.02) { // 生成確率
                this.createDecoration(score, cameraY, width);
            }
        }
    }

    createLandmark(data, cameraY, width) {
        const el = document.createElement('div');
        el.className = 'bg-object bg-landmark';
        el.textContent = data.emoji;
        el.style.fontSize = `${data.size}px`;

        // 画面上部外に配置
        // Y座標は game world 座標系で管理するべきだが、
        // ここでは画面上の相対位置で管理し、cameraYの変化に合わせて移動させる簡易実装にする？
        // いや、world座標を持たせて cameraY で描画位置を決めるのがベスト

        // ワールド座標Y: カメラの上端より少し上
        const worldY = cameraY - 100;

        const x = (width / 2) + data.offset;

        const obj = {
            el,
            x,
            y: worldY,
            parallax: 0.2, // 遠景っぽく少し遅く動く
            type: 'landmark'
        };

        this.layer.appendChild(el);
        this.objects.push(obj);
    }

    createDecoration(score, cameraY, width) {
        const type = this.getDecorationType(score);
        if (!type) return;

        const el = document.createElement('div');
        el.className = `bg-object ${type.className}`;

        // ランダム配置
        const x = Math.random() * width;
        const worldY = cameraY - 100; // 画面上

        // スタイル適用
        if (type.className === 'bg-cloud') {
            const w = 60 + Math.random() * 100;
            const h = w * 0.6;
            el.style.width = `${w}px`;
            el.style.height = `${h}px`;
        } else if (type.className === 'bg-star') {
            const size = 2 + Math.random() * 4;
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
        }

        const obj = {
            el,
            x,
            y: worldY,
            parallax: type.parallax + (Math.random() * 0.1),
            type: 'decoration'
        };

        this.layer.appendChild(el);
        this.objects.push(obj);
    }

    getDecorationType(score) {
        if (score < 10) return null;
        if (score < 50) return { className: 'bg-cloud', parallax: 0.5 };
        if (score >= 80) return { className: 'bg-star', parallax: 0.1 };
        return null; // 50-80の間は過渡期
    }

    updatePositions(cameraY, height) {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];

            // 視差効果: parallaxが小さいほど背景（カメラと一緒に動く量が多い = 相対移動が少ない）
            // 画面上のY = (obj.y - cameraY) * parallax ではなく、
            // 単純に「カメラが上にいくと、物体は下にいく」

            // world座標系で cameraY からの相対位置を計算
            const relY = obj.y - cameraY;

            // ここでパララックス:
            // カメラが -100 動いた時、物体も -100 動けば画面上の位置は変わらない。
            // Parallax 1.0 = 通常の物体 (画面内をスクロールする)
            // Parallax 0.0 = カメラに追従 (画面固定)
            // 遠景は Parallax < 1.0

            // 基準位置からの変位
            // しかしobj.yは生成時の絶対位置として定義してしまっている...
            // 簡易的にやるなら:
            // 画面上の位置 = (obj.y - cameraY * obj.parallax) ... これだと初期位置がずれる
            // 
            // 今回はシンプルに: obj.y はワールド座標。
            // 画面Y = obj.y - cameraY
            // これにパララックス係数をかけるアプローチは「無限スクロール」だと破綻しやすい。
            // 
            // 修正案:
            // 背景レイヤー全体を動かすのではなく、個々の要素のstyle.topを更新する。
            // 遠景（雲）などは、カメラ移動量の N% しか動かないように見える = world座標上での移動速度が遅い？
            // 
            // いや、一番簡単なのは、「カメラがY動いたら、背景オブジェクトは Y * factor だけ動いた位置に見える」
            // screenY = (obj.y - cameraY) * parallax ... これだとカメラが0のときobj.yになる。
            // 
            // これを採用してみる。

            // しかし、これだと上に行けば行くほど座標が圧縮されてしまうのでは？
            // 通常のパララックス:
            // screenY = obj.y - cameraY * parallax
            // これは「カメラが下にいくと背景も下にいく（ついてくる）」= 遠くにある

            const screenY = (obj.y - (cameraY * obj.parallax));

            // 画面下端を越えたら削除
            if (screenY > height + 100) {
                obj.el.remove();
                this.objects.splice(i, 1);
                continue;
            }

            obj.el.style.transform = `translate3d(${obj.x}px, ${screenY}px, 0)`;
        }
    }
}

const bgManager = new BackgroundManager();
const CONFIG = {
    MOCHI_WIDTH: 140,
    MOCHI_HEIGHT: 50,
    MOVE_SPEED: 4,
    // 落下距離 = 餅5個分
    DROP_MOCHI_COUNT: 5,
    // ゲームプレイ領域の固定幅（公平性のため）
    // PCでも移動範囲はこの幅に制限される
    PLAY_AREA_WIDTH: 400,
};

const RANKS = [
    { threshold: 0, name: "座頭級", emoji: "🪕", desc: "祝いとめでたさの象徴！" }, // 6: Zatou
    { threshold: 10, name: "煙草級", emoji: "🚬", desc: "祭りや祝い事の必需品！" }, // 5: Tabako
    { threshold: 20, name: "扇級", emoji: "🪭", desc: "末広がりに福を招く！" }, // 4: Ougi
    { threshold: 30, name: "茄子級", emoji: "🍆", desc: "物事を成す（生す）！" }, // 3: Nasu
    { threshold: 50, name: "鷹級", emoji: "🦅", desc: "威厳ある百鳥の王！" }, // 2: Taka
    { threshold: 100, name: "富士級", emoji: "🗻", desc: "日本一の山！絶景かな。" } // 1: Fuji
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

    // Load and display initial high score
    const record = loadRecord();
    updateBestScoreDisplay(record.highScore);

    gameLoop();
}

const STORAGE_KEY = 'kagamimochi_record_v1';

function loadRecord() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : { highScore: 0, maxCombo: 0 };
    } catch (e) {
        console.error('Failed to load record', e);
        return { highScore: 0, maxCombo: 0 };
    }
}

function saveRecord(score, maxCombo) {
    try {
        const current = loadRecord();
        const newRecord = {
            highScore: Math.max(current.highScore, score),
            maxCombo: Math.max(current.maxCombo, maxCombo)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecord));
        return newRecord;
    } catch (e) {
        console.error('Failed to save record', e);
        return { highScore: score, maxCombo: maxCombo };
    }
}

function updateBestScoreDisplay(score) {
    const el = document.getElementById('home-best-score');
    if (el) {
        // Find rank for the best score
        const rank = [...RANKS].reverse().find(r => r.threshold <= score) || RANKS[0];
        el.textContent = `BEST: ${score}段 (${rank.name})`;
    }
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
    document.getElementById('score').textContent = '0';
    updateRankDisplay();

    spawnMochi();
    // updateBackground(); // 削除
    bgManager.reset(); // 初期化

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

        // プレイエリアの半分を超えたらゲームオーバー（公平性のため固定値）
        const maxDist = CONFIG.PLAY_AREA_WIDTH / 2 - CONFIG.MOCHI_WIDTH / 2 + 20;
        if (distFromCenter > maxDist || mochi.position.y > game.baseBottomY + 20) {
            gameOver();
            return;
        }

        // 成功 - 餅を固定する
        Body.setStatic(mochi, true);

        // 段数は常に1ずつ増加
        game.score++;

        // ジャスト判定 (ズレが10px以内)
        if (distFromCenter < 10) {
            // Perfect!
            game.combo++;
            game.maxCombo = Math.max(game.maxCombo, game.combo);
            game.perfectCount++;

            createEffectText(mochi.position.x, mochi.position.y - 40, `PERFECT!! x${game.combo}`);
            createParticles(mochi.position.x, mochi.position.y + CONFIG.MOCHI_HEIGHT / 2, 10 + game.combo * 2);
            game.shake = 10 + Math.min(game.combo, 10); // コンボでシェイクも強く

            sounds.playPerfect();

        } else if (distFromCenter < 30) {
            // Great
            game.combo = 0;
            createEffectText(mochi.position.x, mochi.position.y - 40, "GREAT!");
            game.shake = 5;
            sounds.playGood();
        } else {
            // Good (ギリギリ)
            game.combo = 0;
            game.shake = 2;
            sounds.playLand();
        }

        document.getElementById('score').textContent = game.score;
        game.stackedMochis.push(mochi);

        // 背景更新はupdate()で行うのでここは削除
        // updateBackground();

        game.mochiState = 'none';
        game.currentMochi = null;

        updateRankDisplay();

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

        // Save Record
        const record = saveRecord(game.score, game.maxCombo);
        updateBestScoreDisplay(record.highScore); // Update home screen display as well for next time

        document.getElementById('game-over-screen').classList.remove('hidden');
        // document.getElementById('final-score').textContent = game.score; // 廃止
        document.getElementById('final-score-small').textContent = game.score;
        document.getElementById('max-combo').textContent = game.maxCombo;
        document.getElementById('perfect-count').textContent = game.perfectCount;

        const rank = [...RANKS].reverse().find(r => r.threshold <= game.score) || RANKS[0];

        document.getElementById('rank-emoji').textContent = rank.emoji;
        document.getElementById('rank-name').textContent = rank.name;
        document.getElementById('rank-desc').textContent = rank.desc;

        // お祝いエフェクト (簡易的)
        if (game.score >= 10) {
            confettiEffect();
        }
    }, 1500);
}

function updateRankDisplay() {
    const rank = [...RANKS].reverse().find(r => r.threshold <= game.score) || RANKS[0];
    document.getElementById('comparison-text').textContent = `${rank.emoji} ${rank.name}`;
}

function confettiEffect() {
    // 簡易的な紙吹雪
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];

    for (let i = 0; i < 50; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDuration = (Math.random() * 2 + 2) + 's';
        el.style.animationDelay = (Math.random() * 1) + 's';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
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
    const rank = [...RANKS].reverse().find(r => r.threshold <= game.score) || RANKS[0];
    const text = `餅を積んで【${rank.name}】(${game.score}段)になったよ！ #餅積`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
}

function gameLoop() {
    update();
    requestAnimationFrame(gameLoop);
}

// function updateBackground() は BackgroundManager に統合されたため削除

function update() {
    if (game.state !== 'playing') return;

    bgManager.update(game.score, game.cameraY, game.width, game.height);

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

        // 公平性のため、移動範囲は固定のプレイエリア幅に制限
        // 画面が広くてもPCが有利にならない
        const playAreaLeft = (game.width - CONFIG.PLAY_AREA_WIDTH) / 2;
        const playAreaRight = playAreaLeft + CONFIG.PLAY_AREA_WIDTH;
        const margin = CONFIG.MOCHI_WIDTH / 2 + 20;

        if (game.moveX > playAreaRight - margin) {
            game.moveX = playAreaRight - margin;
            game.moveDir = -1;
        } else if (game.moveX < playAreaLeft + margin) {
            game.moveX = playAreaLeft + margin;
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
