const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Game State
let isGameRunning = false;
let isGameOver = false;
let score = 0;
let animationId;
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 500; // Faster initial spawn
let speedMultiplier = 1;

// Target frame rate for physics normalization (60 FPS baseline)
const TARGET_FPS = 60;
const TARGET_FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms

// Scale factor for device pixel ratio
let scaleFactor = 1;

// Game design resolution (logical pixels)
const GAME_WIDTH = 600;
const GAME_HEIGHT = 900;

// Assets
const playerSprites = {
    idle: new Image(),
    run: new Image(),
    dead: new Image()
};
playerSprites.idle.src = 'Assets/character_idle_sheet.png';
playerSprites.run.src = 'Assets/character_run_sheet2.png';
playerSprites.dead.src = 'Assets/character_dead_resize.png';

const poopSprite = new Image();
poopSprite.src = 'Assets/poop_idle.png';

const poopSplatSprite = new Image();
poopSplatSprite.src = 'Assets/poop_drop_sheet.png';

const player = {
    x: 0,
    y: 0,
    width: 120, // Visual size
    height: 120, // Visual size

    // Movement Physics (per-frame values at 60fps, will be normalized by delta)
    vx: 0,
    acceleration: 0.38,
    friction: 0.92,
    maxSpeed: 12,

    // Collision
    collisionScale: 0.166, // Keep as is for player

    // Animation properties
    state: 'idle',
    frameX: 0,
    gameFrame: 0,
    staggerFrames: 7,
    facingLeft: true,
    spriteWidth: 128,
    spriteHeight: 128,

    // Idle sprite sheet config (3 columns x 2 rows, 5 frames total)
    idleCols: 3,
    idleTotalFrames: 5,

    // Run sprite sheet config (3 columns x 3 rows, 7 frames total)
    runCols: 8,
    runTotalFrames: 8
};

let poops = [];

// --- Touch Controls (zone-based: left half = left, right half = right) ---
let activeTouches = {}; // Track active touches

// Separate touch state from keyboard state
const touchKeys = {
    ArrowLeft: false,
    ArrowRight: false
};

// Helper functions to check combined input (keyboard OR touch)
function isMovingLeft() {
    return keys.ArrowLeft || touchKeys.ArrowLeft;
}
function isMovingRight() {
    return keys.ArrowRight || touchKeys.ArrowRight;
}

function handleTouchStart(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches[touch.identifier] = touch.clientX;
    }
    updateTouchDirection();
}

function handleTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (activeTouches.hasOwnProperty(touch.identifier)) {
            activeTouches[touch.identifier] = touch.clientX;
        }
    }
    updateTouchDirection();
}

function handleTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        delete activeTouches[touch.identifier];
    }
    updateTouchDirection();
}

function updateTouchDirection() {
    // Only reset TOUCH state, never keyboard state
    touchKeys.ArrowLeft = false;
    touchKeys.ArrowRight = false;

    // Check all active touches
    const touchIds = Object.keys(activeTouches);
    if (touchIds.length === 0) return;

    // Get the canvas bounding rect for accurate position mapping
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    for (const id of touchIds) {
        const touchX = activeTouches[id];
        if (touchX < centerX) {
            touchKeys.ArrowLeft = true;
        } else {
            touchKeys.ArrowRight = true;
        }
    }
}

// Register touch events with { passive: false } to allow preventDefault
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// Also listen on the parent container to catch touches on UI elements
const gameContainer = document.querySelector('.game-container');
gameContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
gameContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
gameContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
gameContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false });


// Resize handling with devicePixelRatio support
function resize() {
    const container = canvas.parentElement;
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;

    // Calculate device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;

    // Set canvas internal resolution to match device pixels
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // CSS size stays at container size
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    // Scale all drawing operations
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Calculate scale factor relative to design resolution
    // This ensures objects look the same size regardless of screen
    scaleFactor = Math.min(displayWidth / GAME_WIDTH, displayHeight / GAME_HEIGHT);

    // Update player position based on display size (using CSS pixels)
    // Use base size constants to avoid compounding on repeated resize calls
    player.width = Math.round(120 * scaleFactor);
    player.height = Math.round(120 * scaleFactor);
    player.y = displayHeight - player.height - Math.round(20 * scaleFactor);

    if (!isGameRunning) {
        player.x = displayWidth / 2 - player.width / 2;
        draw();
    }
}

window.addEventListener('resize', resize);

// Input Handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});


function initGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    resize();
    score = 0;
    speedMultiplier = 1;
    spawnInterval = 100; // Start slower
    poops = [];
    isGameOver = false;
    activeTouches = {};

    const displayWidth = canvas.parentElement.clientWidth;
    player.x = displayWidth / 2 - player.width / 2;
    player.vx = 0;
    player.state = 'idle';
    scoreElement.textContent = score;
    isGameRunning = true;
    lastTime = performance.now();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    gameLoop(lastTime);
}

function gameOver() {
    isGameOver = true;

    // Set player to dead state
    player.state = 'dead';

    // Prevent accidental immediate restart
    canRestart = false;
    setTimeout(() => { canRestart = true; }, 1000);

    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function spawnPoop() {
    // Size scaled to screen
    const size = Math.round(55 * scaleFactor);
    const displayWidth = canvas.parentElement.clientWidth;
    const x = Math.random() * (displayWidth - size);

    poops.push({
        x: x,
        y: -size,
        width: size,
        height: size,

        // Physics (scaled and will be normalized by delta)
        vy: 2 * scaleFactor, // Initial slow speed
        gravity: 0.2 * speedMultiplier * scaleFactor, // Accelerates over time

        // State
        state: 'falling', // 'falling' or 'splat'

        // Splat Animation
        frameX: 0,
        gameFrame: 0,
        staggerFrames: 5,
        maxFrames: 6 // Assumption: 6 frames in sheet
    });
}

function update(deltaTime) {
    // Clamp deltaTime to avoid spiral of death after tab switch or lag spike
    if (deltaTime > 100) deltaTime = 100;

    // Calculate time factor for frame-rate independent physics
    // At 60fps, delta ~= 1.0; at 30fps, delta ~= 2.0
    const delta = deltaTime / TARGET_FRAME_TIME;

    const displayWidth = canvas.parentElement.clientWidth;
    const displayHeight = canvas.parentElement.clientHeight;

    // Scaled physics values
    const scaledAcceleration = player.acceleration * scaleFactor;
    const scaledMaxSpeed = player.maxSpeed * scaleFactor;

    // Player Movement logic depends on game state
    const movingLeft = isMovingLeft();
    const movingRight = isMovingRight();

    if (!isGameOver) {
        if (movingLeft) player.vx -= scaledAcceleration * delta;
        if (movingRight) player.vx += scaledAcceleration * delta;
    }

    // Apply friction (physics continue even when dead)
    if ((!movingLeft && !movingRight) || isGameOver) {
        // Friction needs to be applied per-frame, adjusted for delta
        const frictionPerFrame = Math.pow(player.friction, delta);
        player.vx *= frictionPerFrame;

        // Dead zone: only zero-out velocity when decelerating (no keys pressed)
        // This prevents high refresh rate monitors from killing velocity during acceleration
        if (Math.abs(player.vx) < 0.1 * scaleFactor) player.vx = 0;
    }

    // Limit speed
    if (player.vx > scaledMaxSpeed) player.vx = scaledMaxSpeed;
    if (player.vx < -scaledMaxSpeed) player.vx = -scaledMaxSpeed;

    player.x += player.vx * delta;

    // Player Boundary Checks
    const playerHitWidth = player.width * player.collisionScale;
    const playerHitOffset = (player.width - playerHitWidth) / 2;
    const borderOffset = Math.round(10 * scaleFactor);

    if (player.x + playerHitOffset < borderOffset) {
        player.x = -playerHitOffset + borderOffset;
        player.vx = 0;
    }
    if (player.x + playerHitOffset + playerHitWidth > displayWidth - borderOffset) {
        player.x = displayWidth - playerHitWidth - playerHitOffset - borderOffset;
        player.vx = 0;
    }

    // Poop Spawning and Updates - Always run
    spawnTimer += deltaTime;
    if (spawnTimer > spawnInterval) {
        spawnPoop();
        spawnTimer = 0;
        // Make it harder (more poop) faster, capping at minimum
        if (spawnInterval > 60) spawnInterval -= 0.5 * delta;
        speedMultiplier += 0.002 * delta;
    }

    // Update Poops
    const floorOffset = Math.round(10 * scaleFactor);
    for (let i = poops.length - 1; i >= 0; i--) {
        let p = poops[i];

        if (p.state === 'falling') {
            // Apply gravity with delta normalization
            p.vy += p.gravity * delta;
            p.y += p.vy * delta;

            // Collision Detection - Only check if game is running
            if (!isGameOver) {
                // Player Hitbox
                const playerHitX = player.x + playerHitOffset;
                const hitOffsetY = Math.round(20 * scaleFactor);
                const playerHitY = player.y + hitOffsetY;
                const playerHitH = player.height - hitOffsetY;

                // Poop Hitbox (scaled)
                const poopHitW = Math.round(20 * scaleFactor);
                const poopHitH = Math.round(30 * scaleFactor);
                const poopHitX = p.x + (p.width - poopHitW) / 2;
                const poopHitY = p.y + (p.height - poopHitH) / 2;

                if (
                    playerHitX < poopHitX + poopHitW &&
                    playerHitX + playerHitWidth > poopHitX &&
                    playerHitY < poopHitY + poopHitH &&
                    playerHitY + playerHitH > poopHitY
                ) {
                    gameOver();
                }
            }

            // Ground Check
            if (p.y + p.height >= displayHeight - floorOffset) {
                p.state = 'splat';
                p.y = displayHeight - p.height - floorOffset;
                // Only increment score if game is running
                if (!isGameOver) {
                    score += 1;
                    scoreElement.textContent = score;
                }
                // Calculate maxFrames for splat if image is loaded
                if (poopSplatSprite.complete && poopSplatSprite.width > 0) {
                    p.maxFrames = Math.floor(poopSplatSprite.width / 256);
                }
            }
        } else if (p.state === 'splat') {
            p.gameFrame += delta;
            if (Math.floor(p.gameFrame) % p.staggerFrames === 0 &&
                Math.floor(p.gameFrame) !== Math.floor(p.gameFrame - delta)) {
                p.frameX++;
            }
            if (p.frameX >= p.maxFrames) {
                poops.splice(i, 1);
            }
        }
    }
}

function drawPlayerSprite(x, y, w, h) {
    if (player.state === 'dead') {
        const sprite = playerSprites.dead;
        if (sprite && sprite.complete) {
            ctx.drawImage(sprite, x, y, w, h);
        }
        return;
    }

    let newState;
    if (isMovingLeft()) {
        newState = 'run';
        player.facingLeft = true;
    } else if (isMovingRight()) {
        newState = 'run';
        player.facingLeft = false;
    } else {
        newState = 'idle';
    }

    // Reset animation frame when state changes
    if (player.state !== newState) {
        player.frameX = 0;
        player.gameFrame = 0;
    }
    player.state = newState;

    let sprite = playerSprites[player.state];
    if (!sprite || !sprite.complete) return;

    let maxFrames;
    let sx, sy, sw, sh;

    // Both idle and run use 128x128 multi-row sprite sheets
    sw = 128;
    sh = 128;

    let cols;
    if (player.state === 'idle') {
        maxFrames = player.idleTotalFrames;
        cols = player.idleCols;
    } else {
        maxFrames = player.runTotalFrames;
        cols = player.runCols;
    }

    player.gameFrame++;
    if (player.gameFrame % player.staggerFrames === 0) {
        if (player.frameX < maxFrames - 1) player.frameX++;
        else player.frameX = 0;
    }

    // Multi-row: calculate column and row from frame index
    const col = player.frameX % cols;
    const row = Math.floor(player.frameX / cols);
    sx = col * 128;
    sy = row * 128;

    ctx.save();
    if (!player.facingLeft) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        x = 0;
    } else {
        ctx.translate(x, y);
        x = 0;
    }

    ctx.drawImage(sprite, sx, sy, sw, sh, 0, 0, w, h);
    ctx.restore();
}

function drawPoop(p) {
    if (p.state === 'falling') {
        if (poopSprite.complete) {
            ctx.drawImage(poopSprite, p.x, p.y, p.width, p.height);
        } else {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }
    } else if (p.state === 'splat') {
        if (poopSplatSprite.complete) {
            // Use user-defined fixed frame size
            const frameW = 256;
            const frameH = 256;

            ctx.drawImage(
                poopSplatSprite,
                p.frameX * frameW, 0, frameW, frameH,
                p.x, p.y, p.width, p.height
            );
        }
    }
}

function draw() {
    const displayWidth = canvas.parentElement.clientWidth;
    const displayHeight = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    drawPlayerSprite(player.x, player.y, player.width, player.height);
    for (let p of poops) {
        drawPoop(p);
    }
}

function gameLoop(timestamp) {
    if (!isGameRunning) return;

    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Skip first frame if deltaTime is unreasonable
    if (deltaTime <= 0 || deltaTime > 1000) {
        deltaTime = TARGET_FRAME_TIME;
    }

    update(deltaTime);
    draw();

    animationId = requestAnimationFrame(gameLoop);
}

// Start/Restart: click or touch anywhere when not running
let canRestart = true;

function tryStartGame() {
    if ((!isGameRunning || isGameOver) && canRestart) {
        initGame();
    }
}

// Mouse click to start
window.addEventListener('click', tryStartGame);

// Touch to start (using touchend to avoid conflict with movement touches)
window.addEventListener('touchend', (e) => {
    if ((!isGameRunning || isGameOver) && canRestart) {
        e.preventDefault();
        initGame();
    }
});

// Initial setup
resize();
draw();
