import Matter from 'matter-js';

const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const CONFIG = {
    MOCHI_WIDTH: 160,
    MOCHI_HEIGHT: 60,
    BASE_WIDTH: 100, // Square base
    BASE_TOP_WIDTH: 180, // Horizontal rectangle on top of square base
    MOVE_SPEED: 0.02, // Slower as requested
    FALL_SPEED: 1,
    TOLERANCE: 80,
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

class Game {
    constructor() {
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.score = 0;
        this.isPlaying = false;
        this.currentMochi = null;
        this.mochiList = [];
        this.mochiDirection = 1;
        this.scrollOffset = 0;
        this.targetScrollOffset = 0;

        this.canvas = document.getElementById('game-canvas');
        this.scoreEl = document.getElementById('score');
        this.comparisonEl = document.getElementById('comparison-text');
        this.isDestroyed = false;

        this.init();
    }

    init() {
        const width = this.canvas.clientWidth || 500;
        const height = this.canvas.clientHeight || 800;
        this.canvas.width = width;
        this.canvas.height = height;

        this.render = Render.create({
            canvas: this.canvas,
            engine: this.engine,
            options: {
                width: width,
                height: height,
                wireframes: false,
                background: 'transparent'
            }
        });

        this.world.gravity.y = 1.0;

        Render.run(this.render);
        this.runner = Runner.create();
        Runner.run(this.runner, this.engine);

        // Buttons
        document.getElementById('start-button').onclick = () => this.start();
        document.getElementById('restart-button').onclick = () => this.reset();
        document.getElementById('share-button').onclick = () => this.share();

        this.inputHandler = (e) => {
            if (!this.isPlaying) return;

            // Ignore clicks on buttons/UI elements
            if (e.target.tagName === 'BUTTON' || e.target.closest('.overlay')) {
                return;
            }

            // Only drop if we have a current mochi and it's actually at the top moving
            if (this.currentMochi && this.currentMochi.isMoving) {
                if (e.type === 'touchstart') e.preventDefault();
                this.dropMochi();
            }
        };
        // Listen to window instead of just canvas for better reliability
        window.addEventListener('mousedown', this.inputHandler);
        window.addEventListener('touchstart', this.inputHandler, { passive: false });

        // Physics events
        Events.on(this.engine, 'collisionStart', (event) => {
            if (!this.isPlaying) return;
            event.pairs.forEach(pair => {
                const bodies = [pair.bodyA, pair.bodyB];

                // Check for floor collision (game over)
                const hasFloor = bodies.some(b => b.label === 'floor');
                const fallenMochi = bodies.find(b => b.label === 'mochi' && !b.isStatic);
                if (hasFloor && fallenMochi) {
                    this.gameOver();
                    return;
                }

                // Check for mochi landing on base or other mochi
                const mochi = bodies.find(b => b.label === 'mochi' && b.isDropping);
                const landedOn = bodies.find(b => b.label === 'base' || (b.label === 'mochi' && b.isStatic));

                if (mochi && landedOn) {
                    mochi.isDropping = false;
                    // Store reference to the landed mochi
                    const landedMochi = mochi;
                    // Wait for velocity to settle
                    const checkInterval = setInterval(() => {
                        if (!this.isPlaying) {
                            clearInterval(checkInterval);
                            return;
                        }
                        if (Math.abs(landedMochi.velocity.y) < 0.5 && Math.abs(landedMochi.velocity.x) < 0.5) {
                            clearInterval(checkInterval);
                            this.checkLanded(landedMochi);
                        }
                    }, 100);
                }
            });
        });

        // Frame update
        // We need to store loop reference if we want to cancel, but isPlaying check is enough
        const loopRunner = () => {
            if (this.isDestroyed) return;
            if (this.isPlaying) this.update();
            requestAnimationFrame(loopRunner);
        }
        loopRunner();

        this.createBase();
    }

    createBase() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height - 100;
        // High contrast colors
        const baseColor = '#a1887f';
        const strokeColor = '#5d4037';

        // Horizontal long base
        const topBase = Bodies.rectangle(cx, cy - 55, 180, 20, {
            isStatic: true,
            label: 'base',
            render: { fillStyle: baseColor, strokeStyle: strokeColor, lineWidth: 2 }
        });

        // Square base with circle hole
        const baseBox = Bodies.rectangle(cx, cy, 100, 100, {
            isStatic: true,
            label: 'base',
            render: {
                fillStyle: baseColor,
                strokeStyle: strokeColor,
                lineWidth: 2
            }
        });

        Composite.add(this.world, [baseBox, topBase]);

        // Add "hole" visually - darker to look like a hole
        const hole = Bodies.circle(cx, cy, 25, {
            isStatic: true,
            isSensor: true,
            render: { fillStyle: '#8d6e63', strokeStyle: strokeColor, lineWidth: 1 }
        });

        // Failsafe floor detection
        const floor = Bodies.rectangle(cx, cy + 1000, 2000, 100, {
            isStatic: true,
            label: 'floor',
            isSensor: true,
            render: { visible: false }
        });

        Composite.add(this.world, [hole, floor]);
    }

    update() {
        if (this.currentMochi && this.currentMochi.isMoving) {
            const canvasWidth = this.canvas.width;
            const mochiWidth = CONFIG.MOCHI_WIDTH;
            const pos = this.currentMochi.position;

            let nextX = pos.x + this.mochiDirection * (canvasWidth * CONFIG.MOVE_SPEED);

            if (nextX > canvasWidth - mochiWidth / 2) {
                this.mochiDirection = -1;
                nextX = canvasWidth - mochiWidth / 2;
            } else if (nextX < mochiWidth / 2) {
                this.mochiDirection = 1;
                nextX = mochiWidth / 2;
            }

            Body.setPosition(this.currentMochi, { x: nextX, y: pos.y });
        }

        // Out of bounds check - use base position as reference instead of canvas height
        // Base is at canvas.height - 100, so anything below canvas.height + 300 is definitely out
        if (this.currentMochi && !this.currentMochi.isMoving && !this.currentMochi.isStatic) {
            const baseY = this.canvas.height - 100;
            if (this.currentMochi.position.y > baseY + 400) {
                this.gameOver();
            }
        }

        // Disable scroll for now to debug basic mechanics
        // this.scrollOffset += (this.targetScrollOffset - this.scrollOffset) * 0.1;
    }

    start() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.isPlaying = true;
        this.score = 0;
        this.mochiList = [];
        this.scoreEl.innerText = '0';
        this.targetScrollOffset = 0;
        this.scrollOffset = 0;
        this.spawnMochi();
    }

    reset() {
        this.isPlaying = false;
        Composite.clear(this.world, false);
        this.createBase();
        this.start();
    }

    spawnMochi() {
        // Use global window check to prevent ghost logic if destroyed
        if (!this.isPlaying) return;

        const cx = this.canvas.width / 2;
        // Simple fixed spawn position at top of canvas
        const spawnY = 100;

        this.currentMochi = Bodies.rectangle(cx, spawnY, CONFIG.MOCHI_WIDTH, CONFIG.MOCHI_HEIGHT, {
            chamfer: { radius: CONFIG.MOCHI_HEIGHT * 0.5 },
            isStatic: true,
            friction: 0.9,
            restitution: 0.1, // A bit bouncy
            density: 0.002, // Heavier
            label: 'mochi',
            render: {
                visible: true,
                fillStyle: '#ffffff',
                strokeStyle: '#999',
                lineWidth: 3,
                opacity: 1
            }
        });

        this.currentMochi.isMoving = true;
        this.currentMochi.isDropping = false;
        Composite.add(this.world, this.currentMochi);
    }

    dropMochi() {
        if (!this.currentMochi || !this.currentMochi.isMoving) return;

        this.currentMochi.isMoving = false;
        this.currentMochi.isDropping = true;
        Body.setStatic(this.currentMochi, false);
        Body.setVelocity(this.currentMochi, { x: 0, y: 15 });
    }

    checkLanded(landedMochi) {
        // Use the passed mochi or fallback to currentMochi for backwards compatibility
        const mochi = landedMochi || this.currentMochi;
        if (!mochi || mochi.isMoving || mochi.isStatic) return;

        const pos = mochi.position;
        // Success check
        if (Math.abs(pos.x - this.canvas.width / 2) <= 220) {
            this.score++;
            this.scoreEl.innerText = this.score;
            this.mochiList.push(mochi);

            Body.setStatic(mochi, true);

            if (this.score > 3) {
                this.targetScrollOffset = (this.score - 3) * (CONFIG.MOCHI_HEIGHT - 5);
            }

            const comp = COMPARISONS.slice().reverse().find(c => c.threshold <= this.score);
            if (comp) {
                this.comparisonEl.innerText = comp.text;
            }

            this.spawnMochi();
        } else {
            this.gameOver();
        }
    }

    gameOver() {
        if (!this.isPlaying) return;
        this.isPlaying = false;

        const lastMochi = this.mochiList[this.mochiList.length - 1];
        const spawnX = lastMochi ? lastMochi.position.x : this.canvas.width / 2;
        const spawnY = lastMochi ? lastMochi.position.y - 45 : this.canvas.height - 180;

        const orange = Bodies.circle(spawnX, spawnY - 150, 24, {
            label: 'orange',
            friction: 0.5,
            render: { fillStyle: '#ff9800', strokeStyle: '#e65100', lineWidth: 2 }
        });

        const leaf = Bodies.circle(spawnX + 10, spawnY - 175, 10, {
            label: 'leaf',
            isSensor: true,
            render: { fillStyle: '#4caf50' }
        });

        Composite.add(this.world, [orange, leaf]);

        const constraint = Matter.Constraint.create({
            bodyA: orange,
            pointA: { x: 5, y: -20 },
            bodyB: leaf,
            stiffness: 0.1,
            render: { visible: false }
        });
        Composite.add(this.world, constraint);

        setTimeout(() => {
            document.getElementById('game-over-screen').classList.remove('hidden');
            document.getElementById('final-score').innerText = this.score;
            const comp = COMPARISONS.slice().reverse().find(c => c.threshold <= this.score);
            document.getElementById('final-comparison').innerText = comp ? comp.text : "もっと積めるはず！";
        }, 2000);
    }

    share() {
        const text = `餅を【${this.score}段】積んだ！${this.comparisonEl.innerText}`;
        const hashtags = "餅積,お正月,無限鏡餅";
        const url = window.location.href;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=${encodeURIComponent(hashtags)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
    }
    stop() {
        this.isPlaying = false;
        if (this.runner) Runner.stop(this.runner);
        if (this.render) {
            Render.stop(this.render);
            this.render.canvas.remove();
            this.render.canvas = null;
            this.render.context = null;
            this.render.textures = {};
        }
        if (this.engine) {
            Matter.World.clear(this.engine.world);
            Engine.clear(this.engine);
        }

        // Remove listeners
        if (this.inputHandler) {
            window.removeEventListener('mousedown', this.inputHandler);
            window.removeEventListener('touchstart', this.inputHandler);
        }
    }

    // ... (rest of methods) ...
}

// Cleanup previous instance if hot-reloading
if (window.currentGame) {
    try {
        window.currentGame.stop();
    } catch (e) {
        console.error(e);
    }
}

window.addEventListener('load', () => {
    // Reset canvas element if needed because Matter might have removed it or messed with it
    const container = document.getElementById('game-container');
    if (!container.querySelector('canvas')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'game-canvas';
        container.appendChild(canvas);
    }

    window.currentGame = new Game();
});
