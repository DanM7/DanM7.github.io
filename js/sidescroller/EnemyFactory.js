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
                break;
        }
        enemySprite.body.velocity.x = badGuyJson.velocityX;
        enemySprite.addAnimations(badGuyJson);
        enemySprite.scale.setTo(badGuyJson.scale, badGuyJson.scale);
        enemySprite.playAnimation(badGuyJson.initialAnimation);
        return enemySprite;
    }
}
