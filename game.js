let player;
let platforms;
let enemies;
let coins;
let flag;
let cursors;
let jumpButton;
let leftButton;
let rightButton;
let score = 0;
let scoreText;
let gameOver = false;
let gameWon = false;
let gameStarted = false;
let bgBack;
let bgMid;

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#050a12',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
window.gameInstance = game;

function preload() {
    this.load.image('bg_back', 'bg_back.png');
    this.load.image('bg_mid', 'bg_mid.png');
    this.load.image('ground', 'tiles.png');
    this.load.spritesheet('player', 'player.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('enemy', 'enemy.png');
    this.load.image('particle', 'tiles.png'); // سنستخدم البلاط كجزيئات مصغرة
}

function create() {
    // Parallax Background
    bgBack = this.add.tileSprite(400, 300, 800, 600, 'bg_back').setScrollFactor(0);
    bgMid = this.add.tileSprite(400, 300, 800, 600, 'bg_mid').setScrollFactor(0);

    // Platforms
    platforms = this.physics.add.staticGroup();
    for (let x = 0; x < 2400; x += 64) {
        platforms.create(x, 574, 'ground').refreshBody();
    }

    // Win Flag
    flag = this.physics.add.staticGroup();
    flag.create(2300, 480, 'ground').setTint(0x2ecc71).setScale(0.5, 3).refreshBody();

    // Player
    player = this.physics.add.sprite(100, 450, 'player');
    player.setBounce(0.1);
    player.setCollideWorldBounds(false);
    player.setVisible(false);

    // Coins
    coins = this.physics.add.group();
    for (let i = 0; i < 15; i++) {
        const coin = coins.create(300 + (i * 140), 400 + Math.sin(i) * 50, 'ground');
        coin.setTint(0xf1c40f);
        coin.setScale(0.4);
        coin.setBounceY(0.4);
    }

    // Enemies
    enemies = this.physics.add.group();
    createEnemy(this, 750, 450);
    createEnemy(this, 1350, 450);
    createEnemy(this, 1950, 450);

    // Animations
    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
        frameRate: 12,
        repeat: -1
    });
    this.anims.create({
        key: 'idle',
        frames: [ { key: 'player', frame: 0 } ],
        frameRate: 20
    });

    // UI
    scoreText = this.add.text(25, 25, 'النقاط: 0', { 
        fontSize: '40px', 
        fill: '#ffd700', 
        fontFamily: 'Outfit',
        stroke: '#000', 
        strokeThickness: 6 
    }).setScrollFactor(0).setVisible(false);

    // Collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(coins, platforms);
    this.physics.add.collider(enemies, platforms);
    this.physics.add.overlap(player, coins, collectCoin, null, this);
    this.physics.add.collider(player, enemies, hitEnemy, null, this);
    this.physics.add.overlap(player, flag, winGame, null, this);

    // Camera
    this.cameras.main.setBounds(0, 0, 2400, 600);
    this.physics.world.setBounds(0, 0, 2400, 600);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    cursors = this.input.keyboard.createCursorKeys();
    setupMobileControls(this);

    // Start Event
    this.events.on('start-game', () => {
        gameStarted = true;
        player.setVisible(true);
        scoreText.setVisible(true);
        if (leftButton) [leftButton, rightButton, jumpButton].forEach(b => b.setVisible(true));
    });

    if (leftButton) [leftButton, rightButton, jumpButton].forEach(b => b.setVisible(false));
}

function update() {
    if (!gameStarted || gameOver || gameWon) return;

    bgBack.tilePositionX = this.cameras.main.scrollX * 0.1;
    bgMid.tilePositionX = this.cameras.main.scrollX * 0.4;

    if (cursors.left.isDown || (leftButton && leftButton.isDown)) {
        player.setVelocityX(-320);
        player.anims.play('run', true);
        player.flipX = true;
    } else if (cursors.right.isDown || (rightButton && rightButton.isDown)) {
        player.setVelocityX(320);
        player.anims.play('run', true);
        player.flipX = false;
    } else {
        player.setVelocityX(0);
        player.anims.play('idle');
    }

    if ((cursors.up.isDown || (jumpButton && jumpButton.isDown) || cursors.space.isDown) && player.body.touching.down) {
        player.setVelocityY(-750);
    }

    enemies.children.iterate(function (enemy) {
        if (enemy && enemy.body) {
            if (enemy.body.blocked.left) enemy.setVelocityX(120);
            else if (enemy.body.blocked.right) enemy.setVelocityX(-120);
        }
    });

    if (player.y > 600) {
        gameOverFunc(this);
    }
}

function createEnemy(scene, x, y) {
    const enemy = enemies.create(x, y, 'enemy');
    enemy.setBounce(0.2);
    enemy.setCollideWorldBounds(true);
    enemy.setVelocityX(-120);
}

function collectCoin(player, coin) {
    // تأثير جزيئات
    const emitter = this.add.particles(coin.x, coin.y, 'particle', {
        speed: { min: -100, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.2, end: 0 },
        blendMode: 'ADD',
        lifespan: 500,
        gravityY: 200,
        quantity: 10
    });
    setTimeout(() => emitter.destroy(), 500);

    coin.disableBody(true, true);
    score += 10;
    scoreText.setText('النقاط: ' + score);
}

function hitEnemy(player, enemy) {
    if (player.body.touching.down && enemy.body.touching.up) {
        enemy.disableBody(true, true);
        player.setVelocityY(-450);
        score += 50;
        scoreText.setText('النقاط: ' + score);
    } else {
        gameOverFunc(this);
    }
}

function gameOverFunc(scene) {
    scene.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('idle');
    gameOver = true;
    
    scene.add.text(400, 300, 'للأسف! انتهت اللعبة', { 
        fontSize: '60px', 
        fill: '#ff0000', 
        fontFamily: 'Outfit',
        stroke: '#000', 
        strokeThickness: 8 
    }).setOrigin(0.5).setScrollFactor(0);
    
    setTimeout(() => { location.reload(); }, 2000);
}

function winGame(player, flag) {
    this.physics.pause();
    player.setTint(0x00ff00);
    gameWon = true;

    this.add.text(400, 300, 'مبروك! لقد فزت', { 
        fontSize: '72px', 
        fill: '#2ecc71', 
        fontFamily: 'Outfit',
        stroke: '#000', 
        strokeThickness: 10 
    }).setOrigin(0.5).setScrollFactor(0);

    setTimeout(() => { location.reload(); }, 4000);
}

function setupMobileControls(scene) {
    const screenWidth = scene.cameras.main.width;
    const screenHeight = scene.cameras.main.height;
    
    leftButton = createControlButton(scene, 100, screenHeight - 80, '←');
    rightButton = createControlButton(scene, 240, screenHeight - 80, '→');
    jumpButton = createControlButton(scene, screenWidth - 100, screenHeight - 80, '↑');
}

function createControlButton(scene, x, y, label) {
    const btn = scene.add.circle(x, y, 50, 0xffffff, 0.2)
        .setInteractive()
        .setScrollFactor(0);
    
    btn.setStrokeStyle(2, 0xffffff, 0.5);
    
    scene.add.text(x, y, label, { fontSize: '40px', fill: '#fff' })
        .setOrigin(0.5)
        .setScrollFactor(0);

    btn.on('pointerdown', () => { btn.isDown = true; btn.setAlpha(0.6); });
    btn.on('pointerup', () => { btn.isDown = false; btn.setAlpha(0.2); });
    btn.on('pointerout', () => { btn.isDown = false; btn.setAlpha(0.2); });

    return btn;
}
