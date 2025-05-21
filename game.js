// --- 2D FROGGER GAME ---
// Basic Frogger game setup
const canvas = document.getElementById('gameCanvas');
let ctx = null;
let GAME_WIDTH = 600;
let GAME_HEIGHT = 800; // Increased from 600 to 800 to accommodate uniform 50px lane heights
const HUD_HEIGHT = 70; // Height of the HUD area
let frogStartingY; // Will store the frog's Y position after reset

function setupCanvas() {
    let c = document.getElementById('gameCanvas');
    if (!c) {
        c = document.createElement('canvas');
        c.width = 600;
        c.height = 800; // Increased height from 675 to 800
        c.id = 'gameCanvas';
        document.body.appendChild(c);
    } else {
        c.width = 600;
        c.height = 800; // Ensure height is updated if canvas already exists
    }
    ctx = c.getContext('2d');
    GAME_WIDTH = c.width;
    GAME_HEIGHT = c.height;
}

// Frog properties
const frog = {
    x: GAME_WIDTH / 2 - 20, // Width is still 40, center based on that
    y: GAME_HEIGHT - 40,    // Initial Y, will be properly set by resetFrog
    width: 40,              // Keeping width 40 for now, image might look squashed
    height: 40,             // Changed back to 40px for better proportions
    color: 'lime',
};

let paused = false;

let obstacles = [];

let powerUps = [];

let timerActive = true;

let timer = 30; // seconds

let timerStart = Date.now();
let highScore = 0;
let lives = 3;
let level = 1;
let leaderboard = [
    { score: 120, date: '5/19' },
    { score: 105, date: '5/18' },
    { score: 95, date: '5/17' },
    { score: 85, date: '5/16' },
    { score: 80, date: '5/15' },
    { score: 75, date: '5/14' },
    { score: 70, date: '5/13' },
    { score: 65, date: '5/12' },
    { score: 60, date: '5/11' },
    { score: 55, date: '5/10' },
    { score: 50, date: '5/9' },    { score: 45, date: '5/8' }
]; // Initialize with sample leaderboard data for 4x3 grid
let powerUpActive = null;
let powerUpTimer = 0;
let powerUpText = null;     // Text to display when power-up is collected
let powerUpTextTimer = 0;   // Timer for how long to display the text (30 frames = 1 second)
const HOME_SLOTS = 5;
let homeSlotWidth = GAME_WIDTH / HOME_SLOTS; // Changed const to let
let homeSlots = Array(HOME_SLOTS).fill(false);

const lanes = [
    // All lanes use consistent 50px heights and positioned on a 50px grid
    // Updated lane Y positions to match new layout
    
    // Top area (home slots): First 50px (from Y=0 to Y=49)
    
    // Log Lanes (Water) - 3 water lanes, each 50px high
    { type: 'log', y: 50, count: 1, speed: 2, width: 180, height: 50, color: 'burlywood' },   // First water lane
    { type: 'log', y: 100, count: 1, speed: -2, width: 160, height: 50, color: 'peru' },      // Second water lane
    { type: 'log', y: 150, count: 2, speed: 1.5, width: 120, height: 50, color: 'saddlebrown' }, // Third water lane
    
    // 50px grass strip between water and first new car lane (from Y=200 to Y=249)
      // New Car Lanes - 2 lanes
    { type: 'car', y: 250, count: 2, speed: 2.2, width: 60, height: 50, color: 'red' },  // First new car lane - changed from purple to red
    { type: 'car', y: 300, count: 3, speed: -1.8, width: 60, height: 50, color: 'yellow' },   // Second new car lane - changed from teal to yellow
    
    // 50px grass strip between new and existing car lanes (from Y=350 to Y=399)
    
    // Existing Road Lanes
    { type: 'car', y: 400, count: 3, speed: 2.5, width: 60, height: 50, color: 'orange' },  // Orange car lane
    { type: 'bus', y: 450, count: 1, speed: -3, width: 100, height: 50, color: 'blue' },    // Bus lane
    { type: 'car', y: 500, count: 2, speed: 2, width: 60, height: 50, color: 'red' },      // Red car lane
    
    // Bottom grass area (frog starting zone): 50px (from Y=550 to Y=599)
    // Space between gameplay and HUD: 100px (from Y=600 to Y=699)
    // HUD area: 100px (from Y=700 to Y=799)
];

// const LOG_LANE_Y_POSITIONS = lanes.filter(l => l.type === 'log').map(l => l.y); // Kept for reference, ensure logic uses dynamic checks

let score = 0;

// Countdown timer for frog reset
let frogResetCountdown = 0; // Countdown timer in frames (0 means no countdown)
let frogCanMove = true;     // Flag to control whether the frog can move

// --- 2D GAMELOOP ---
function gameLoop() {
    if (!ctx) {
        // If context is not available, show error
        if (document.body && !document.getElementById('canvas-error')) {
            const err = document.createElement('div');
            err.id = 'canvas-error';
            err.style.color = 'red';
            err.style.position = 'absolute';
            err.style.top = '50%';
            err.style.left = '50%';
            err.style.transform = 'translate(-50%, -50%)';
            err.style.fontSize = '24px';
            err.textContent = 'Canvas not supported or failed to initialize.';
            document.body.appendChild(err);
        }
        return;
    }
    if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
        ctx.fillStyle = 'yellow';
        ctx.font = '48px Arial';
        ctx.fillText('PAUSED', 200, 300);
        requestAnimationFrame(gameLoop);
        return;
    }    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawGrassAndWaterAndRoad(); // Draw grass, water, and road before everything else
    // drawHighwayLanes(); // Removed highway lanes
    // Draw homes, obstacles, frog, powerups, HUD, leaderboard, etc.
    drawHomes();
    drawObstacles();
    drawFrog();
    drawHUD();
    drawPowerUps();
    drawLeaderboard();
    drawPowerUpText(); // Draw any active power-up text notification
    drawCountdownText(); // Draw countdown text if active
    moveObstacles();
    checkCollisionsAndLogs();
    checkWinCondition();
    spawnPowerUp();
    checkPowerUpCollision();
    // Timer logic
    if (timerActive) {
        timer -= (Date.now() - timerStart) / 1000;
        timerStart = Date.now();
        if (timer <= 0) {
            resetFrogAndLoseLife();
            resetTimer();
        }
    }    // Power-up timer
    if (powerUpActive) {
        powerUpTimer--;
        if (powerUpTimer <= 0) {
            // If invincible power-up is ending, stop the sound
            if (powerUpActive === 'invincible') {
                invincibleSound.pause();
                invincibleSound.currentTime = 0;
            }
            powerUpActive = null;
        }
    }
    // Handle countdown timer after frog reset
    if (frogResetCountdown > 0) {
        frogResetCountdown--;
        if (frogResetCountdown === 0) {
            frogCanMove = true; // Enable frog movement when countdown reaches 0
        }
    }
    requestAnimationFrame(gameLoop);
}

// --- INIT 2D ---
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas(); // Sets initial GAME_WIDTH, GAME_HEIGHT
    initObstacles();
    resetFrog(); // Initialize frog's position and frogStartingY
    resizeCanvas(); // Call resizeCanvas after setup to apply responsive sizing and update GAME_WIDTH/HEIGHT
    gameLoop();
});

function moveObstacles() {
    obstacles.forEach(obj => {
        obj.x += obj.speed;
        // Wrap around screen
        if (obj.speed > 0 && obj.x > GAME_WIDTH) obj.x = -obj.width;
        if (obj.speed < 0 && obj.x + obj.width < 0) obj.x = GAME_WIDTH;
    });
}

// --- PAUSE AND RESUME ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'p') {
        paused = !paused;
        if (paused) {
            // Pause invincible sound if it's playing
            if (powerUpActive === 'invincible') {
                invincibleSound.pause();
            }
            
            // Show pause menu (simple text for now)
            const pauseText = document.createElement('div');
            pauseText.id = 'pauseMenu';
            pauseText.style.position = 'absolute';
            pauseText.style.top = '50%';
            pauseText.style.left = '50%';
            pauseText.style.transform = 'translate(-50%, -50%)';
            pauseText.style.fontSize = '24px';
            pauseText.style.color = 'white';
            pauseText.innerText = 'PAUSED\nPress P to Resume';
            document.body.appendChild(pauseText);
        } else {
            // Resume invincible sound if appropriate
            if (powerUpActive === 'invincible') {
                invincibleSound.play().catch(e => console.log("Error resuming invincible sound:", e));
            }
            
            // Hide pause menu
            const pauseText = document.getElementById('pauseMenu');
            if (pauseText) pauseText.remove();
        }
    }
    // Frog movement
    if (!paused && frogCanMove) {
        const step = 50; // Changed step to 50px to match lane height
        let newFrogY = frog.y;
        const horizontalStep = 40; // Keep horizontal movement at 40px

        if (e.key === 'ArrowUp') newFrogY -= step;
        if (e.key === 'ArrowDown') newFrogY += step;
        if (e.key === 'ArrowLeft') frog.x -= horizontalStep;
        if (e.key === 'ArrowRight') frog.x += horizontalStep;

        // Prevent frog from moving below its starting position
        // and also not above the top of the screen (y=0)
        frog.y = Math.max(0, Math.min(newFrogY, frogStartingY));

        frog.x = Math.max(0, Math.min(GAME_WIDTH - frog.width, frog.x));
    }
});

// --- RESIZE CANVAS ---
function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return; // Prevent TypeError if canvas is not found
    
    // Preserve the game's original aspect ratio
    const gameAspectRatio = 600 / 800; // Updated to match new canvas dimensions
    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;

    // Adjust canvas size to fit window while maintaining game aspect ratio
    if (newWidth / newHeight > gameAspectRatio) {
        // Window is wider than game aspect ratio, so height is the constraint
        newHeight = Math.min(newHeight, 800); // Updated max game height
        newWidth = newHeight * gameAspectRatio;
    } else {
        // Window is taller or equal to game aspect ratio, so width is the constraint
        newWidth = Math.min(newWidth, 600); // Max game width
        newHeight = newWidth / gameAspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight; // This height is for the play area, HUD will be drawn within this.
                               // If canvas.height was meant to include HUD, original setupCanvas needs to be source of truth for GAME_HEIGHT.
                               // For now, assuming GAME_HEIGHT refers to the full canvas height.

    GAME_WIDTH = canvas.width;
    GAME_HEIGHT = canvas.height;
    
    // Recalculate things that depend on GAME_WIDTH
    homeSlotWidth = GAME_WIDTH / HOME_SLOTS;

    // Ensure frog is within new bounds (optional, as frog movement already clamps)
    frog.x = Math.max(0, Math.min(GAME_WIDTH - frog.width, frog.x));
    frog.y = Math.max(0, Math.min(GAME_HEIGHT - frog.height, frog.y));

    // Obstacle positions are based on fixed lane.y and GAME_WIDTH for x-spacing.
    // If GAME_WIDTH changes significantly, their relative x positions might need adjustment
    // or re-initialization. For simplicity, we'll let initObstacles handle it if called,
    // but a full re-init on every resize tick can be disruptive.
    // initObstacles(); // Uncomment if obstacles must be fully reset/respaced on resize.
}

window.addEventListener('resize', resizeCanvas);
// resizeCanvas(); // Called in DOMContentLoaded after setupCanvas

function rectsCollide(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function resetTimer() {
    timer = 30; // Reset timer to initial value
    timerStart = Date.now(); // Reset the timer's reference start time
    timerActive = true; // Ensure the timer is active
}

function resetFrogAndLoseLife() {
    // Play collision sound when the frog collides with an obstacle
    collisionSound.currentTime = 0; // Reset sound to beginning
    collisionSound.play().catch(e => console.log("Error playing collision sound:", e));
    
    // Stop invincible sound if it was playing
    if (powerUpActive === 'invincible') {
        invincibleSound.pause();
        invincibleSound.currentTime = 0;
    }
    
    lives--;
    resetFrog();
    resetTimer();
    // Clear any active power-up text
    powerUpText = null;
    powerUpTextTimer = 0;
    
    if (lives <= 0) {
        // Add score to leaderboard when game is over
        addScoreToLeaderboard(score);
        
        // Reset game state
        lives = 3;
        score = 0;
        level = 1;
        homeSlots = Array(HOME_SLOTS).fill(false);
        initObstacles();
        resetTimer();
        powerUps = [];
        powerUpActive = null;
    }
}

function resetFrog() {
    // Center frog horizontally
    frog.x = GAME_WIDTH / 2 - frog.width / 2;

    // Place frog at the top of the frog starting area
    // The last road lane ends at Y=550, so frog starting zone is Y=550 to Y=599
    const frogStartingAreaY = 550; 
    
    // Center the 40px tall frog within the 50px row. So top of frog is at Y + 5
    frog.y = frogStartingAreaY + (50 - frog.height) / 2; // 550 + 5 = 555
    
    frogStartingY = frog.y; // Store the initial Y position
    // Start the 3-second countdown (assuming 30fps, 90 frames)
    frogResetCountdown = 90;
    frogCanMove = false;
}

function initObstacles() {
    obstacles = [];
    lanes.forEach(lane => {
        for (let i = 0; i < lane.count; i++) {
            const spacing = GAME_WIDTH / lane.count;
            // Use original lane width/height for all obstacles
            obstacles.push({
                type: lane.type,
                x: i * spacing,
                y: lane.y,
                width: lane.width,
                height: lane.height,
                speed: lane.speed,
                color: lane.color
            });
        }
    });
}

function drawHomes() {
    // Move home slots higher to avoid overlaying HUD text
    const homeSlotY = 5; // move closer to the top
    for (let i = 0; i < HOME_SLOTS; i++) {
        // Draw a more visible border for the home slots
        ctx.strokeStyle = '#FFFFFF'; // Bright white
        ctx.lineWidth = 3;
        const x = Math.round(i * homeSlotWidth + 10) + 0.5;
        const y = homeSlotY + 0.5;
        const w = Math.round(homeSlotWidth - 20);
        const h = 35;
        
        // Add a darker background to make the slots more visible
        ctx.fillStyle = 'rgba(0, 50, 0, 0.5)';  // Semi-transparent dark green
        ctx.fillRect(x, y, w, h);
        
        ctx.strokeRect(x, y, w, h);
        
        if (homeSlots[i]) {
            ctx.fillStyle = 'lime';
            ctx.fillRect(Math.round(i * homeSlotWidth + 20), homeSlotY + 10, Math.round(homeSlotWidth - 40), 15);
        }
    }
}

let logImg = new window.Image();
logImg.src = 'log.png';

let busImg = new window.Image();
busImg.src = 'bus.png';

let redCarImg = new window.Image();
redCarImg.src = 'red-car.png';

let yellowCarImg = new window.Image();
yellowCarImg.src = 'yellow-car.png';

let powerupInvincibleImg = new window.Image();
powerupInvincibleImg.src = 'powerup_invincible.png';

let powerupLifeImg = new window.Image();
powerupLifeImg.src = 'powerup_life.png';

let powerupScoreImg = new window.Image();
powerupScoreImg.src = 'powerup_score.png';

// Audio elements for sound effects
let collisionSound = new Audio('collision.mp3');
collisionSound.preload = 'auto';

let invincibleSound = new Audio('Invincible.mp3');
invincibleSound.preload = 'auto';
invincibleSound.loop = true; // Loop the invincible sound while the power-up is active

let lifeSound = new Audio('life.mp3');
lifeSound.preload = 'auto';

let scoreSound = new Audio('score.mp3');
scoreSound.preload = 'auto';

let homeSound = new Audio('home.mp3');
homeSound.preload = 'auto';

function drawObstacles() {
    obstacles.forEach(obj => {
        if (obj.type === 'log' && logImg.complete && logImg.naturalWidth > 0) {
            ctx.drawImage(logImg, obj.x, obj.y, obj.width, obj.height);
        } else if (obj.type === 'bus' && busImg.complete && busImg.naturalWidth > 0) {
            // Reverse the bus image direction by flipping horizontally
            ctx.save();
            ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
            ctx.scale(-1, 1); // Flip horizontally
            ctx.drawImage(busImg, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
            ctx.restore();
        } else if (obj.type === 'car' && (obj.color === 'red' || obj.color === '#ff0000')) {
            // Draw red cars
            if (redCarImg.complete && redCarImg.naturalWidth > 0) {
                // Flip image if moving right to left
                if (obj.speed < 0) {
                    ctx.save();
                    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
                    ctx.scale(-1, 1); // Flip horizontally
                    ctx.drawImage(redCarImg, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(redCarImg, obj.x, obj.y, obj.width, obj.height);
                }
            } else {
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            }
        } else if (obj.type === 'car' && (obj.color === 'yellow' || obj.color === 'orange' || obj.color === '#ffa500' || obj.color === '#ffff00')) {
            // Draw yellow/orange cars
            if (yellowCarImg.complete && yellowCarImg.naturalWidth > 0) {
                // Flip image if moving right to left
                if (obj.speed < 0) {
                    ctx.save();
                    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
                    ctx.scale(-1, 1); // Flip horizontally
                    ctx.drawImage(yellowCarImg, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(yellowCarImg, obj.x, obj.y, obj.width, obj.height);
                }
            } else {
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            }
        } else {
            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        }
    });
}

let frogImg = new window.Image();
frogImg.src = 'frog.png';

function drawFrog() {
    if (frogImg.complete && frogImg.naturalWidth > 0) {
        ctx.drawImage(frogImg, frog.x, frog.y, frog.width, frog.height);
    } else {
        ctx.fillStyle = frog.color;
        ctx.fillRect(frog.x, frog.y, frog.width, frog.height);
    }
    
    // Display "Invincible" text under the frog when the invincibility power-up is active
    if (powerUpActive === 'invincible') {
        // Calculate position (centered below the frog)
        const textX = frog.x + frog.width / 2;
        const textY = frog.y + frog.height + 15; // Position below the frog
        
        // Set style for the invincible text
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Create a background for better readability
        const text = "INVINCIBLE";
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(textX - textWidth / 2 - 4, textY - 10, textWidth + 8, 20);
        
        // Draw the text with cyan color to match the power-up
        ctx.fillStyle = 'cyan';
        ctx.fillText(text, textX, textY);
        
        // Add a pulsing effect with opacity
        if (powerUpTimer % 10 < 5) {
            ctx.globalAlpha = 0.7;
        } else {
            ctx.globalAlpha = 1.0;
        }
        
        ctx.restore();
    }
}

function drawPowerUps() {
    powerUps.forEach(powerUp => {
        let imgToDraw;
        switch (powerUp.type) {
            case 'invincible':
                imgToDraw = powerupInvincibleImg;
                break;
            case 'life':
                imgToDraw = powerupLifeImg;
                break;
            case 'score':
                imgToDraw = powerupScoreImg;
                break;
        }

        const drawX = powerUp.x;
        const drawY = powerUp.y;
        const drawWidth = powerUp.width; // Use defined width from spawnPowerUp
        const drawHeight = powerUp.height; // Use defined height from spawnPowerUp

        if (imgToDraw && imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
            ctx.drawImage(imgToDraw, drawX, drawY, drawWidth, drawHeight);
        } else {
            // Fallback to colored rectangles if images are not loaded or type is unknown
            ctx.fillStyle = powerUp.color;
            ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
            // Fallback text if image fails or is not available
            if (!imgToDraw || !imgToDraw.complete || imgToDraw.naturalHeight === 0) {
                ctx.fillStyle = 'black';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(powerUp.type[0].toUpperCase(), drawX + drawWidth / 2, drawY + drawHeight / 2);
            }
        }
    });
}

function drawHUD() {
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    // Position HUD text within the HUD area (Y=610 to Y=799)
    const baseY = 650; // Adjusted for new HUD position
    ctx.fillText('Score: ' + score, 10, baseY);
    ctx.fillText('High Score: ' + highScore, 410, baseY);
    ctx.fillText('Lives: ' + lives, 10, baseY + 30);
    ctx.fillText('Level: ' + level, 410, baseY + 30);
    ctx.fillStyle = timer <= 5 ? 'red' : 'white';
    ctx.fillText('Time: ' + Math.max(0, Math.ceil(timer)), 250, baseY);
}

function drawLeaderboard() {
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';  // Reduced font size from 16px to 14px
    // Move leaderboard to the HUD area below the divider line
    const baseY = 705;  // Adjusted to be slightly higher
    const leftMargin = 20; // Left margin for the leaderboard text
    
    // Left-align the leaderboard title 
    ctx.textAlign = 'left';
    ctx.fillText('Leaderboard:', leftMargin, baseY + 15);
      if (Array.isArray(leaderboard) && leaderboard.length > 0) {
        // Display up to 12 entries in a 3×4 grid (3 rows, 4 columns)
        const maxEntriesToShow = Math.min(12, leaderboard.length);
        const columnWidth = 140; // Reduced width between columns
        const rowHeight = 18;    // Reduced row height for better fit
        
        for (let i = 0; i < maxEntriesToShow; i++) {
            const entry = leaderboard[i];
            const col = i % 4;              // Column (0, 1, 2, or 3)
            const row = Math.floor(i / 4);  // Row (0, 1, or 2)
            
            // Calculate position based on row and column
            const posX = leftMargin + (col * columnWidth);
            const posY = baseY + 32 + (row * rowHeight); // Adjusted starting position
              // Add rank indicator with better formatting
            ctx.fillStyle = i < 3 ? '#FFD700' : 'white'; // Gold color for top 3 scores
            // Shorter format with less space
            ctx.fillText(`${i+1}.${entry.score}(${entry.date || ''})`, posX, posY);
            ctx.fillStyle = 'white'; // Reset to white for other elements
        }
    } else {
        // Display a message if leaderboard is empty
        ctx.fillText("No scores yet. Play to set records!", leftMargin, baseY + 35);
    }
    
    // Reset text alignment to default
    ctx.textAlign = 'start';
}

function checkCollisionsAndLogs() {
    let onLog = false; 

    for (const obj of obstacles) {
        if (obj.type === 'car' || obj.type === 'bus') {
            if (!powerUpActive && rectsCollide(frog, obj)) {
                resetFrogAndLoseLife();
                return; 
            }
        } else if (obj.type === 'log') {
            if (rectsCollide(frog, obj)) {
                onLog = obj; 
            }
        }
    }

    // Define water zone as Y=50 to Y=199 (the log lanes area)
    const waterMinY = 50;
    const waterMaxY = 200;
    
    // Check if frog is in water zone
    const isInWaterZone = frog.y + frog.height > waterMinY && frog.y < waterMaxY;

    if (isInWaterZone) {
        if (!onLog && !powerUpActive) {
            resetFrogAndLoseLife();
        } else if (onLog) {
            frog.x += onLog.speed;
            frog.x = Math.max(0, Math.min(GAME_WIDTH - frog.width, frog.x));
        }
    }
}

function checkWinCondition() {
    // Frog needs to reach top area (below Y=30 which is within the home slots area)
    if (frog.y <= 30) {
        // Find home slot
        let slot = Math.floor(frog.x / homeSlotWidth);        if (!homeSlots[slot]) {
            homeSlots[slot] = true;
            score++;
            if (score > highScore) highScore = score;
            
            // Play home sound when frog reaches a home slot
            homeSound.currentTime = 0;
            homeSound.play().catch(e => console.log("Error playing home sound:", e));
        }
        
        // Stop invincible sound if it was playing
        if (powerUpActive === 'invincible') {
            invincibleSound.pause();
            invincibleSound.currentTime = 0;
        }
        
        resetFrog();
        resetTimer();
        // Clear any active power-up text
        powerUpText = null;
        powerUpTextTimer = 0;
        powerUpActive = null; // Clear power-up when reaching home
        
        // All homes filled: next level
        if (homeSlots.every(Boolean)) {
            level++;
            // Add level completion bonus to leaderboard if it's a significant score
            if (score >= 5) {
                addScoreToLeaderboard(score);
            }
            increaseDifficulty();
            homeSlots = Array(HOME_SLOTS).fill(false);
        }
    }
}

function spawnPowerUp() {
    if (powerUps.length < 1 && Math.random() < 0.01) {
        const types = ['life', 'invincible', 'score'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Define valid areas for spawning power-ups (avoid home slots and frog starting area)
        // Consider placing in grass strips between hazards, water, or road lanes
        const validYMin = 100;  // After first water lane
        const validYMax = 500;  // Before last road lane
        
        powerUps.push({
            type,
            x: Math.random() * (GAME_WIDTH - 30),
            y: validYMin + Math.random() * (validYMax - validYMin),
            width: 30,
            height: 30,
            color: type === 'life' ? 'pink' : type === 'invincible' ? 'cyan' : 'gold',
        });
    }
}

function checkPowerUpCollision() {
    powerUps = powerUps.filter(p => {
        if (rectsCollide(frog, p)) {
            // Set power-up text and display timer (30 frames = 1 second at 30fps)
            powerUpText = p.type.charAt(0).toUpperCase() + p.type.slice(1); // Capitalize first letter
            powerUpTextTimer = 30; // Display for 1 second
            
            if (p.type === 'invincible') {
                powerUpActive = 'invincible';
                powerUpTimer = 300; // 10 seconds
                
                // Play invincible sound
                invincibleSound.currentTime = 0; // Reset sound to beginning
                invincibleSound.play().catch(e => console.log("Error playing invincible sound:", e));            } else if (p.type === 'life') {
                lives++;
                // Play life sound when collecting life power-up                lifeSound.currentTime = 0; // Reset sound to beginning
                lifeSound.play().catch(e => console.log("Error playing life sound:", e));
            } else if (p.type === 'score') {
                score += 10;
                // Play score sound when collecting score power-up
                scoreSound.currentTime = 0; // Reset sound to beginning
                scoreSound.play().catch(e => console.log("Error playing score sound:", e));
            }
            return false; // Remove power-up after collection
        }
        return true; // Keep power-up if no collision
    });
}

// Function to add score to leaderboard
function addScoreToLeaderboard(playerScore) {
    if (playerScore <= 0) return; // Don't add zero or negative scores
    
    // Create a formatted date string (e.g., "5/20")
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;
    
    // Add score with date to leaderboard
    leaderboard.push({
        score: playerScore,
        date: dateStr
    });
    
    // Sort leaderboard by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 12 scores for display in a 4x3 grid
    if (leaderboard.length > 12) {
        leaderboard = leaderboard.slice(0, 12);
    }
}

// --- DEBUGGING ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'd') {
        // Toggle debug mode on/off
        window.debugMode = !window.debugMode;
        if (window.debugMode) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            ctx.restore();
        } else {
            ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            drawGrassAndWaterAndRoad();
            drawHomes();
            drawObstacles();
            drawFrog();
            drawHUD();
            drawPowerUps();
            drawLeaderboard();
        }
    }
    if (window.debugMode && e.key === 'r') {
        // Reset game on 'r' key press in debug mode
        lives = 0; // Force game over
    }
});

function increaseDifficulty() {
    // Increase speed of all obstacles
    obstacles.forEach(obj => {
        obj.speed *= 1.1;
    });
    // Optionally, increase the number of obstacles or decrease gaps
    lanes.forEach(lane => {
        lane.count = Math.min(5, lane.count + 1); // Max 5 per lane (reduced from 6)
    });
    initObstacles(); // Reinitialize obstacles with new settings
}

// --- GRASS, WATER, AND ROAD DRAWING ---
function drawGrassAndWaterAndRoad() {
    const rowHeight = 50; // Standard height for all game rows
      // Define key boundary positions with reduced space
    const homeAreaEndY = 50;    // Home area (0-49) - Reduced from 100px to 50px
    const waterAreaEndY = 200;   // Water/log lanes area (50-199) - Moved up by 50px
    const newRoadAreaEndY = 350; // New cars area (250-349) - Moved up by 50px
    const oldRoadAreaEndY = 550; // Original car/bus lanes area (400-549) - Moved up by 50px
    const frogAreaEndY = 600;    // Frog starting area (550-599) - Moved up by 50px
    const hudAreaStartY = 610;   // HUD area (610-799) - Now just 10px below frog area
    
    // 1. Top Green Area (Homes)
    ctx.fillStyle = '#228B22'; // Forest green
    ctx.fillRect(0, 0, GAME_WIDTH, homeAreaEndY);
    
    // 2. No middle grass strip between Home area and Water - water starts immediately
    
    // 3. Water Area for Log Lanes - starts right after home area
    ctx.fillStyle = '#1e90ff'; // Dodger blue for water
    ctx.fillRect(0, homeAreaEndY, GAME_WIDTH, waterAreaEndY - homeAreaEndY);
    
    // 4. Grass Strip between Water and New Car Lanes
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, waterAreaEndY, GAME_WIDTH, 50); // 50px wide grass strip
    
    // 5. New Car Lanes Area - Fill road color for each lane individually
    // Update the Y range check to match the new positions
    const newCarLanes = lanes.filter(l => 
        (l.type === 'car' || l.type === 'bus') && 
        l.y >= 250 && l.y < 350);
    
    newCarLanes.forEach(lane => {
        ctx.fillStyle = '#444'; // Dark gray for road
        ctx.fillRect(0, lane.y, GAME_WIDTH, lane.height);
    });
    
    // 6. Grass Strip between New and Old Car Lanes
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, 350, GAME_WIDTH, 50); // 50px wide grass strip
    
    // 7. Old Car Lanes Area - Fill road color for each lane individually
    // Update the Y range check to match the new positions
    const oldCarLanes = lanes.filter(l => 
        (l.type === 'car' || l.type === 'bus') && 
        l.y >= 400 && l.y < 550);
    
    oldCarLanes.forEach(lane => {
        ctx.fillStyle = '#444'; // Dark gray for road
        ctx.fillRect(0, lane.y, GAME_WIDTH, lane.height);
    });
    
    // 8. Frog Starting Area (Grass)
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, oldRoadAreaEndY, GAME_WIDTH, frogAreaEndY - oldRoadAreaEndY);
    
    // 9. Space Between Frog Area and HUD
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, frogAreaEndY, GAME_WIDTH, hudAreaStartY - frogAreaEndY);    // 10. HUD Grass Background
    ctx.fillRect(0, hudAreaStartY, GAME_WIDTH, GAME_HEIGHT - hudAreaStartY);
    
    // 11. Black line at the top of the HUD
    ctx.save();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hudAreaStartY);
    ctx.lineTo(GAME_WIDTH, hudAreaStartY);
    ctx.stroke();
      // 12. Add a subtle divider between the main HUD and leaderboard
    ctx.strokeStyle = '#1a6500'; // Darker green
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 695);  // Moved slightly higher
    ctx.lineTo(GAME_WIDTH, 695);
    ctx.stroke();
    ctx.restore();
    
    // 12. Draw broken yellow lines between road lanes (not crossing grass strips)
    const roadLanes = [...lanes].filter(l => l.type === 'car' || l.type === 'bus').sort((a, b) => a.y - b.y);
    
    for (let i = 0; i < roadLanes.length - 1; i++) {
        const upperLane = roadLanes[i];
        const lowerLane = roadLanes[i+1];
        
        // Only draw line if lanes are directly adjacent (no grass strip between them)
        if (lowerLane.y === upperLane.y + upperLane.height) {
            const lineY = upperLane.y + upperLane.height;
            
            ctx.save();
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 4;
            ctx.setLineDash([18, 18]);
            ctx.beginPath();
            ctx.moveTo(0, lineY - ctx.lineWidth/2);
            ctx.lineTo(GAME_WIDTH, lineY - ctx.lineWidth/2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}

// Function to draw power-up text notification
function drawPowerUpText() {
    if (powerUpText && powerUpTextTimer > 0) {
        // Calculate position (centered above the frog)
        const textX = frog.x + frog.width / 2;
        const textY = frog.y - 15; // Position above the frog
        
        // Set style for the power-up text
        ctx.save();
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Create a background for better readability
        const textWidth = ctx.measureText(powerUpText).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(textX - textWidth / 2 - 4, textY - 10, textWidth + 8, 20);
        
        // Draw the text with appropriate color based on power-up type
        if (powerUpText === 'Invincible') {
            ctx.fillStyle = 'cyan';
        } else if (powerUpText === 'Life') {
            ctx.fillStyle = 'pink';
        } else if (powerUpText === 'Score') {
            ctx.fillStyle = 'gold';
        } else {
            ctx.fillStyle = 'white';
        }
        
        ctx.fillText(powerUpText, textX, textY);
        ctx.restore();
        
        // Decrease the timer
        powerUpTextTimer--;
    }
}

// Function to draw countdown text during frog reset
function drawCountdownText() {
    if (frogResetCountdown > 0) {
        // Calculate position (centered above the frog)
        const textX = frog.x + frog.width / 2;
        const textY = frog.y - 15; // Position above the frog
        
        // Calculate the current countdown number (3, 2, 1)
        let countdownValue;
        if (frogResetCountdown > 60) {
            countdownValue = "3";
        } else if (frogResetCountdown > 30) {
            countdownValue = "2";
        } else {
            countdownValue = "1";
        }
        
        // Set style for the countdown text
        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const textWidth = ctx.measureText(countdownValue).width;
        ctx.fillRect(textX - textWidth / 2 - 6, textY - 10, textWidth + 12, 20);
        ctx.fillStyle = '#FF9900'; // Orange color
        ctx.fillText(countdownValue, textX, textY);
        ctx.restore();
    }
}
