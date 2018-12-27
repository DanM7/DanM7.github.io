// #region Imports & Classes

import Hero2 from '../js/sidescroller/Hero2.js';

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
let sourceMobile = false;
let gameWidth = (isMobileiOs) ? screen.width : window.innerWidth - 40; // window.visualViewport.width or window.innerWidth?
let gameHeight = (isMobileiOs) ? screen.height : window.innerHeight - 40;
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

var buttonUp;
var buttonDown;
var buttonLeft;
var buttonRight;
//var controlsDPadCircle;
var touchButtonA;
var touchButtonB;

var buttonUpX = controlsX + controlWidthLR - controlWidthLR/2 + controlsPad;
var buttonUpY = gameHeight - screenPad - controlHeightUD*2 - controlsPad;

var dPadGlobalX = 80 + 16;
var dPadGlobY = buttonUpY + 80 + 4;
var dPadGlobalR = 80; // 80 = 160/2 where 160 is the sprite's w.
var dPadGlobalCenterX = dPadGlobalX + dPadGlobalR;
var dPadGlobalCenterY = dPadGlobY + dPadGlobalR;
let dpadCircleArea = new Phaser.Circle(
    dPadGlobalX, 
    dPadGlobY, 
    dPadGlobalR*2
);

var lastLoop = new Date();

// Restart the game once we reach this many levels:
// TRY: Get this from JSON files.
var LEVEL_COUNT = 999;

var abs=Math.abs;

Math.getAngle = function(x1, y1, x2, y2) {
	var	dx = x1 - x2,
        dy = y1 - y2;
    let atan2Degrees = Math.atan2(dy, dx) * -180 / Math.PI;
	return (atan2Degrees < 0) ? 360 + atan2Degrees : atan2Degrees;
};

function shadeColor2(color, percent) {   
    var f = parseInt(color, 16),
        t=percent<0?0:255,
        p=percent<0?percent*-1:percent,
        R=f>>16,
        G=f>>8&0x00FF,
        B=f&0x0000FF;
    let newR = 0x010000 * (Math.round((t-R)*p)+R);
    let newG = 0x000100 * (Math.round((t-G)*p)+G);
    let newB = 0x000001 * (Math.round((t-B)*p)+B);
    return (
        0x1000000 + 
        (Math.round((t-R)*p)+R)*0x10000 + 
        (Math.round((t-G)*p)+G)*0x100 + 
        (Math.round((t-B)*p)+B)
    );
    //return (newR + newG + newB);
}

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

function getFps(thisLoop, lastLoop) {
    return (1000 / (thisLoop - lastLoop))|0;
}

// #endregion Globals & Constants

// #region Hero Animations

// ToDo ES6: load this from JSON. This should be game-specific data, not hardcoded.

const ANIMATION_HERO_IDLE = 'animationHeroIdle';
const ANIMATION_HERO_SLIDING = 'animationHeroSliding';
const ANIMATION_HERO_CROUCH = 'animationHeroCrouch';
const ANIMATION_HERO_RUN = 'animationHeroRun';
const ANIMATION_HERO_JUMP = 'animationHeroJump';
const ANIMATION_HERO_JUMP_EXTRA = 'animationHeroJumpExtra';
const ANIMATION_HERO_WALL_JUMP_PAUSE = 'animationHeroWallJumpPause';
const ANIMATION_HERO_FALL = "animationHeroFall"
const ANIMATION_HERO_LEDGE_GRAB = 'animationHeroLedgeGrab';
const ANIMATION_HERO_LEDGE_PULLUP = 'animationHeroLedgePullup';
const ANIMATION_HERO_SWORD_DRAW = 'animationHeroSwordDraw';
const ANIMATION_HERO_SWORD_ATTACK_BASIC = 'animationHeroSwordAttackBasic';

// animations ('name', [frames], fps, looped?)
let heroAnimations = [
    new animationData(ANIMATION_HERO_IDLE, [0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0], 4, true),
    new animationData(ANIMATION_HERO_CROUCH, [4, 4, 4, 4, 4, 5, 6, 7, 4, 4, 4, 4], 4, true),
    new animationData(ANIMATION_HERO_RUN, [8, 9, 10, 11, 12, 13], 8, true),
    new animationData(ANIMATION_HERO_SLIDING, [24, 25, 26, 27], 8, false), // ToDo: add 28 is initial in-between;
    new animationData(ANIMATION_HERO_LEDGE_GRAB, [29, 30, 31, 30], 2, true),
    new animationData(ANIMATION_HERO_LEDGE_PULLUP, [33, 34, 35, 36, 37], 8, false),
    new animationData(ANIMATION_HERO_SWORD_DRAW, [69, 70, 71, 72, 73], 8, false),
    new animationData(ANIMATION_HERO_WALL_JUMP_PAUSE, [79, 80], 4, true),
    new animationData(ANIMATION_HERO_JUMP, [14, 15, 16, 17], 12, false),// ToDo: loop last few frames of these 2 and split them so they're the initial action then the loop.
    new animationData(ANIMATION_HERO_JUMP_EXTRA, [18, 19, 20, 21], 12, true),
    new animationData(ANIMATION_HERO_FALL, [17, 22, 23], 8, false),
    new animationData('die', [5, 6, 5, 6, 5, 6, 5, 6], 12)
];

// #endregion Hero Animations

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
    this.game.load.image('controlsLeft', 'images/controls/flatDark/flatDark04.png');
    this.game.load.image('controlsRight', 'images/controls/flatDark/flatDark05.png');
    this.game.load.image('controlsPadCircle', 'images/controls/flatDark/flatDark06.png');
    this.game.load.image('controlsDPad', 'images/controls/flatDark/flatDark03.png');
    this.game.load.image('touchButtonA', 'images/controls/flatDark/flatDark35.png');
    this.game.load.image('touchButtonB', 'images/controls/flatDark/flatDark36.png');
    this.game.load.image('controlsFullScreen', 'images/controls/flatDark/flatDark29.png');
    this.game.load.image('controlsFullScreenExit', 'images/controls/flatDark/flatDark34.png');
    this.game.load.image('controlsSettings', 'images/controls/flatDark/flatDark30.png');

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

    alert("preload!");
};

LoadingState.create = function () {
    this.game.state.start('play', true, false, {level: 3});
};

// #endregion Loading State

//#region Play State

let PlayState = {};

// Game State 1: Init
PlayState.init = function (data) {
    // ToDo: make this configurable. The player should be able to choose which keys map to which actions.
    // Translate keyboard keys to input:
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP,
        down: Phaser.KeyCode.DOWN,
        D: Phaser.KeyCode.D,
        B: Phaser.KeyCode.B
    });

    this.coinPickupCount = 0;
    this.hasKey = false;

    this.hasCheese = false;

    this.level = (data.level <= LEVEL_COUNT) ? data.level : 0;
};

var keyUpDurationDown = null;

function touchButtonAPress (thisButton) {
    thisButton.alpha = controlsAlphaDown;
    PlayState.keys.up.isDown = true;
    keyUpDurationDown = new Date();
}
function touchButtonARelease (thisButton) {
    thisButton.alpha = controlsAlpha;
    PlayState.keys.up.isDown = false;
    keyUpDurationDown = null;
}

function unpauseGame(event){
    /*
    // Only act if paused
    if(PlayState.game.paused){
        // Calculate the corners of the menu
        var x1 = w/2 - 270/2, x2 = w/2 + 270/2,
            y1 = h/2 - 180/2, y2 = h/2 + 180/2;

        // Check if the click was inside the menu
        if(event.x > x1 && event.x < x2 && event.y > y1 && event.y < y2 ){
            // The choicemap is an array that will help us see which item was clicked
            var choisemap = ['one', 'two', 'three', 'four', 'five', 'six'];

            // Get menu local coordinates for the click
            var x = event.x - x1,
                y = event.y - y1;

            // Calculate the choice 
            var choise = Math.floor(x / 90) + 3*Math.floor(y / 90);

            // Display the choice
            choiseLabel.text = 'You chose menu item: ' + choisemap[choise];
        }
        else{
            // Remove the menu and the label
            menu.destroy();
            choiseLabel.destroy();

            // Unpause the game
            PlayState.game.paused = false;
        }
    }
    */
    PlayState.game.paused = false;
    
    //touchButtonA.alpha = controlsAlpha;
};

function touchButtonSettingsPress (thisButton) {
    //thisButton.alpha = controlsAlphaDown;
    //controlsSettings

    PlayState.game.paused = true;

    // Hide the existing A button and draw a temp one:
    touchButtonA.alpha = 0;
    
    let touchButtonACustom = this.game.add.sprite(
        gameWidth - (60 + 60*buttonScale), // x + 2y = 180; x + 1y = 120;     x + 2y = x + 1y + 60
        gameHeight - (60 + 60*buttonScale),
        'touchButtonA'
    );
    touchButtonACustom.scale.setTo(buttonScale, buttonScale);
    //touchButtonACustom.events.onInputDown.add(touchButtonAPress, this);
    //touchButtonACustom.events.onInputUp.add(touchButtonARelease, this);


    // Then add the menu
    //menu = game.add.sprite(w/2, h/2, 'menu');
    //menu.anchor.setTo(0.5, 0.5);

    // And a label to illustrate which menu item was chosen. (This is not necessary)
    //choiseLabel = game.add.text(w/2, h-150, 'Click outside menu to continue', { font: '30px Arial', fill: '#fff' });
    //choiseLabel.anchor.setTo(0.5, 0.5);
}

function touchButtonUpPress (thisButton) {
    thisButton.alpha = controlsAlphaDown;
    PlayState.keys.up.isDown = true;
}
function touchButtonUpRelease (thisButton) {
    thisButton.alpha = controlsAlpha;
    PlayState.keys.up.isDown = false;
}

function touchButtonDownPress (thisButton) {
    thisButton.alpha = controlsAlphaDown;
    PlayState.keys.down.isDown = true;
}
function touchButtonDownRelease (thisButton) {
    thisButton.alpha = controlsAlpha;
    PlayState.keys.down.isDown = false;
}

function touchButtonLeftPress (thisButton) {
    thisButton.alpha = controlsAlphaDown;
    PlayState.keys.left.isDown = true;
}
function touchButtonLeftRelease (thisButton) {
    thisButton.alpha = controlsAlpha;
    PlayState.keys.left.isDown = false;
}

function touchButtonRightPress (thisButton) {
    thisButton.alpha = controlsAlphaDown;
    PlayState.keys.right.isDown = true;
}
function touchButtonRightRelease (thisButton) {
    thisButton.alpha = controlsAlpha;
    PlayState.keys.right.isDown = false;
}

function touchButtonFullScreenPressF (thisButton) {
    try
    {
        // Maintain aspect ratio
        //PlayState.game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;

        if (PlayState.game.scale.isFullScreen) {
            PlayState.game.scale.stopFullScreen();
            touchButtonFullScreen.loadTexture('controlsFullScreen');
        } 
        else {
            // Set anti-alias to false to maintain pixel art:
            let antiAlias = false;
            let allowTrampoline = false;
            let fullScreenAtempt = 
                PlayState.game.scale.startFullScreen(antiAlias, allowTrampoline);
            touchButtonFullScreen.loadTexture('controlsFullScreenExit');
            if (!fullScreenAtempt) {
                alert("Failed to initiate fullscreen!");
            }
        }
    }
    catch (ex)
    {
        alert(ex);
    }
}

function touchButtonFullScreenPress (thisButton) {
    try
    {
        var doc = window.document;
        var docEl = doc.documentElement;
        docEl = document.getElementById('game');
        if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            let requestFullScreen = 
                docEl.requestFullscreen || 
                docEl.mozRequestFullScreen || 
                docEl.webkitRequestFullScreen || 
                docEl.msRequestFullscreen;
            if (typeof requestFullScreen === 'undefined') {
                alert("FullScreen request is undefined!");
            }
            else {
                requestFullScreen.call(docEl);
                touchButtonFullScreen.loadTexture('controlsFullScreenExit');
            }
        }
        else {
            let cancelFullScreen = 
                doc.exitFullscreen || 
                doc.mozCancelFullScreen || 
                doc.webkitExitFullscreen || 
                doc.msExitFullscreen;
            cancelFullScreen.call(doc);
            touchButtonFullScreen.loadTexture('controlsFullScreen');
        }
    }
    catch (ex) {
        alert("FullScreen error: " + ex);
    }
}

// Game State 3: Create (create game entities and set up world here):
PlayState.create = function () {
    // fade in (from black)
    this.game.camera.flash('#000000');

    this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;

    // create sound entities
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        key: this.game.add.audio('sfx:key'),
        stomp: this.game.add.audio('sfx:stomp'),
        door: this.game.add.audio('sfx:door')
    };
    this.bgm = this.game.add.audio('bgm');
    this.bgm.loopFull();

    // Create level entities and decoration:
    // let bg = this.game.add.image(0, 0, 'background');
    // bg.fixedToCamera = true;
    addBackgroundToGame(this.game, 'background');

    // ToDo: something other than the json load needs to determine if
    // the level is an actual level or a maze. For that matter, there needs
    // to be some initial json load that says what json should be loaded next. 
    // if (this.game.data.maze) {
    //     this._loadLevel(this.game.cache.getJSON(`maze:${this.level}`));
    // }
    // else {
    //     this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));
    // }
    this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));

    this.game.input.onDown.add(unpauseGame, self);

    // create UI score boards
    this._createHud();
};

// Game State 4: Update
PlayState.update = function () {
    var thisLoop = new Date();
    let fps = getFps(thisLoop, lastLoop);
    lastLoop = thisLoop;

    debugLabel1.text = debugText1;
    debugLabel2.text = debugTextKeyD;
    debugLabelFps.text = (fps < 40) ? "FPS: " + fps : "";

    this._handleCollisions();

    if (this.hero.isLedgeGrabbing || this.hero.isWallJumpPauseL || this.hero.isWallJumpPauseR) {
        this.hero.body.velocity.y = 0;
        this.hero.body.allowGravity = false;
        if (this.hero.isWallJumpPauseL) {
            this.hero.isWallJumpPauseLDuration++;
            this.hero.wallJumpPauseLHeight = this.hero.y;
        }
        if (this.hero.isWallJumpPauseR) {
            this.hero.isWallJumpPauseRDuration++;
            this.hero.wallJumpPauseRHeight = this.hero.y;
        }
    }
    else {
        this.hero.body.allowGravity = true;
        this.hero.isWallJumpPauseLDuration = 0;
        this.hero.isWallJumpPauseRDuration = 0;
    }

    this._handleInput();

    if (debugLevel === 0) {
        this.game.debug.reset();
    }
    else if (debugLevel === 1) {
        //this.game.debug.reset();
    }
    else if (debugLevel === 2) {
        this.game.debug.bodyInfo(this.hero, 32*2, 32*2);
    }
    else if (debugLevel === 3) {
        this.game.debug.cameraInfo(this.game.camera, 32*2, 32*2);
    }
    else if (debugLevel === 4) {
        this.game.debug.inputInfo(32*2, 32*2);
        //this.game.debug.spriteInputInfo(controlsDPadCircle, 32*2, 32*5);
        this.game.debug.pointer(this.game.input.activePointer);
    }

    // update scoreboards
    this.coinFont.text = "x" + padLeft(this.coinPickupCount, 2, '0');
    
    this.keyIcon.frame = this.hasKey ? 1 : 0;
};

PlayState.shutdown = function () {
    this.bgm.stop();
};

// Handle collisions and overlaps;
//   Collision:    Keep 2 non-reactive bodies separate;
//   Overlap:      Handle with corresponding events;
PlayState._handleCollisions = function () {
    // Legacy:
    //this.game.physics.arcade.collide(this.spiders, this.platforms);
    //this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    //this.game.physics.arcade.collide(this.hero, this.platforms);
    
    // Reset hero's collision-based state:
    this.hero.resetCollisionStates();

    this.landscapeBounds.forEach(function (land) {
        this.game.physics.arcade.collide(this.hero, land
            , this._onHeroCollisionWithLand, null, null
        );
    }, this);
    
    // Is the hero standing or in the air?
    // ToDo: move this to landscape-specific event handler function.
    if (this.hero.touchingDownCount > 0) {
        // Standing:
        this.hero.isJumpingSingle = false;
        this.hero.isJumpingExtra = false;
        this.hero.extraJumpsCurrent = 0;
        this.hero.canWallJumpL = true;
        this.hero.canWallJumpR = true;
    }
    else {
        if (debugLevel === 1) {
            this.game.debug.reset();
        }

        //isWallJumpPauseLHeight, now wallJumpPauseLHeight
        if (this.hero.y > this.hero.wallJumpPauseLHeight + 128) {
            this.hero.canWallJumpL = true;
        }
        if (this.hero.y > this.hero.wallJumpPauseRHeight + 128) {
            this.hero.canWallJumpR = true;
        }
    }

    // hero vs coins (pick up)
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin, null, this);

    // hero vs key (pick up)
    this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey, null, this);

    // hero vs door (end level)
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
        // ignore if there is no key or the player is on air
        // TRY: Add an "Enter" button requirement.
        //   Must be standing to insert/turn key. Maybe doors with keys require
        //   standing and an "Enter", but something like a portal would not 
        //   and you could just fall into that (so the only req is `hasKey`).
        function (hero, door) {
            return this.hasKey && hero.touchingDownCount > 0;
        }, this
    );

    this.itemsFood.forEach(function (food) {
        this.game.physics.arcade.collide(this.hero, food
            , this._onHeroCollisionWithFood, null, null
        );
    }, this);

    // collision: hero vs enemies (kill or die)
    this.game.physics.arcade.overlap(this.hero, this.spiders,
        this._onHeroVsEnemy, null, this);
};

PlayState._handleTouchDPadInput = function (possiblePointer) {
    let p1X = possiblePointer.x;
    let p1Y = possiblePointer.y;

    //circumferencePoint could be useful?

    let dPadDegrees = 0;
    let dA = (dpadCircleArea.x - p1X);
    let dB = (dpadCircleArea.y - p1Y);
    let hyp = Math.sqrt((dA * dA) + (dB * dB));
    if (dpadCircleArea.contains(p1X, p1Y) && hyp > 30) {
        dPadDegrees = Math.floor(
            Math.getAngle(
                p1X,
                p1Y,
                dPadGlobalX,
                dPadGlobY
            )
        );

        /*
                    90
            135     45
        180              0
            225     315
                270            
        */

        let dpadU = false;
        let dpadD = false;
        let dpadL = false;
        let dpadR = false;

        if (0 <= dPadDegrees && dPadDegrees < 22.5) {
            dpadR = true;
        }
        else if (22.5 <= dPadDegrees && dPadDegrees < 45) {
            dpadR = true;
            dpadU = true;
        }
        else if (45 <= dPadDegrees && dPadDegrees < 67.5) {
            dpadR = true;
            dpadU = true;
        }
        else if (67.5 <= dPadDegrees && dPadDegrees < 90) {
            dpadU = true;
        }
        else if (90 <= dPadDegrees && dPadDegrees < 112.5) {
            dpadU = true;
        }
        else if (112.5 <= dPadDegrees && dPadDegrees < 135) {
            dpadU = true;
            dpadL = true;
        }
        else if (135 <= dPadDegrees && dPadDegrees < 157.5) {
            dpadU = true;
            dpadL = true;
        }
        else if (157.5 <= dPadDegrees && dPadDegrees < 180) {
            dpadL = true;
        }
        else if (180 <= dPadDegrees && dPadDegrees < 202.5) {
            dpadL = true;
        }
        else if (202.5 <= dPadDegrees && dPadDegrees < 225) {
            dpadL = true;
            dpadD = true;
        }
        else if (225 <= dPadDegrees && dPadDegrees < 247.5) {
            dpadL = true;
            dpadD = true;
        }
        else if (247.5 <= dPadDegrees && dPadDegrees < 270) {
            dpadD = true;
        }
        else if (270 <= dPadDegrees && dPadDegrees < 292.5) {
            dpadD = true;
        }
        else if (292.5 <= dPadDegrees && dPadDegrees < 315) {
            dpadD = true;
            dpadR = true;
        }
        else if (315 <= dPadDegrees && dPadDegrees < 337.5) {
            dpadD = true;
            dpadR = true;
        }
        else if (337.5 <= dPadDegrees && dPadDegrees < 360) {
            dpadR = true;
        }

        // if (dpadU) {
        //     PlayState.keys.up.isDown = true;
        //     if (keyUpDurationDown === null) {
        //         keyUpDurationDown = new Date();
        //     }
        // }
        
        if (dpadD) {
            PlayState.keys.down.isDown = true;
            // if (!dpadU && keyUpDurationDown != null) {
            //     keyUpDurationDown = null;
            // }
        }
        
        if (dpadL) {
            PlayState.keys.left.isDown = true;
            // if (!dpadU && keyUpDurationDown != null) {
            //     keyUpDurationDown = null;
            // }
        }

        if (dpadR) {
            PlayState.keys.right.isDown = true;
            // if (!dpadU && keyUpDurationDown != null) {
            //     keyUpDurationDown = null;
            // }
        }
    }

    //debugText1 = dPadDegrees;    
};

PlayState._handleInput = function () {
    let xDir = 0;

    // PlayState.keys.up.isDown = false;
    // PlayState.keys.down.isDown = false;
    // PlayState.keys.left.isDown = false;
    // PlayState.keys.right.isDown = false;

    // if (this.game.input.pointer1.isDown) {
    //     PlayState._handleTouchDPadInput(this.game.input.pointer1);
    // }
    // if (this.game.input.pointer2.isDown) {
    //     PlayState._handleTouchDPadInput(this.game.input.pointer2);
    // }
    
    let heroCanMove = !this.hero.isLedgeGrabbing && !this.hero.isWallJumpPauseL && !this.hero.isWallJumpPauseR;
    if (this.keys.right.isDown) {
        if (this.hero.isWallJumpPauseR && this.hero.isWallJumpPauseRDuration > this.hero.wallJumpPauseDurationLimit) {
            this.hero.isWallJumpPauseR = false;
            this.hero.scale.x *= -1;
            this.hero.canWallJumpL = false;
            this.hero.canWallJumpR = false;
        }
        else if (heroCanMove && !this.hero.body.touching.right) {
            xDir += 1;        
        }
    }
    else {
        if (this.hero.isWallJumpPauseR) {
            this.hero.isWallJumpPauseR = false;
            this.hero.scale.x *= -1;
            this.hero.canWallJumpL = false;
            this.hero.canWallJumpR = false;
        }
    }
    if (this.keys.left.isDown) {
        if (this.hero.isWallJumpPauseL && this.hero.isWallJumpPauseLDuration > this.hero.wallJumpPauseDurationLimit) {
            this.hero.isWallJumpPauseL = false;
            this.hero.scale.x *= -1;
            this.hero.canWallJumpL = false;
            this.hero.canWallJumpR = false;
        }
        else if (heroCanMove && !this.hero.body.touching.left) {
            xDir -= 1;
        }
    }
    else {
        if (this.hero.isWallJumpPauseL) {
            this.hero.isWallJumpPauseL = false;
            this.hero.scale.x *= -1;
            this.hero.canWallJumpL = false;
            this.hero.canWallJumpR = false;
        }
    }
    if (!this.keys.left.isDown && !this.keys.right.isDown) { // stop
        xDir = 0;
    }
    this.hero.move(xDir);
    
    if (this.keys.D.isDown) {
        if (keyPressToggleD) {
            keyPressToggleD = false;
            
            if (debugLevel === maxDebugLevel) {
                debugLevel = 0;
                debugTextKeyD = "";//debugTextKeyD.replace(" Debug=y;", " Debug=n;");
            }
            else {
                debugLevel++;
                debugTextKeyD = "Keys: Up=n; Down=n; Left=n; Right=n; D=n; Debug=" + (debugLevel>0 ? "y" : "n") + ";"
                debugTextKeyD = debugTextKeyD.replace(" Debug=n;", " Debug=y;");
            }
            debugTextKeyD = debugTextKeyD.replace(" D=n;", " D=y;");
        }
    }
    else {
        debugTextKeyD = debugTextKeyD.replace(" D=y;", " D=n;");
        keyPressToggleD = true;
    }

    // handle jump
    const JUMP_HOLD = 200; // ms
    if (
        (keyUpDurationDown && (new Date() - keyUpDurationDown) < JUMP_HOLD) || 
        (this.keys.up.downDuration(JUMP_HOLD))
    ) {
        if (this.hero.canSingleJump()) {
            this.hero.isLedgeGrabbing = false;
            this.hero.doJumpSingle();
            this.sfx.jump.play();
        }
        else if (this.hero.canExtraJump()) {
            this.hero.doJumpExtra();
            this.sfx.jump.play();
        }
        if (this.hero.isBoosting) {
            this.hero.continueJumpBoost();
        }
    }
    else {
        this.hero.stopJumpBoost();
    }

    this.hero.isCrouching = false;
    this.hero.isSliding = false;
    if (this.keys.down.isDown) {
        this.hero.isLedgeGrabbing = false;
        if (this.hero.touchingDownCount > 0) {
            if (this.hero.body.velocity.x === 0) {
                this.hero.isCrouching = true;
            }
            else if (this.hero.canSlide && this.hero.slidingFramesCurrent < this.hero.slidingFramesMax) {
                this.hero.isSliding = true;
                this.hero.slidingFramesCurrent++;
            }
            else {
                this.hero.canSlide = false;
            }
        }
    }
    else {
        // ToDo: disable the ability to slide for now.
        // Sliding should happen if the user presses the down key
        // after either just releasing left/right or sliding 
        // (not releasing their left thumb) from L/R to down.
        //this.hero.canSlide = true;
    }

    if (!this.hero.isSliding) {
        this.hero.slidingFramesCurrent = 0;
    }
};

PlayState._onHeroCollisionWithFood = function (hero, food) {
    this.sfx.key.play(); // ToDo: get a "chomp" chewing sound;
    food.kill();
    // ToDo: increment health;
    //   Does each food item have its own health increment value?
};

PlayState._onHeroCollisionWithLand = function (hero, land) {
    // ToDo: add properties for land to be wall-jumpable or ledge-grabbable!
    // boundary walls (like in a room) could then be made up of tiles that are not
    // ledge-grabbable, and that prevents false-positives of edge-grabbing the middle of 
    // a wall on a certain tile.
    // It could also make this function return quicker.
    let touchingUp = (hero.body.touching.up),
        touchingDown = false,
        touchingLeft = (hero.body.touching.left || hero.body.x == land.x + land.width),
        touchingRight = (hero.body.touching.right || (hero.body.x + hero.body.width == land.x));

    if (touchingLeft) {
        hero.touchingLeftCount++;
    }
    else if (touchingRight) {
        hero.touchingRightCount++;
    }

    if (hero.body.touching.down === true) {
        if ((hero.body.x + hero.body.width) === land.x) {
            touchingDown = false;
        }
        else if (hero.body.x === (land.x + land.width)) {
            touchingDown = false;
        }
        else {
            hero.touchingDownCount++;
            touchingDown = true;

            if (debugLevel === 1) {
                PlayState.game.debug.body(land);
            }
        }
    }

    if (hero.touchingDownCount > 0) {
        touchingDown = true;
    }

    let heroCanLedgeGrab = hero.canLedgeGrab === true && land.grab === true;
    
    let heroCanWallJump = 
        (hero.canWallJumpL && hero.scale.x === -1) || 
        (hero.canWallJumpR && hero.scale.x === 1);
    
    // If there's been a mid-air collision with a verticle wall, check if 
    // we should ledge grab or do a wall-pause so we can do a wall jump.
    let midAirCollision = !touchingUp && !touchingDown && (touchingRight || touchingLeft);
    if (midAirCollision) {
        if (abs(hero.body.y - land.y) < hero.ledgeGrabProximity)  {
            if (heroCanLedgeGrab) {
                // Ledge-Grab:
                hero.body.velocity.y = 0;
                hero.isLedgeGrabbing = true;
                hero.extraJumpsCurrent = 0;
                hero.touchingDownCount = 0;
                hero.body.y = land.y;
            }
        }
        else if ((hero.body.y - land.y) > hero.ledgeGrabProximity)  {
            if (land.wallJump && heroCanWallJump) {
                // Wall-Jump:
                hero.body.velocity.y = 0;
                hero.extraJumpsCurrent = 0;
                hero.touchingDownCount = 0;

                // ToDo: 2018-12-17 also set current wall jump height.
                if (hero.scale.x === 1) {
                    hero.isWallJumpPauseR = true;
                }
                else if (hero.scale.x === -1) {
                    hero.isWallJumpPauseL = true;
                }
            }
        }
    }
};

PlayState._onHeroVsKey = function (hero, key) {
    this.sfx.key.play();
    key.kill();
    this.hasKey = true;
};

PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    this.coinPickupCount++;
};

PlayState._onHeroInsideLandscape = function (hero, landBox) {

    // Get the midpoint coordinates:
    var midXBox = landBox.x + (landBox.width / 2);
    var midYBox = landBox.y + (landBox.height / 2);
    var midXPlayer = hero.x + (hero.width / 2);
    var midYPlayer = hero.y + (hero.height / 2);
    var midXVP = hero.x + (landBox.width / 2);
    var midYVP = hero.y + (landBox.height / 2);

    // Get the vectors to check against:
    var vXBoxPlayer = (midXPlayer - midXBox);
    var vYBoxPlayer = (midYPlayer - midYBox);
    var vXBoxVP = (midXVP - midXBox);
    var vYBoxVP = (midYVP - midYBox);

    // Add the half widths and half heights of the objects
    var hWidths = (hero.width / 2) + (landBox.width / 2);
    var hHeights = (hero.height / 2) + (landBox.height / 2);

    // If the x and y vector are less than the half width or half height,
    // they we must be inside the object, causing a collision
    //if (Math.abs(vX) <= hWidths && Math.abs(vY) <= hHeights) {
    if (abs(vXBoxPlayer) <= hWidths && abs(vYBoxPlayer) <= hHeights) {
        var oX = hWidths - abs(vXBoxPlayer),
            oY = hHeights - abs(vYBoxPlayer);
        if (oX > oY && hero.body.velocity.y != 0) {
            if (vYBoxPlayer > 0) {
                //playerSidesColliding += "t";
                hero.body.y += oY;
            } else {
                //playerSidesColliding += "b";
                hero.body.y -= oY;
            }
        }
        if (oX < oY && hero.body.velocity.x != 0) {
            if (vXBoxPlayer > 0) {
                //playerSidesColliding += "l";
                hero.body.x += oX;
            } else {
                //playerSidesColliding += "r";
                hero.body.x -= oX;
            }
        }
        if (oX == oY) {
            //parseFloat("123.456").toFixed(2);
            let diffY = ((hero.body.y + hero.body.height) - landBox.y);
            hero.body.y -= diffY + 200;
        }
    }
};

PlayState._onHeroVsEnemy = function (hero, enemy) {
    // the hero can kill enemies when is falling (after a jump, or a fall)
    if (hero.body.velocity.y > 0) {
        enemy.die();
        hero.bounce();
        this.sfx.stomp.play();
    }
    else { // game over -> play dying animation and restart the game
        hero.die();
        this.sfx.stomp.play();
        hero.events.onKilled.addOnce(function () {
            this.game.state.restart(true, false, {level: this.level});
        }, this);

        // NOTE: bug in phaser in which it modifies 'touching' when
        // checking for overlaps. This undoes that change so spiders don't
        // 'bounce' agains the hero
        enemy.body.touching = enemy.body.wasTouching;
    }
};

// By default, we go to the next level.
var nextLevelIncrement = 1;

PlayState._onHeroVsDoor = function (hero, door) {
    nextLevelIncrement = (typeof door.nextLevelIncrement !== 'undefined') ? door.nextLevelIncrement : 1;

    // 'open' the door by changing its graphic and playing a sfx
    door.frame = 1;
    this.sfx.door.play();

    // play 'enter door' animation and change to the next level when it ends
    hero.freeze();
    this.game.add.tween(hero)
        .to({x: this.door.x, alpha: 0}, 500, null, true)
        .onComplete.addOnce(this._goToNextLevel, this);
};

PlayState._goToNextLevel = function () {
    this.camera.fade('#000000');
    this.camera.onFadeComplete.addOnce(function () {
        // change to next level
        // TRY: get the "+ 1" as a param from the door.
        //   Ex: Secret exits could take you two levels ahead and would be "+ 2".
        this.game.state.restart(true, false, {
            level: this.level + nextLevelIncrement
        });
    }, this);
};

function LightenDarkenColor(col,amt) {
    var num = parseInt(col,16);
    var r = (num >> 16) + amt;
    var b = ((num >> 8) & 0x00FF) + amt;
    var g = (num & 0x0000FF) + amt;
    var newColor = g | (b << 8) | (r << 16);
    return parseInt(newColor.toString(16), 16);
}

PlayState._setMazeDataFromJson = function (data) {
    let pathWidth = (data.maze.pathWidth) ? data.maze.pathWidth : 128; // Width of the maze path;
    let width = (data.maze.width) ? data.maze.width : 3; // Game width;
    let height = (data.maze.height) ? data.maze.height : 2; // Game height;
    let wall = pathWidth; // Width of the walls between paths;    
    let boundW = (pathWidth * width * 2) + (pathWidth * 3);
    let boundH = (pathWidth * height * 2) + (pathWidth * 3);
    this.game.world.setBounds(0, 0, boundW, boundH);
    
    var graphics = this.game.add.graphics(0, 0);

    // set a fill and line style
    let randomColor = Math.random() * 0xffffff;
    let randomColorShade = LightenDarkenColor(randomColor, 20);
    graphics.beginFill(randomColor);

    let includeBorder = true;
    let mapBounds = MAZE.buildMap(width, height, includeBorder);
    let boundingBoxes = MAZE.buildBoundingBoxes(mapBounds, wall);
    boundingBoxes.forEach(function (bbox) {
        var landItemBound = this.game.add.sprite(bbox.x, bbox.y);
        landItemBound.width = bbox.w;
        landItemBound.height = bbox.h;
        this.game.physics.enable(landItemBound);
        landItemBound.body.allowGravity = false;
        landItemBound.body.immovable = true;

        // ToDo: determine these dynamically:
        landItemBound.grab = false;
        landItemBound.wallJump = true;
        
        //landItemBound.tint = Math.random() * 0xffffff;
        //this.game.debug.body(landItemBound);
        graphics.lineStyle(4, randomColorShade, 1);
        graphics.drawRect(bbox.x, bbox.y, bbox.w, bbox.h);

        this.landscapeBounds.add(landItemBound);
    }, this);

    //this.itemsFood = this.game.add.group();
    this["itemsFood"] = this.game.add.group();
    // data.itemsFood.forEach(function (food) {
    //     this.itemsFood.add(
    //         this.game.add.image(food.x, food.y, 'food', food.frame)
    //     );
    // }, this);

    //#region Door
    let initialDoorX = 0;
    let initialDoorY = 0;
    let mapPosDoorX = 0;
    let mapPosDoorY = 0;
    let nodesWithWallUnderneath = null;

    if (
        (data.door.pos && data.door.pos === "fixed") ||
        (data.door.x || data.door.y || data.door.x32 || data.door.y32)
    ) {
        initialDoorX = data.door.x;
        initialDoorY = data.door.y;
    }
    else if (data.door.pos && data.door.pos === "random") {
        nodesWithWallUnderneath = MAZE.getNodesWithWallUnderneath(mapBounds);

        // The space 1 below (move 0 x spaces, move down 1 y space) needs to be a wall:
        let requireBorderUnderneath = [ { "x": 0, "y": 1, "spaceValue": MAZE.MAP_SPACE_WALL } ];
        let freeSpace = MAZE.getRandomSpaceByValue(mapBounds, MAZE.MAP_SPACE_FREE, requireBorderUnderneath);
        mapPosDoorX = freeSpace.columnIndex;
        mapPosDoorY = freeSpace.rowIndex;
        initialDoorX = mapPosDoorX*pathWidth + (pathWidth/2);
        initialDoorY = mapPosDoorY*pathWidth + (pathWidth);
    }
    
    this._spawnDoor(initialDoorX, initialDoorY, data.door);
    //#endregion Door
    
    //#region Key
    let initialKeyX = 0;
    let initialKeyY = 0;
    let mapPosKeyX = 0;
    let mapPosKeyY = 0;
    if (
        (data.key.pos && data.key.pos === "fixed") ||
        (data.key.x || data.key.y || data.key.x32 || data.key.y32)
    ) {
        initialKeyX = data.key.x;
        initialKeyY = data.key.y;
    }
    else if (data.key.pos && data.key.pos === "random") {
        let freeSpace = MAZE.getRandomSpaceByValue(mapBounds, 0);
        initialKeyX = freeSpace.columnIndex*pathWidth + (pathWidth/2);
        initialKeyY = freeSpace.rowIndex*pathWidth + (pathWidth/2);
    }
    else if (data.key.pos && data.key.pos === "farthest") {
        let aStarResult = MAZE.getFarthestFreeSpace(
            mapBounds, 
            new GridNode(mapPosDoorX, mapPosDoorY, MAZE.MAP_SPACE_FREE)
        );
        // The astar lib off of github swaps the x and y on the nodes;
        // this corrects that by assigning x to the key's y and y to the key's x:
        mapPosKeyX = aStarResult.y;
        mapPosKeyY = aStarResult.x;
        
        initialKeyX = mapPosKeyX*pathWidth + (pathWidth/2);
        initialKeyY = mapPosKeyY*pathWidth + (pathWidth/2);
    }
    this._spawnKey(initialKeyX, initialKeyY);
    //#endregion Key
    
    //#region Hero
    let initialHeroX = 0;
    let initialHeroY = 0;
    if (
        (data.hero.pos && data.hero.pos === "fixed") ||
        (data.hero.x || data.hero.y || data.hero.x32 || data.hero.y32)
    ) {
        initialHeroX = (data.hero.x32 >= 0 ? data.hero.x32 * 32 : data.hero.x);
        initialHeroY = (data.hero.y32 >= 0 ? data.hero.y32 * 32 : data.hero.y);
    }
    else if (data.hero.pos && data.hero.pos === "random") {
        let requireBorderUnderneath = [ { "x": 0, "y": 1, "spaceValue": MAZE.MAP_SPACE_WALL } ];
        let freeSpace = MAZE.getRandomSpaceByValue(mapBounds, MAZE.MAP_SPACE_FREE, requireBorderUnderneath);
        initialHeroX = freeSpace.columnIndex*pathWidth + (pathWidth/2);
        initialHeroY = freeSpace.rowIndex*pathWidth + (pathWidth/4);
    }
    else if (data.hero.pos && data.hero.pos === "farthest") {
        if (nodesWithWallUnderneath === null) {
            nodesWithWallUnderneath = MAZE.getNodesWithWallUnderneath(mapBounds);
        }
        let heroNode = MAZE.getFarthestFreeSpaceTriangle(
            mapBounds,
            new GridNode(mapPosDoorX, mapPosDoorY, MAZE.MAP_SPACE_FREE),
            new GridNode(mapPosKeyX, mapPosKeyY, MAZE.MAP_SPACE_FREE),
            nodesWithWallUnderneath
        );
        initialHeroX = heroNode.y*pathWidth + (pathWidth/2);
        initialHeroY = heroNode.x*pathWidth + (pathWidth/4);
    }

    // Hero (classic):
    //this.hero = new Hero2(this.game, initialHeroX, initialHeroY);
    //this.game.add.existing(this.hero);
    // Hero (ES6):
    let hero2 = new Hero2(this.game, initialHeroX, initialHeroY, 'hero');
    hero2.addAnimations(heroAnimations);
    this.hero = hero2
    this.game.add.existing(this.hero);

    //#endregion Hero
    
};

PlayState._setLevelDataFromJson = function (data) {
    let boundW = (data.world.w < gameWidth) ? gameWidth : data.world.w;
    let boundH = (data.world.h < gameHeight) ? gameHeight : data.world.h;
    this.game.world.setBounds(0, 0, boundW, boundH);

    // spawn level landscape:
    data.landscape.forEach(function (land) {
        var rXTotal = (land.repeatX || 0);
        var rYTotal = (land.repeatY || 0);
        var landX = (land.x32>=0) ? land.x32*32 : land.x;
        var landY = (land.y32>=0) ? land.y32*32 : land.y;
        var landWidth = (land.w32>=0) ? land.w32*32 : 32;
        var landHeight = (land.h32>=0) ? land.h32*32 : 32;

        var landItemBound = this.game.add.sprite(landX, landY);
        landItemBound.width = landWidth + 32*rXTotal;
        landItemBound.height = landHeight + 32*rYTotal;
        this.game.physics.enable(landItemBound);
        landItemBound.body.allowGravity = false;
        landItemBound.body.immovable = true;

        // custom properties:
        landItemBound.grab = (land.grab) ? true : false;
        landItemBound.wallJump = (land.wallJump) ? true : false;

        // custom collisions:
        landItemBound.body.checkCollision.up = land.cU;
        landItemBound.body.checkCollision.down = land.cD;
        landItemBound.body.checkCollision.left = land.cL;
        landItemBound.body.checkCollision.right = land.cR;

        this.landscapeBounds.add(landItemBound);

        for (var rX = 0; rX <= rXTotal; rX++) {
            for (var rY = 0; rY <= rYTotal; rY++) {
                let landFrame = 
                    (land.framesX) ? land.framesX[rX] : 
                    (land.framesY) ? land.framesY[rY] :
                    land.frame;
                this.landscape.add(
                    this.game.add.image(landX + (rX*landWidth), landY + (rY*landHeight), 'landscape', landFrame)
                );
            }
        }

    }, this);

    this._spawnKey(data.key.x, data.key.y);
    this._spawnDoor(data.door.x, data.door.y);

    // spawn hero
    let initialHeroX = (data.hero.x32 >= 0 ? data.hero.x32 * 32 : data.hero.x);
    let initialHeroY = (data.hero.y32 >= 0 ? data.hero.y32 * 32 : data.hero.y);
    this.hero = new Hero2(this.game, initialHeroX, initialHeroY);
    this.game.add.existing(this.hero);
};

PlayState._loadLevel = function (data) {

    // Create all the groups/layers that we need (in order, for layering):    
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();    
    this.landscape = this.game.add.group();
    this.landscapeBounds = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    this.bgDecoration = this.game.add.group();

    // enable gravity, from either input JSON or constant:
    this.game.physics.arcade.gravity.y = data.gravity || 1200;
    
    if (data.maze) {
        this._setMazeDataFromJson(data);
    }
    else {
        // spawn platforms
        data.platforms.forEach(this._spawnPlatform, this);

        // spawn level decoration
        data.decoration.forEach(function (deco) {
            this.bgDecoration.add(
                this.game.add.image(deco.x, deco.y, 'decoration', deco.frame)
            );
        }, this);

        this._setLevelDataFromJson(data);
    }
    
    // spawn hero and enemies
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});

    // spawn important objects
    if (data.coins) {
        data.coins.forEach(this._spawnCoin, this);
    }

    this.game.camera.follow(this.hero);
};

PlayState._spawnCharacters = function (data) {
    // spawn spiders
    if (data.spiders) {
        data.spiders.forEach(function (spider) {
            let sprite = new Spider(this.game, spider.x, spider.y);
            this.spiders.add(sprite);
        }, this);
    }
};

PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(
        platform.x, platform.y, platform.image);

    // physics for platform sprites
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    
    // TRY: Remove this for some select platforms in the future, 
    // where they sink when you stand on them.
    sprite.body.immovable = true;

    // spawn invisible walls at each side, only detectable by enemies
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    // anchor and y displacement
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);
    // physic properties
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};

PlayState._spawnCoin = function (coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);

    // physics (so we can detect overlap with the hero)
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;

    // animations
    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looped
    sprite.animations.play('rotate');
};

PlayState._spawnKey = function (x, y) {
    this.key = this.bgDecoration.create(x, y, 'key');
    this.key.anchor.set(0.5, 0.5);
    // enable physics to detect collisions, so the hero can pick the key up
    this.game.physics.enable(this.key);
    this.key.body.allowGravity = false;

    // add a small 'up & down' animation via a tween
    this.key.y -= 3;
    this.game.add.tween(this.key)
        .to({y: this.key.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};

PlayState._spawnDoor = function (x, y, doorData) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);
    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
    if (typeof doorData !== 'undefined') {
        if (typeof doorData.nextLevelIncrement !== 'undefined') {
            this.door.nextLevelIncrement = doorData.nextLevelIncrement;
        }
    }
};

PlayState._createHud = function () {

    this.hud = this.game.add.group();

    let directionButtonsSpacingX = 20;
    let buttonScale = 2;

    //#region Upper Left
    
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR, 6);

    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);

    let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
        coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);
    
    //#endregion Upper Left

    //#region Bottom Left
    
    let buttonUp = this.game.add.sprite(
        buttonUpX + directionButtonsSpacingX, 
        buttonUpY + 1
        //, 'controlsUp'
    );

    let buttonDown = this.game.add.sprite(
        buttonUpX + 1 + directionButtonsSpacingX, 
        buttonUpY + controlHeightUD + 2
        //,'controlsDown'
    );
    buttonDown.scale.setTo(1.5, 1.5);
    buttonDown.events.onInputDown.add(touchButtonDownPress, this);
    buttonDown.events.onInputUp.add(touchButtonDownRelease, this);

    let buttonLeft = this.game.add.sprite(
        controlsX + 4, 
        buttonUpY + controlHeightUD/2 + controlsPad - 1, 
        'controlsLeft'
    );
    buttonLeft.scale.setTo(1.5, 1.5);
    buttonLeft.events.onInputDown.add(touchButtonLeftPress, this);
    buttonLeft.events.onInputUp.add(touchButtonLeftRelease, this);

    let buttonRight = this.game.add.sprite(
        buttonLeft.x + controlWidthLR - 1 + 2*directionButtonsSpacingX, // -3 or -1
        buttonLeft.y, 
        'controlsRight'
    );
    buttonRight.scale.setTo(1.5, 1.5);
    buttonRight.events.onInputDown.add(touchButtonRightPress, this);
    buttonRight.events.onInputUp.add(touchButtonRightRelease, this);

    //#endregion Bottom Left
    
    //#region Bottom Right

    let touchButtonA = this.game.add.sprite(
        gameWidth - (60 + 60*buttonScale), // x + 2y = 180; x + 1y = 120;     x + 2y = x + 1y + 60
        gameHeight - (60 + 60*buttonScale),
        'touchButtonA'
    );
    touchButtonA.scale.setTo(buttonScale, buttonScale);
    touchButtonA.events.onInputDown.add(touchButtonAPress, this);
    touchButtonA.events.onInputUp.add(touchButtonARelease, this);

    //#endregion Bottom Right
    
    //#region Top Right
    
    let touchButtonFullScreen = this.game.add.sprite(
        gameWidth - 170,
        10,
        'controlsFullScreen'
    );
    touchButtonFullScreen.events.onInputUp.add(touchButtonFullScreenPress, this);
    //touchButtonFullScreen.events.onInputOver.add(touchButtonFullScreenPress, this);

    let touchButtonSettings = this.game.add.sprite(
        gameWidth - 70,
        10,
        'controlsSettings'
    );
    touchButtonSettings.events.onInputDown.add(touchButtonSettingsPress, this);

    //#endregion Top Right
    
    let controlButtons = [
        touchButtonA,
        //touchButtonFullScreen,
        touchButtonSettings,
        buttonUp,
        buttonDown, 
        buttonLeft,
        buttonRight
    ];
    controlButtons.forEach(function(controlButton) {
        controlButton.inputEnabled = true;
        controlButton.alpha = controlsAlpha;
        PlayState.hud.add(controlButton);
    });

    // debugText1 = 
    //     "Game: (" + gameWidth + "," + gameHeight + "); " + 
    //     "DPad: (" + buttonUpX + "," + buttonUpY + ")";

    debugLabel1 = this.game.add.text(32*6, 32*0.2, debugText1, 
        { font: "18px Courier New", fill: "#000000", align: "center" });
    debugLabel2 = this.game.add.text(32*6, 32*0.8, debugTextKeyD, 
        { font: "18px Courier New", fill: "#000000", align: "center" });
    debugLabelFps = this.game.add.text(32*1, 32*1.5, debugTextFps, 
        { font: "18px Courier New", fill: "#000000", align: "center" });

    this.hud.add(debugLabel1);
    this.hud.add(debugLabel2);
    this.hud.add(debugLabelFps);

    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.add(this.keyIcon);

    this.hud.fixedToCamera = true;
    this.hud.cameraOffset.setTo(8, 8);
};

//#endregion Play State

window.onload = function () {
    alert("onload start");
    // if (sourceMobile) {
    //     gameWidth = 1136;
    //     gameHeight = 640;
    // }
    let game = new Phaser.Game(
        gameWidth, 
        gameHeight, 
        Phaser.AUTO, 
        'game'
    );
    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');

    alert("onload done");
    // ToDO: Mobile:
    //if (!game.device.desktop) { 
        //game.input.onDown.add(gofull, this); 
    //} //go fullscreen on mobile devices
    
};
