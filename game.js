/* ----------------------------------
            Constants
---------------------------------- */

const BOARD_X = 50;
const BOARD_Y = 200;
const GRID_SIZE = 110;
const LINE_SIZE = 15;
const SPEED = 20;
const TEXT_COLOR = "#756E66";
const GRID_COLOR = {
    2: 0xECE4DB,
    4: 0xDCD1BE,
    8: 0xE7B17C,
    16: 0xE79C5D,
    32: 0xE77C5D,
    64: 0xE75D5D,
    128: 0xE7D75D,
    256: 0xE7D75D,
    512: 0xE7D75D,
    1024: 0xE7D75D,
    2048: 0xE7D75D,
}

const BOARD_SIZE = GRID_SIZE * 4 + LINE_SIZE * 5;
const SCREEN_WIDTH = BOARD_X * 2 + BOARD_SIZE;
const SCREEN_HEIGHT = BOARD_Y + BOARD_SIZE + 50;

/* ----------------------------------
            Rendering
---------------------------------- */

PIXI.settings.ROUND_PIXELS = true;
PIXI.settings.RESOLUTION = 2;

var app = new PIXI.Application({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    autoDensity: true,
    backgroundColor: 0xFAF8F0,
    antiAlias: true
});

document.body.appendChild(app.view);

app.stage.sortableChildren = true;

var graphics = new PIXI.Graphics();

// Drawing the game board background
graphics.beginFill(0xBBACA0, 1);
graphics.drawRoundedRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, 10);
graphics.drawRoundedRect(SCREEN_WIDTH * 0.475, 50, 120, 80, 7);
graphics.drawRoundedRect(SCREEN_WIDTH * 0.705, 50, 120, 80, 7);
graphics.endFill();

// Drawing the grids
graphics.beginFill(0xCBC0B5, 1);
for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
        let loc = getGridXY(i, j, false);
        graphics.drawRoundedRect(loc.x, loc.y, GRID_SIZE, GRID_SIZE, 5);
    }
}
graphics.endFill();
app.stage.addChild(graphics);

// Game Title
var gameTitle = new PIXI.Text('2048', new PIXI.TextStyle({
    fill: TEXT_COLOR,
    fontFamily: "Helvetica Neue",
    fontSize: 80,
    fontWeight: 900,
    letterSpacing: 3
}));
gameTitle.anchor.set(0.5);
gameTitle.x = SCREEN_WIDTH * 0.26;
gameTitle.y = 86;
app.stage.addChild(gameTitle);

// Score & Best Labels
var infoLabelStyle = new PIXI.TextStyle({
    fill: "#ece4db",
    fontFamily: "Helvetica Neue",
    fontSize: 16,
    fontWeight: 900
});
var scoreLabel = new PIXI.Text('SCORE', infoLabelStyle);
scoreLabel.anchor.set(0.5);
scoreLabel.x = SCREEN_WIDTH * 0.57;
scoreLabel.y = 70;
app.stage.addChild(scoreLabel);

var infoNumberStyle = new PIXI.TextStyle({
    fill: "#ffffff",
    fontFamily: "Helvetica Neue",
    fontSize: 28,
    fontWeight: 900
});
var scoreText = new PIXI.Text('0', infoNumberStyle);
scoreText.anchor.set(0.5);
scoreText.x = SCREEN_WIDTH * 0.57;
scoreText.y = 100;
scoreText.update = function() {
    this.text = score;
}
app.stage.addChild(scoreText);

var bestScoreLabel = new PIXI.Text('BEST', infoLabelStyle);
bestScoreLabel.anchor.set(0.5);
bestScoreLabel.x = SCREEN_WIDTH * 0.80;
bestScoreLabel.y = 70;
app.stage.addChild(bestScoreLabel);

if (localStorage.getItem('bestScore') == null) {
    localStorage.setItem('bestScore', 0);
}
var bestScoreText = new PIXI.Text(localStorage.getItem('bestScore'), infoNumberStyle);
bestScoreText.anchor.set(0.5);
bestScoreText.x = SCREEN_WIDTH * 0.80;
bestScoreText.y = 100;
bestScoreText.update = function(value) {
    this.text = value;
}
app.stage.addChild(bestScoreText);

// Game over
var loseOverlayGraphics = new PIXI.Graphics();
loseOverlayGraphics.beginFill(0xffffff, 0.8);
loseOverlayGraphics.drawRoundedRect(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE, 10);
loseOverlayGraphics.endFill();
var loseOverlay = new PIXI.Sprite(app.renderer.generateTexture(loseOverlayGraphics));
loseOverlay.anchor.set(0.5);
loseOverlay.zIndex = 999;
loseOverlay.x = BOARD_X + BOARD_SIZE / 2;
loseOverlay.y = BOARD_Y + BOARD_SIZE / 2;

var gameOverStyle = new PIXI.TextStyle({
    fill: TEXT_COLOR,
    fontFamily: "Helvetica Neue",
    fontSize: 48,
    fontWeight: 900
})
var gameOverText = new PIXI.Text('GAME OVER', gameOverStyle);
gameOverText.anchor.set(0.5);
gameOverText.y = -60;
loseOverlay.addChild(gameOverText);

var retryButtonGraphics = new PIXI.Graphics();
retryButtonGraphics.beginFill(0x8C7B68, 1);
retryButtonGraphics.drawRoundedRect(0, 0, 120, 50, 7);
retryButtonGraphics.endFill();
var retryButton = new PIXI.Sprite(app.renderer.generateTexture(retryButtonGraphics));
retryButton.anchor.set(0.5);
retryButton.y = 60;
retryButton.interactive = true;
retryButton.buttonMode = true;

var retryButtonText = new PIXI.Text('Try again', new PIXI.TextStyle({
    fill: "#ffffff",
    fontFamily: "Helvetica Neue",
    fontSize: 20,
    fontWeight: 600
}));
retryButtonText.anchor.set(0.5);
retryButton.addChild(retryButtonText);

retryButton.on('click', function() {
    loseOverlay.visible = false;
    score = 0;
    gameState = 0;
    scoreText.update();
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j ++) {
            if (gameBoard[j][i] != null) {
                app.stage.removeChild(gameBoard[j][i]);
                gameBoard[j][i] = null;
            }
        }
    }
})

loseOverlay.addChild(retryButton);
loseOverlay.visible = false;
app.stage.addChild(loseOverlay);

/* ----------------------------------
            Game Logic
---------------------------------- */

gameBoard = [];
mergingGrids = [];
score = 0;
moving = 0;
gameState = 0; // 0: playing, 1: game over

for (let i = 0; i < 4; i++) {
    gameBoard.push([null, null, null, null]);
}

function DEBUG_PRINT_BOARD() {
    let line = '';
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (gameBoard[i][j] == null) {
                line += '[ ]';
            } else {
                line += `[${gameBoard[i][j].value}]`;
            }
        }
        line += '\n';
    }
    console.log(line);
}

function getGridXY(i, j, centerAnchor = true) {
    let offset = centerAnchor ? GRID_SIZE / 2 : 0;
    return {
        x: BOARD_X + LINE_SIZE + i * (GRID_SIZE + LINE_SIZE) + offset,
        y: BOARD_Y + LINE_SIZE + j * (GRID_SIZE + LINE_SIZE) + offset
    };
}

function getGridTextStyle(value) {
    let baseStyle = new PIXI.TextStyle({
        fill: TEXT_COLOR,
        fontFamily: "Helvetica Neue",
        fontSize: 56,
        fontWeight: "bold",
        letterSpacing: 3
    });
    if (value == 32 || value == 64) {
        baseStyle.fill = "#f9f6f2";
    }
    if (value > 512) {
        baseStyle.fontSize = 40;
        baseStyle.letterSpacing = 2;
    }
    return baseStyle;
}

function generateRandomGrid(side, hidden = false) {
    let possibleGrids = []
    if (side == 'up') {
        possibleGrids = [[0,0], [1,0], [2,0], [3,0]];
    } else if (side == 'down') {
        possibleGrids = [[0,3], [1,3], [2,3], [3,3]];
    } else if (side == 'left') {
        possibleGrids = [[0,0], [0,1], [0,2], [0,3]];
    } else if (side == 'right') {
        possibleGrids = [[3,0], [3,1], [3,2], [3,3]];
    }
    randomGrids = []
    for (let pos of possibleGrids) {
        if (gameBoard[pos[1]][pos[0]] == null) {
            randomGrids.push(pos);
        }
    }
    if (randomGrids.length > 0) {
        let pos = randomGrids[Math.floor(Math.random() * randomGrids.length)];
        createGrid(pos[0], pos[1], (Math.random() < 0.25 ? 4 : 2), hidden);
        return true;
    } else {
        return false;
    }
}

function createGrid(i, j, value, hidden = false) {
    let loc = getGridXY(i, j);

    let gridG = new PIXI.Graphics();
    gridG.beginFill(GRID_COLOR[value], 1);
    gridG.drawRoundedRect(0, 0, GRID_SIZE, GRID_SIZE, 5);
    gridG.endFill();
    let gridT = app.renderer.generateTexture(gridG);

    let text = new PIXI.Text(value, getGridTextStyle(value));
    text.anchor.set(0.5);

    let grid = new PIXI.Sprite(gridT);
    grid.anchor.set(0.5);
    grid.addChild(text);
    grid.x = loc.x;
    grid.y = loc.y;
    grid.value = value;
    if (hidden) {
        grid.visible = false;
    }

    grid.update = function() {
        let gridG = new PIXI.Graphics();
        gridG.beginFill(GRID_COLOR[this.value], 1);
        gridG.drawRoundedRect(0, 0, GRID_SIZE, GRID_SIZE, 5);
        gridG.endFill();
        let gridT = app.renderer.generateTexture(gridG);
        this.texture = gridT;
        this.children[0].text = this.value;
        this.children[0].style = getGridTextStyle(this.value);
    }

    gameBoard[j][i] = grid;
    app.stage.addChild(grid);
}

function noAnyMove() {
    for (let i = 0; i < 3; i++) { // Check right motion
        for (let j = 0; j < 4; j++) {
            if (gameBoard[j][i] != null && (gameBoard[j][i + 1] == null || gameBoard[j][i].value == gameBoard[j][i + 1].value)) {
                return false;
            }
        }
    }
    for (let i = 1; i < 4; i++) { // Check left motion
        for (let j = 0; j < 4; j++) {
            if (gameBoard[j][i] != null && (gameBoard[j][i - 1] == null || gameBoard[j][i].value == gameBoard[j][i - 1].value)) {
                return false;
            }
        }
    }
    for (let i = 0; i < 4; i++) { // Check down motion
        for (let j = 0; j < 3; j++) {
            if (gameBoard[j][i] != null && (gameBoard[j + 1][i] == null || gameBoard[j][i].value == gameBoard[j + 1][i].value)) {
                return false;
            }
        }
    }
    for (let i = 0; i < 4; i++) { // Check up motion
        for (let j = 1; j < 4; j++) {
            if (gameBoard[j][i] != null && (gameBoard[j - 1][i] == null || gameBoard[j][i].value == gameBoard[j - 1][i].value)) {
                return false;
            }
        }
    }
    return true;
}

function moveGrid(i, j, dir, pending = false) {
    let grid = gameBoard[j][i];
    let destI = i;
    let destJ = j;
    if (dir == 'up') {
        while (destJ > 0 && (gameBoard[destJ - 1][destI] == null || gameBoard[destJ - 1][destI].value == grid.value)) {
            destJ--;
        }
    } else if (dir == 'down') {
        while (destJ < 3 && (gameBoard[destJ + 1][destI] == null || gameBoard[destJ + 1][destI].value == grid.value)) {
            destJ++;
        }
    } else if (dir == 'left') {
        while (destI > 0 && (gameBoard[destJ][destI - 1] == null || gameBoard[destJ][destI - 1].value == grid.value)) {
            destI--;
        }
    } else if (dir == 'right') {
        while (destI < 3 && (gameBoard[destJ][destI + 1] == null || gameBoard[destJ][destI + 1].value == grid.value)) {
            destI++;
        }
    }
    if (destI != i || destJ != j) {
        grid.dir = dir;
        if (gameBoard[destJ][destI] != null) { // merging
            grid.destI = destI;
            grid.destJ = destJ;
            mergingGrids.push(grid);
            gameBoard[j][i] = null;
            gameBoard[destJ][destI].value *= 2;
        } else {
            gameBoard[destJ][destI] = grid;
            gameBoard[j][i] = null;
        }
        moving++;
        return true;
    }
    return false;
}

$(document).on('keydown', function(e) {
    if (moving == 0 && gameState == 0) {
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            let moveDir = null;
            let spawnSide = null;
            let is = [];
            let js = [];
            if (e.keyCode == 37) {
                moveDir = 'left';
                spawnSide = 'right';
                is = [0,1,2,3];
                js = [0,1,2,3];
            } else if (e.keyCode == 38) {
                moveDir = 'up';
                spawnSide = 'down';
                is = [0,1,2,3];
                js = [0,1,2,3];
            } else if (e.keyCode == 39) {
                moveDir = 'right';
                spawnSide = 'left';
                is = [3,2,1,0];
                js = [0,1,2,3];
            } else if (e.keyCode == 40) {
                moveDir = 'down';
                spawnSide = 'up';
                is = [0,1,2,3];
                js = [3,2,1,0];
            }
            
            let tryNewGrid = generateRandomGrid(spawnSide);

            // Apply motion to all grids
            let countMoved = 0;
            for (let i of is) {
                for (let j of js) {
                    if (gameBoard[j][i] != null) {
                        if (moveGrid(i, j, moveDir)) {
                            countMoved++;
                        }
                    }
                }
            }
            if (noAnyMove()) { // Lose
                loseOverlay.visible = true;
                gameState = 1;
            }

            if (!tryNewGrid) {
                generateRandomGrid(spawnSide, true); // Generate another grid if the previous generation is unsuccesful due to full side
            }
        }
    }
    
})

app.ticker.add(function() {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let grid = gameBoard[j][i];
            if (grid != null) {
                if (grid.dir != null) {
                    let destPos = getGridXY(i, j);
                    if (grid.dir == 'up') {
                        grid.y -= SPEED;
                    } else if (grid.dir == 'down') {
                        grid.y += SPEED;
                    } else if (grid.dir == 'left') {
                        grid.x -= SPEED;
                    } else if (grid.dir == 'right') {
                        grid.x += SPEED;
                    }
                    // console.log(i, j, grid.x, grid.y, destPos.x, destPos.y);
                    if (Math.floor(grid.x / SPEED) == Math.floor(destPos.x / SPEED) && Math.floor(grid.y / SPEED) == Math.floor(destPos.y / SPEED)) {
                        moving--;
                        grid.x = destPos.x;
                        grid.y = destPos.y;
                        grid.dir = null;
                    }
                }
                if (!grid.visible && moving == 0) {
                    grid.visible = true;
                }
            }
        }
    }
    for (let grid of mergingGrids) {
        let destPos = getGridXY(grid.destI, grid.destJ);
        if (grid.dir == 'up') {
            grid.y -= SPEED;
        } else if (grid.dir == 'down') {
            grid.y += SPEED;
        } else if (grid.dir == 'left') {
            grid.x -= SPEED;
        } else if (grid.dir == 'right') {
            grid.x += SPEED;
        }
        if (Math.floor(grid.x / SPEED) == Math.floor(destPos.x / SPEED) && Math.floor(grid.y / SPEED) == Math.floor(destPos.y / SPEED)) {
            let targetGrid = gameBoard[grid.destJ][grid.destI];
            moving--;
            app.stage.removeChild(grid);
            targetGrid.update();
            score += targetGrid.value;
            scoreText.update();
            if (score > localStorage.getItem('bestScore')) {
                localStorage.setItem('bestScore', score);
                bestScoreText.update(score);
            }
            mergingGrids.splice(mergingGrids.indexOf(grid), 1);
        }
    }
});