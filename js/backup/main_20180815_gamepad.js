
// #region Globals & Constants

let debugLevel = 0;
let maxDebugLevel = 4; // 0=none;1=keys;2=bodies;3=camera;

let keyPressToggleD = true;

let debugText;
let debugTextKeyD = "";//"Keys: Up=n; Down=n; Left=n; Right=n; D=n; Debug=" + (debugLevel>0 ? "y" : "n") + ";";

const DEBUG_TOGGLE_HERO = true;

const GRAVITY = 1200;

// #endregion Globals & Constants

// #region Hero

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

const HERO_DEFAULT_SPRIE_WIDTH = 100;
const HERO_DEFAULT_SPRITE_HEIGHT = 73;
const HERO_DEFAULT_SIZE_WIDTH = 40;
const HERO_DEFAULT_SIZE_HEIGHT = 60;
const HERO_DEFAULT_SIZE_OFFSET_X = 32;
const HERO_DEFAULT_SIZE_OFFSET_Y = 13;

var heroAnimationDimensions = {}; // Note: offsetY needs to be the sprite's default height (ex. 73) - h!
heroAnimationDimensions[ANIMATION_HERO_SLIDING] = { "w": 40, "h": 30, "offsetX": 35, "offsetY": 43.5 };

function Hero(game, x, y) {
    // call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'hero');

    // anchor
    this.anchor.set(0.5, 0.5);

    // physics properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;

    // player settings:
    this.jumpSpeed = 400;
    this.extraJumpsCurrent = 0;
    this.extraJumpsMax = 1;
    this.slidingFramesCurrent = 0;
    this.slidingFramesMax = 32;
    this.canLedgeGrab = true;
    this.canWallJumpL = true;
    this.canWallJumpR = true;
    this.wallJumpPauseDurationLimit = 30;
    this.ledgeGrabProximity = 5;

    // player state:
    this.canSlide = true;
    this.isCrouching = false;
    this.isJumpingSingle = false;
    this.isJumpingExtra = false;
    this.isSliding = false;
    this.isLedgeGrabbing = false;
    this.touchingDownCount = 0;
    this.touchingLeftCount = 0;
    this.touchingRightCount = 0;
    this.isWallJumpPauseR = false;
    this.isWallJumpPauseRDuration = 0;
    this.isWallJumpPauseL = false;
    this.isWallJumpPauseLDuration = 0;
    
    // animations ('name', [frames], fps, looped?)
    this.animations.add(ANIMATION_HERO_IDLE, [0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0], 4, true);
    this.animations.add(ANIMATION_HERO_CROUCH, [4, 4, 4, 4, 4, 5, 6, 7, 4, 4, 4, 4], 4, true);
    this.animations.add(ANIMATION_HERO_RUN, [8, 9, 10, 11, 12, 13], 8, true);
    this.animations.add(ANIMATION_HERO_SLIDING, [24, 25, 26, 27], 8, false); // ToDo: add 28 is initial in-between;
    this.animations.add(ANIMATION_HERO_LEDGE_GRAB, [29, 30, 31, 30], 2, true);
    this.animations.add(ANIMATION_HERO_LEDGE_PULLUP, [33, 34, 35, 36, 37], 8, false);
    this.animations.add(ANIMATION_HERO_SWORD_DRAW, [69, 70, 71, 72, 73], 8, false);
    this.animations.add(ANIMATION_HERO_WALL_JUMP_PAUSE, [79, 80], 4, true);

     // ToDo: loop last few frames of these 2 and split them so they're the initial action then the loop.
    this.animations.add(ANIMATION_HERO_JUMP, [14, 15, 16, 17], 12, false);
    this.animations.add(ANIMATION_HERO_JUMP_EXTRA, [18, 19, 20, 21], 12, true);
    this.animations.add(ANIMATION_HERO_FALL, [17, 22, 23], 8, false);

    this.animations.add('die', [5, 6, 5, 6, 5, 6, 5, 6], 12); // 12fps no loop

    // starting animation
    this.animations.play(ANIMATION_HERO_IDLE);

    this.body.setSize(
        HERO_DEFAULT_SIZE_WIDTH, 
        HERO_DEFAULT_SIZE_HEIGHT,
        HERO_DEFAULT_SIZE_OFFSET_X, 
        HERO_DEFAULT_SIZE_OFFSET_Y
    );
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction) {
    // guard
    if (this.isFrozen) { return; }

    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;

    // To turn the player, flip the image with scaling;
    // flipping (or mirroring) an image is achieved by 
    // applying a negative scale to the image:
    if (this.body.velocity.x < 0) {
        this.scale.x = -1;
    }
    else if (this.body.velocity.x > 0) {
        this.scale.x = 1;
    }
};

Hero.prototype.canExtraJump = function () {
    return (
        this.alive && !this.isFrozen && 
        this.isJumpingSingle && !this.isBoosting &&
        this.extraJumpsCurrent < this.extraJumpsMax
    );
}

Hero.prototype.canSingleJump = function () {
    return (
        this.alive && !this.isFrozen && 
        (
            this.touchingDownCount > 0 || 
            this.isLedgeGrabbing || 
            this.isWallJumpPauseL || 
            this.isWallJumpPauseR
        )
    );
}

Hero.prototype.doJumpSingle = function () {
    this.body.velocity.y = -this.jumpSpeed;
    this.isJumpingSingle = true;
    this.isBoosting = true;
    this.isLedgeGrabbing = false;
    if (this.isWallJumpPauseL) {
        this.canWallJumpL = false;
        this.canWallJumpR = true;
    }
    else if (this.isWallJumpPauseR) {
        this.canWallJumpL = true;
        this.canWallJumpR = false;
    }
    this.isWallJumpPauseL = false;
    this.isWallJumpPauseR = false;
};

Hero.prototype.doJumpExtra = function () {
    this.body.velocity.y = -this.jumpSpeed;
    this.extraJumpsCurrent++;
    this.isJumpingExtra = true;
    this.isJumpingSingle = false;
    this.isBoosting = true;
};

Hero.prototype.continueJumpBoost = function () {
    this.body.velocity.y = -this.jumpSpeed;
    this.isBoosting = true;
}

Hero.prototype.stopJumpBoost = function () {
    this.isBoosting = false;
};

Hero.prototype.bounce = function () {

    // TRY: pass in a bounce factor parameter, where different
    // enemies have different amounts of bounce to them, from 
    // zero to a lot (squishy blob has zero, mushroom has a lot).
    const BOUNCE_SPEED = 200;

    this.body.velocity.y = -BOUNCE_SPEED;
};

Hero.prototype.update = function () {
    // update sprite animation, if it needs changing
    let animationName = this._getAnimationName();
    if (this.animations.name !== animationName) {
        this.animations.play(animationName);
        if (animationName in heroAnimationDimensions) {
            this.body.setSize(
                heroAnimationDimensions[animationName].w, 
                heroAnimationDimensions[animationName].h,
                heroAnimationDimensions[animationName].offsetX + 0.0, 
                heroAnimationDimensions[animationName].offsetY + 0.0);
        }
        else {
            this.body.setSize(
                HERO_DEFAULT_SIZE_WIDTH, 
                HERO_DEFAULT_SIZE_HEIGHT,
                HERO_DEFAULT_SIZE_OFFSET_X, 
                HERO_DEFAULT_SIZE_OFFSET_Y
            );
        }
    }
};

Hero.prototype.resetCollisionStates = function () {    
    this.touchingDownCount = 0;
}

Hero.prototype.freeze = function () {
    this.body.enable = false;
    this.isFrozen = true;
};

Hero.prototype.die = function () {
    this.alive = false;
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};

// returns the animation name that should be playing depending on
// current circumstances
Hero.prototype._getAnimationName = function () {
    let name = ANIMATION_HERO_IDLE; // default animation

    let deltaX = this.body.position.x - this.body.prev.x;

    // dying
    if (!this.alive) {
        name = 'die';
    }
    // frozen & not dying
    else if (this.isFrozen) {
        name = ANIMATION_HERO_IDLE;
        this.extraJumpsCurrent = 0;
    }
    else if (this.isLedgeGrabbing) {
        name = ANIMATION_HERO_LEDGE_GRAB;
    }
    else if (this.isWallJumpPauseL || this.isWallJumpPauseR) {
        name = ANIMATION_HERO_WALL_JUMP_PAUSE;
    }
    // falling
    else if (this.body.velocity.y >= 0 && this.touchingDownCount == 0) {
        name = ANIMATION_HERO_FALL;
        //if (debugLevel===1) PlayState.game.debug.body(this);
    }
    // jumping
    else if (this.isJumpingSingle) {
        name = ANIMATION_HERO_JUMP;
        //if (debugLevel===1) PlayState.game.debug.body(this);
    }
    else if (this.isJumpingExtra) {
        name = ANIMATION_HERO_JUMP_EXTRA;
    }
    else if (deltaX != 0 && this.touchingDownCount > 0 && !this.isSliding) {
        name = ANIMATION_HERO_RUN;
    }
    else if (this.isCrouching) {
        name = ANIMATION_HERO_CROUCH;
    }
    else if (this.isSliding) {
        name = ANIMATION_HERO_SLIDING;
    }

    return name;
};

// #endregion Hero

// #region Enemies

var enemySpeeds = { };
enemySpeeds["spider"] = 100;

function Spider(game, x, y) {
    this.enemyType = "spider";

    Phaser.Sprite.call(this, game, x, y, this.enemyType);

    // anchor
    this.anchor.set(0.5);
    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true);
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl');

    // physic properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;

    this.body.velocity.x = enemySpeeds[this.enemyType];

}

// inherit from Phaser.Sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

function EnemyMovementSentry() {
    // check against walls and reverse direction if necessary
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -enemySpeeds[this.enemyType]; // turn left
    }
    else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = enemySpeeds[this.enemyType]; // turn right
    }
};

Spider.prototype.update = EnemyMovementSentry;

Spider.prototype.die = function () {
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};

// #endregion Enemies

// #region Loading State

LoadingState = {};

LoadingState.init = function () {
    // keep crispy-looking pixels
    this.game.renderer.renderSession.roundPixels = true;
};

// Game State 2: Preload (load game assets here):
LoadingState.preload = function () {
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');
    this.game.load.json('level:2', 'data/level02.json');

    this.game.load.image('controlsUp', 'images/controls/flatDark/flatDark02.png');
    this.game.load.image('controlsDown', 'images/controls/flatDark/flatDark09.png');
    this.game.load.image('controlsLeft', 'images/controls/flatDark/flatDark04.png');
    this.game.load.image('controlsRight', 'images/controls/flatDark/flatDark05.png');

    this.game.load.image('font:numbers', 'images/numbers.png');

    this.game.load.image('icon:coin', 'images/coin_icon.png');
    this.game.load.image('background', 'images/background.png');
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');

    this.game.load.spritesheet('landscape', 'images/landscape_tileset_32.png', 32, 32, (1408/32)*(384/32)); //, (1408/32)*(384/32)

    this.game.load.image('key', 'images/key.png');

    this.game.load.spritesheet('decoration', 'images/decor.png', 42, 42);
    this.game.load.spritesheet('hero', 'images/bowen/bowen_adventurer_transparent.png', HERO_DEFAULT_SPRIE_WIDTH, HERO_DEFAULT_SPRITE_HEIGHT, 95);
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    this.game.load.spritesheet('door', 'images/door.png', 42, 66);
    this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);

    this.game.load.audio('sfx:jump', 'audio/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');
    this.game.load.audio('sfx:key', 'audio/key.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
    this.game.load.audio('sfx:door', 'audio/door.wav');
    this.game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg']);
};

LoadingState.create = function () {
    this.game.state.start('play', true, false, {level: 2});
};

// #endregion Loading State

// #region Play State

PlayState = {};

// Restart the game once we reach this many levels:
// TRY: Get this from JSON files.
const LEVEL_COUNT = 2;

var button;

// Game State 1: Init
PlayState.init = function (data) {
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
    this.level = (data.level <= LEVEL_COUNT) ? data.level : 0;
};

var keyUpDurationDown;

function controlsUpButtonPress () {
    buttonUp.alpha = controlsAlphaDown;
    this.keys.up.isDown = true;
    keyUpDurationDown = new Date();
}
function controlsUpButtonRelease () {
    buttonUp.alpha = controlsAlpha;
    keyUpDurationDown = null;
    this.keys.up.isDown = false;
}

function controlsDownButtonPress () {
    buttonDown.alpha = controlsAlphaDown;
    this.keys.down.isDown = true;
}
function controlsDownButtonRelease () {
    buttonDown.alpha = controlsAlpha;
    this.keys.down.isDown = false;
}

function controlsLeftButtonPress () {
    buttonLeft.alpha = controlsAlphaDown;
    this.keys.left.isDown = true;
}
function controlsLeftButtonRelease () {
    buttonLeft.alpha = controlsAlpha;
    this.keys.left.isDown = false;
}

function controlsRightButtonPress () {
    buttonRight.alpha = controlsAlphaDown;
    this.keys.right.isDown = true;
}
function controlsRightButtonRelease () {
    buttonRight.alpha = controlsAlpha;
    this.keys.right.isDown = false;
}

// Game State 3: Create (create game entities and set up world here):
PlayState.create = function () {
    // fade in (from black)
    this.game.camera.flash('#000000');

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

    // create level entities and decoration
    let bg = this.game.add.image(0, 0, 'background');
    bg.fixedToCamera = true;
    
    this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));

    // create UI score boards
    this._createHud();

    debugText = this.game.add.text(32*6, 32*0.5, debugTextKeyD, 
        { font: "18px Courier New", fill: "#000000", align: "center" });
};

function padLeft(number, width, padInput) {
    let padChar = (padInput === null) ? ' ' : padInput;
    width -= number.toString().length;
    return (width > 0) ? 
        new Array(width + (/\./.test(number) ? 2 : 1)).join(padChar) + number : 
        number + ""; // always return a string
}

// Game State 4: Update
PlayState.update = function () {
    debugText.text = debugTextKeyD;
    
    this._handleCollisions();

    if (this.hero.isLedgeGrabbing || this.hero.isWallJumpPauseL || this.hero.isWallJumpPauseR) {
        this.hero.body.velocity.y = 0;
        this.hero.body.allowGravity = false;
        if (this.hero.isWallJumpPauseL) {
            this.hero.isWallJumpPauseLDuration++;
        }
        if (this.hero.isWallJumpPauseR) {
            this.hero.isWallJumpPauseRDuration++;
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
    else if (debugLevel == 3) {
        this.game.debug.cameraInfo(this.game.camera, 32*2, 32*2);
    }
    else if (debugLevel == 4) {
        this.game.debug.inputInfo(32*2, 32*2);
        this.game.debug.spriteInputInfo(buttonUp, 32*2, 32*5);
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
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.collide(this.hero, this.platforms);
    
    // Reset hero's collision-based state:
    this.hero.resetCollisionStates();

    this.landscapeBounds.forEach(function (land) {
        this.game.physics.arcade.collide(this.hero, land
            , this._onHeroCollisionWithLand, null, null
        );
    }, this);
    
    // ToDo: move this to landscape-specific event handler function.
    if (this.hero.touchingDownCount > 0) {
        this.hero.isJumpingSingle = false;
        this.hero.isJumpingExtra = false;
        this.hero.extraJumpsCurrent = 0;
        this.hero.canWallJumpL = true;
        this.hero.canWallJumpR = true;
    }
    else if (debugLevel === 1) {
        this.game.debug.reset();
    }

    // if (this.hero.touchingRightCount == 0) {
    //     this.hero.isWallJumpPauseR = false;
    // }
    // if (this.hero.touchingLeftCount == 0) {
    //     this.hero.isWallJumpPauseL = false;
    // }

    // hero vs coins (pick up)
    this.game.physics.arcade.overlap(this.hero, this.coins, this._onHeroVsCoin,
        null, this);
    // hero vs key (pick up)
    this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey,
        null, this);
    // hero vs door (end level)
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
        // ignore if there is no key or the player is on air
        // TRY: Add an "Enter" button requirement.
        //   Must be standing to insert/turn key. Maybe doors with keys require
        //   standing and an "Enter", but something like a portal would not 
        //   and you could just fall into that (so the only req is `hasKey`).
        function (hero, door) {
            return this.hasKey && hero.touchingDownCount > 0;
        }, this);
    // collision: hero vs enemies (kill or die)
    this.game.physics.arcade.overlap(this.hero, this.spiders,
        this._onHeroVsEnemy, null, this);
};

PlayState._handleInput = function () {
    let xDir = 0;

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
        this.hero.canSlide = true;
    }

    if (!this.hero.isSliding) {
        this.hero.slidingFramesCurrent = 0;
    }
};

var abs=Math.abs;

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

                // ToDo: do for Left and Right based on what way we're "facing".
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

PlayState._onHeroVsDoor = function (hero, door) {
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
            level: this.level + 1
        });
    }, this);
};

PlayState._loadLevel = function (data) {
    // Create all the groups/layers that we need (in order, for layering):
    
    this.bgDecoration = this.game.add.group();
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    
    this.landscape = this.game.add.group();
    this.landscapeBounds = this.game.add.group();
        
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    this.game.world.setBounds(0, 0, data.world.w, data.world.h);

    // spawn hero and enemies
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});

    // spawn level decoration
    data.decoration.forEach(function (deco) {
        this.bgDecoration.add(
            this.game.add.image(deco.x, deco.y, 'decoration', deco.frame));
        }
    , this);
    
    // spawn level decoration
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

    // spawn platforms
    data.platforms.forEach(this._spawnPlatform, this);

    // spawn important objects
    data.coins.forEach(this._spawnCoin, this);
    this._spawnKey(data.key.x, data.key.y);
    this._spawnDoor(data.door.x, data.door.y);

    // enable gravity
    this.game.physics.arcade.gravity.y = GRAVITY;

    this.game.camera.follow(this.hero);
};

PlayState._spawnCharacters = function (data) {
    // spawn spiders
    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);

    // spawn hero
    let initialHeroX = (data.hero.x32 >= 0 ? data.hero.x32 * 32 : data.hero.x);
    let initialHeroY = (data.hero.y32 >= 0 ? data.hero.y32 * 32 : data.hero.y);
    this.hero = new Hero(this.game, initialHeroX, initialHeroY);
    this.game.add.existing(this.hero);
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

PlayState._spawnDoor = function (x, y) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);
    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
};

var buttonUp;
var buttonDown;
var buttonLeft;
var buttonRight;

const controlsAlpha = 0.5;
const controlsAlphaDown = 0.8;

PlayState._createHud = function () {
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR, 6);

    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);

    let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
        coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    const controlsX = 10;
    const controlsAlpha = 0.5;
    const controlWidthUD = 62;
    const controlHeightUD = 76;
    const controlWidthLR = 76;
    const controlHeightLR = 62;
    const screenPad = 20;
    const controlsPad = 9;
    
    buttonUp = this.game.add.button(
        controlsX + controlWidthLR - controlWidthLR/2 + controlsPad, 
        gameHeight - screenPad - controlHeightUD*2, 
        'controlsUp', null, this, 0, 0, 0
    );
    buttonUp.alpha = controlsAlpha;
    buttonUp.onInputDown.add(controlsUpButtonPress, this);
    buttonUp.onInputUp.add(controlsUpButtonRelease, this);

    buttonDown = this.game.add.button(
        buttonUp.x, 
        buttonUp.y + controlHeightUD + 2, 
        'controlsDown', null, this, 0, 0, 0
    );
    buttonDown.alpha = controlsAlpha;
    buttonDown.onInputDown.add(controlsDownButtonPress, this);
    buttonDown.onInputUp.add(controlsDownButtonRelease, this);
        
    buttonLeft = this.game.add.button(
        controlsX, 
        buttonUp.y + controlHeightUD/2 + controlsPad, 
        'controlsLeft', null, this, 0, 0, 0
    );
    buttonLeft.alpha = controlsAlpha;
    buttonLeft.onInputDown.add(controlsLeftButtonPress, this);
    buttonLeft.onInputUp.add(controlsLeftButtonRelease, this);

    buttonRight = this.game.add.button(
        buttonLeft.x + controlWidthLR + 2, 
        buttonLeft.y, 
        'controlsRight', null, this, 0, 0, 0
    );
    buttonRight.alpha = controlsAlpha;
    buttonRight.onInputDown.add(controlsRightButtonPress, this);
    buttonRight.onInputUp.add(controlsRightButtonRelease, this);
    
    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.add(buttonUp);
    this.hud.add(buttonDown);
    this.hud.add(buttonLeft);
    this.hud.add(buttonRight);
    this.hud.add(this.keyIcon);
    
    this.hud.fixedToCamera = true;
    this.hud.cameraOffset.setTo(8, 8);
};

// #endregion Play State

let sourceMobile = false;
let gameWidth = (window.innerWidth > 41) ? window.innerWidth - 40 : 500;
let gameHeight = (window.innerHeight > 41) ? window.innerHeight - 40 : 700;

window.onload = function () {
    if (sourceMobile) {
        gameWidth = 640;
        gameHeight = 1136;
    }
    let game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, 'game');
    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');

    // ToDO: Mobile:
    //if (!game.device.desktop){ game.input.onDown.add(gofull, this); } //go fullscreen on mobile devices
    
};
