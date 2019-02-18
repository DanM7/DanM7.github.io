
class EnemySentry extends Phaser.Sprite {
    constructor(game, x, y, spriteSheet, sheetFrame) {
        super(game, x, y, spriteSheet, sheetFrame);
        
        this.anchor.set(0.5, 0.5);

        // ToDo: for now, skip physics properties.
        // It's simpler and way less calculations to keep the enemy walking on 
        // the plane it was spawned on, and only check for collisions with the 
        // enemy wall sprites, rather than enabling gravity and having to check 
        // for collisions with each bounding box. 
        //this.game.physics.enable(this);
        //this.body.collideWorldBounds = true;
    }

    addAnimations(badGuyJson) {
        // ToDo: register this from playstate from JSON, not hardcoded.
        this.animations.add('idle', [0], 1, false); // 6fps, looped
        this.animations.add('walk', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 8, true); // 6fps, looped
    }

    playAnimation(animationName) {
        this.animations.play(animationName);
    }

    attackPlayer() {

    }
}