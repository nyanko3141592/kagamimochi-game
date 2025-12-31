import Matter from 'matter-js';

const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

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
        render: { fillStyle: '#a1887f', strokeStyle: '#5d4037', lineWidth: 2 }
    });

    // 台座下部（正方形の土台）
    const stand = Bodies.rectangle(cx, baseTopY + 50, 100, 80, {
        isStatic: true,
        label: 'base',
        render: { fillStyle: '#a1887f', strokeStyle: '#5d4037', lineWidth: 2 }
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
    game.moveX = game.width / 2;
    game.cameraY = 0;

    document.getElementById('score').textContent = '0';
    document.getElementById('comparison-text').textContent = '目指せ、富士山！';

    spawnMochi();
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
        restitution: 0.05,
        density: 0.003,
        label: 'mochi',
        render: {
            fillStyle: '#ffffff',
            strokeStyle: '#bbbbbb',
            lineWidth: 3
        }
    });

    Composite.add(engine.world, mochi);

    game.currentMochi = mochi;
    game.mochiState = 'moving';
    game.moveX = width / 2;
    game.moveDir = 1;

    // カメラを更新して餅が見えるようにする
    updateCamera();
}

function dropMochi() {
    if (game.mochiState !== 'moving' || !game.currentMochi) return;

    const mochi = game.currentMochi;
    game.mochiState = 'dropping';

    // 初速を与える
    Body.setVelocity(mochi, { x: 0, y: 5 });
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

    // 速度と回転が十分に小さくなるまで待ってから固定化
    const checkSettled = () => {
        if (game.state !== 'playing') return;

        const velocity = mochi.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const angularSpeed = Math.abs(mochi.angularVelocity);

        // まだ動いている or 回転している場合は再チェック
        if (speed > 0.3 || angularSpeed > 0.02) {
            // 台より下に落ちていたらゲームオーバー
            if (mochi.position.y > game.baseBottomY + 20) {
                gameOver();
                return;
            }
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

        game.score++;
        document.getElementById('score').textContent = game.score;
        game.stackedMochis.push(mochi);
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
    const neededTopY = topY - dropDistance - margin;

    // カメラ位置を計算（neededTopYが画面上部に来るように）
    // cameraYは負の値で上にスクロール
    if (neededTopY < game.cameraY) {
        game.cameraY = neededTopY;
    }
}

function applyCamera() {
    const { render, width, height, cameraY } = game;

    // Render.lookAtを使用してカメラ位置を適用
    Render.lookAt(render, {
        min: { x: 0, y: -cameraY },
        max: { x: width, y: height - cameraY }
    });
}

function gameOver() {
    if (game.state === 'gameover') return;
    game.state = 'gameover';
    game.mochiState = 'none';

    dropOrange();

    setTimeout(() => {
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').textContent = game.score;
        const comp = [...COMPARISONS].reverse().find(c => c.threshold <= game.score);
        document.getElementById('final-comparison').textContent = comp ? comp.text : 'もっと積めるはず！';
    }, 2000);
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

function update() {
    if (game.state !== 'playing') return;

    // 崩れ検知
    if (checkCollapse()) {
        gameOver();
        return;
    }

    const mochi = game.currentMochi;
    if (!mochi) return;

    // 移動中の餅の位置を手動更新
    if (game.mochiState === 'moving') {
        // 重力を打ち消す
        Body.setVelocity(mochi, { x: 0, y: 0 });

        // 左右移動
        game.moveX += CONFIG.MOVE_SPEED * game.moveDir;

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
