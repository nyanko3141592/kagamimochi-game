import Matter from 'matter-js';

const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const CONFIG = {
    MOCHI_WIDTH: 140,
    MOCHI_HEIGHT: 50,
    MOVE_SPEED: 4,
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
        mochiState: 'none', // none, moving, dropping, landed
        stackedMochis: [],
        moveDir: 1,
        moveX: width / 2,
    };

    createBase();
    setupEvents();
    gameLoop();
}

function createBase() {
    const { engine, width, height } = game;
    const cx = width / 2;
    const baseY = height - 80;

    const platform = Bodies.rectangle(cx, baseY - 50, 180, 20, {
        isStatic: true,
        label: 'base',
        render: { fillStyle: '#a1887f', strokeStyle: '#5d4037', lineWidth: 2 }
    });

    const stand = Bodies.rectangle(cx, baseY, 100, 80, {
        isStatic: true,
        label: 'base',
        render: { fillStyle: '#a1887f', strokeStyle: '#5d4037', lineWidth: 2 }
    });

    const floor = Bodies.rectangle(cx, height + 300, width * 2, 50, {
        isStatic: true,
        isSensor: true,
        label: 'floor',
        render: { visible: false }
    });

    Composite.add(engine.world, [platform, stand, floor]);
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

function spawnMochi() {
    if (game.state !== 'playing') return;

    const { engine, width } = game;
    const spawnY = 100;

    // 重要: 最初から isStatic: false で作成する
    // setStatic の問題を回避
    const mochi = Bodies.rectangle(width / 2, spawnY, CONFIG.MOCHI_WIDTH, CONFIG.MOCHI_HEIGHT, {
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

    // 重力の影響を受けないようにする（手動で位置制御）
    mochi.ignoreGravity = true;

    Composite.add(engine.world, mochi);

    game.currentMochi = mochi;
    game.mochiState = 'moving';
    game.moveX = width / 2;
    game.moveDir = 1;

    console.log('Spawned mochi:', mochi.id, 'at', mochi.position);
}

function dropMochi() {
    if (game.mochiState !== 'moving' || !game.currentMochi) return;

    const mochi = game.currentMochi;
    game.mochiState = 'dropping';

    // 重力を有効化
    mochi.ignoreGravity = false;

    // 初速を与える
    Body.setVelocity(mochi, { x: 0, y: 5 });

    console.log('Dropped mochi:', mochi.id, 'velocity:', mochi.velocity);
}

function handleCollision(event) {
    if (game.state !== 'playing') return;

    for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB];
        const mochi = game.currentMochi;

        if (!mochi || game.mochiState !== 'dropping') continue;

        // 床に落ちた
        const hitFloor = bodies.some(b => b.label === 'floor');
        const isCurrent = bodies.includes(mochi);

        if (hitFloor && isCurrent) {
            gameOver();
            return;
        }

        // 台座か積まれた餅に着地
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

    console.log('Mochi landed:', mochi.id, 'pos:', mochi.position);

    // 安定するまで待つ
    setTimeout(() => {
        if (game.state !== 'playing') return;

        const distFromCenter = Math.abs(mochi.position.x - game.width / 2);
        console.log('Distance from center:', distFromCenter);

        if (distFromCenter > 160) {
            gameOver();
            return;
        }

        // 成功
        game.score++;
        document.getElementById('score').textContent = game.score;
        game.stackedMochis.push(mochi);
        game.mochiState = 'none';
        game.currentMochi = null;

        const comp = [...COMPARISONS].reverse().find(c => c.threshold <= game.score);
        if (comp) {
            document.getElementById('comparison-text').textContent = comp.text;
        }

        spawnMochi();
    }, 400);
}

function gameOver() {
    if (game.state === 'gameover') return;
    game.state = 'gameover';
    game.mochiState = 'none';

    console.log('Game Over! Score:', game.score);

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

    const mochi = game.currentMochi;
    if (!mochi) return;

    // 移動中の餅の位置を手動更新
    if (game.mochiState === 'moving') {
        // 重力を打ち消す（ignoreGravityフラグは効かないので手動）
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

        // 位置を直接設定
        Body.setPosition(mochi, { x: game.moveX, y: 100 });
    }
}

// 初期化
window.addEventListener('DOMContentLoaded', init);
