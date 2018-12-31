// #region Imports & Classes

class animationData {
    constructor(name, frames, fps, looped) {
        this.name = name;
        this.frames = frames;
        this.fps = fps;
        this.looped = looped;
    }
}

// #endregion Imports & Classes

// #region Globals & Constants

let debugLevel = 0;
let maxDebugLevel = 4; // 0=none;1=keys;2=bodies;3=camera;4=touch;

const controlsAlpha = 0.5;
const controlsAlphaDown = 0.8;
const controlsX = 10;
//const controlsAlphaCardinal = 0.5;
const controlWidthUD = 62;
const controlHeightUD = 76;
const controlWidthLR = 76;
const controlHeightLR = 62;
const screenPad = 20;
const controlsPad = 10;

let isMobileiOs = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
let isMobile = isMobileiOs;
let gameWidth = (isMobileiOs) ? screen.width*2 : window.innerWidth - 40; // window.visualViewport.width or window.innerWidth?
let gameHeight = (isMobileiOs) ? screen.height*2 : window.innerHeight - 40;
if (Math.abs(window.orientation) == 90) {
    let tempDim = gameWidth;
    gameWidth = gameHeight;
    gameHeight = tempDim;
}

let keyPressToggleD = true;

let debugLabel1;
let debugText1 = "";

let debugLabel2;
let debugTextKeyD = "";//"Keys: Up=n; Down=n; Left=n; Right=n; D=n; Debug=" + (debugLevel>0 ? "y" : "n") + ";";

let debugLabelFps;
let debugTextFps;

var buttonUpX = controlsX + controlWidthLR - controlWidthLR/2 + controlsPad;
var buttonUpY = gameHeight - screenPad - controlHeightUD*2 - controlsPad;

// By default, we go to the next level.
var nextLevelIncrement = 1;

var abs=Math.abs;

function addBackgroundToGame(currentGame, backgroundImageName) {
    let img = currentGame.cache.getImage(backgroundImageName);
    let bg = currentGame.add.image(
        currentGame.world.centerX - img.width/2,
        currentGame.world.centerY - img.height/2,//(currentGame.world.height/-2) + backgroundImageName.height*2, 
        backgroundImageName
    );
    bg.fixedToCamera = true;
}

function padLeft(number, width, padInput) {
    let padChar = (padInput === null) ? ' ' : padInput;
    width -= number.toString().length;
    return (width > 0) ? 
        new Array(width + (/\./.test(number) ? 2 : 1)).join(padChar) + number : 
        number + ""; // always return a string
}

// #endregion Globals & Constants

// #region Loading State

let LoadingState = {};

LoadingState.init = function () {
    // keep crispy-looking pixels
    this.game.renderer.renderSession.roundPixels = true;
};

// Game State 2: Preload (load game assets here):
LoadingState.preload = function () {
    // Level data:
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');
    this.game.load.json('level:2', 'data/level02.json');
    this.game.load.json('level:3', 'data/maze002.json');

    // Controls:
    this.game.load.image('controlsUp', 'images/controls/flatDark/flatDark02.png');
    this.game.load.image('controlsDown', 'images/controls/flatDark/flatDark09.png');
    this.game.load.image('controlsLeft', 'images/controls/flatDark/flatDark23.png');
    this.game.load.image('controlsRight', 'images/controls/flatDark/flatDark24.png');
    this.game.load.image('controlsPadCircle', 'images/controls/flatDark/flatDark06.png');
    this.game.load.image('controlsDPad', 'images/controls/flatDark/flatDark03.png');
    this.game.load.image('touchButtonA', 'images/controls/flatDark/flatDark35.png');
    this.game.load.image('touchButtonB', 'images/controls/flatDark/flatDark36.png');
    this.game.load.image('controlsFullScreen', 'images/controls/flatDark/flatDark29.png');
    this.game.load.image('controlsFullScreenExit', 'images/controls/flatDark/flatDark34.png');
    this.game.load.image('controlsSettings', 'images/controls/flatDark/flatDark13.png');

    // Fonts:
    this.game.load.image('font:numbers', 'images/numbers.png');

    // Items:
    //this.game.load.spritesheet('items001', 'images/items/items001.png', 48, 48, 16, 16)
    this.game.load.image('icon:coin', 'images/coin_icon.png');
    //this.game.load.image('background', 'images/background.png');
    this.game.load.image('background', 'images/backgrounds/lava_temple.png');
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');

    this.game.load.spritesheet('landscape', 'images/landscape_tileset_32.png', 32, 32, (1408/32)*(384/32)); //, (1408/32)*(384/32)

    this.game.load.image('key', 'images/key.png');

    const HERO_DEFAULT_SPRIE_WIDTH = 100;
    const HERO_DEFAULT_SPRITE_HEIGHT = 73;
    this.game.load.spritesheet('hero', 'images/bowen/bowen_adventurer_transparent.png', HERO_DEFAULT_SPRIE_WIDTH, HERO_DEFAULT_SPRITE_HEIGHT, 95);
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    this.game.load.spritesheet('door', 'images/door.png', 42, 66);
    this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);
    this.game.load.spritesheet('decoration', 'images/decor.png', 42, 42);

    this.game.load.audio('sfx:jump', 'audio/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');
    this.game.load.audio('sfx:key', 'audio/key.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
    this.game.load.audio('sfx:door', 'audio/door.wav');
    this.game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg']);
};

LoadingState.create = function () {
    this.game.state.start('play', true, false, {level: 3});
};

// #endregion Loading State

window.onload = function () {
    let game = new Phaser.Game(
        gameWidth, 
        gameHeight, 
        Phaser.AUTO, 
        'game'
    );
    let _playState = new PlayState(this.game, isMobile);
    game.state.add('play', _playState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
};
