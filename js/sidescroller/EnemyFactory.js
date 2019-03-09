class EnemyFactory {
    constructor(game) {
        this.game = game;
    }
    createEnemySprite(badGuyJson, x, y) {
        let enemySprite = {};
        switch (badGuyJson.enemyType.toString().toUpperCase())
        {
            case "SENTRY":
                enemySprite = new EnemySentry(this.game, x, y, badGuyJson.initialSpritesheet);
                this.game.physics.enable(enemySprite);
                enemySprite.body.collideWorldBounds = true;
                enemySprite.body.allowGravity = false;
                enemySprite.attackRange = badGuyJson.attackRange;
                enemySprite.spriteSheetWalk = badGuyJson.spriteSheetWalk;
                enemySprite.spriteSheetAttack = badGuyJson.spriteSheetAttack;
                enemySprite.initialAnimation = badGuyJson.initialAnimation;
                break;
        }
        enemySprite.aiViewX = (typeof badGuyJson.aiViewX !== 'undefined') ? badGuyJson.aiViewX : 0;
        enemySprite.aiViewY = (typeof badGuyJson.aiViewY !== 'undefined') ? badGuyJson.aiViewY : 0;
        enemySprite.body.velocity.x = badGuyJson.velocityX;
        enemySprite.body.y += badGuyJson.offsetY;
        enemySprite.velocityX = badGuyJson.velocityX;
        enemySprite.addAnimations(badGuyJson);
        enemySprite.spriteScale = badGuyJson.scale;
        enemySprite.scale.setTo(enemySprite.spriteScale, enemySprite.spriteScale);
        enemySprite.playAnimation(badGuyJson.initialAnimation);
        return enemySprite;
    }
}
