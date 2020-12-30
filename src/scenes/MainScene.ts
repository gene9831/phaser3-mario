import Phaser from "phaser";

export default class MainScene extends Phaser.Scene {
  private gravityY: number = 0;

  private platform?: Phaser.Physics.Arcade.StaticGroup;
  private player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;
  private keyShift?: Phaser.Input.Keyboard.Key;

  private bmg?: Phaser.Sound.BaseSound;

  constructor() {
    super("main");
  }

  preload() {
    this.load.atlas("mario", "assets/mario.png", "assets/mario.json");
    this.load.image("block", "assets/block.png");
    this.load.audio("jump_small", "assets/smb_jump-small.wav");
    this.load.audio("mario_theme", "assets/mario_theme.mp3");
  }

  create() {
    this.gravityY = this.physics.getConfig().gravity?.y || 0;

    this.platform = this.physics.add.staticGroup({
      key: "block",
      repeat: Math.ceil(800 / 32) - 1,
      setXY: { x: 16, y: 600 - 32, stepX: 32 },
    });
    this.platform.createFromConfig({
      key: "block",
      repeat: Math.ceil(800 / 32),
      setXY: { x: 16, y: 600, stepX: 32 },
    });
    this.platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 66, y: 600 - 5 * 32, stepX: 32 },
    });
    this.platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 366, y: 600 - 9 * 32, stepX: 32 },
    });
    this.platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 666, y: 600 - 13 * 32, stepX: 32 },
    });
    this.platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 370, y: 600 - 17 * 32, stepX: 32 },
    });
    this.platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 100, y: 600 - 14 * 32, stepX: 32 },
    });

    this.player = this.physics.add.sprite(100, 500, "mario", "idle_0.png");
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(300, 1000);
    this.player.setDrag(300);
    this.player.setSize(26, 30);

    this.physics.add.collider(this.platform, this.player);

    this.addKeys();

    this.createAnims();

    this.bmg = this.sound.add("mario_theme", {
      loop: true,
      volume: 0.3,
    });
    this.bmg.play();
  }

  private walkF = 300;
  private runF = 400;
  private jumpV0 = 200;
  private jumpF = 1400;
  private jumping = false;
  private disableKey: string = "";
  private breaking = 0;

  update() {
    if (!this.player) return;
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;

    if (vy > 400) {
      this.player.setVelocityY(400);
    }

    if (this.keyShift?.isDown) {
      // already setMaxVelocity in create func
      // this.player.body.maxVelocity.x = 300;
      this.disableKey = "";
    } else {
      if (Math.abs(vx) > 200) {
        this.disableKey = Math.sign(vx) > 0 ? "D" : "A";
      } else {
        this.disableKey = "";
      }
    }

    if (this.keyA?.isDown && this.disableKey !== "A") {
      let times = 1;
      if (vx > 0) times = 1.5;
      this.breaking = vx > 50 ? -1 : 0;
      this.player.setAccelerationX(-times * (this.keyShift?.isDown ? this.runF : this.walkF));
    } else if (this.keyD?.isDown && this.disableKey !== "D") {
      let times = 1;
      if (vx < 0) times = 1.5;
      this.breaking = vx < -50 ? 1 : 0;
      this.player.setAccelerationX(times * (this.keyShift?.isDown ? this.runF : this.walkF));
    } else {
      this.player.setAccelerationX(0);
    }

    if (this.jumping) {
      const duration = this.keySpace?.getDuration() || 0;
      if (duration > 200) {
        this.jumping = false;
      }
    }

    if (!this.jumping) {
      if (vy !== 0) {
        this.player?.setAccelerationY(this.gravityY);
      } else {
        this.player?.setAccelerationY(0);
      }
    }

    if (this.player.body.touching.down) {
      // 接触地面才能改变动画
      // 翻转sprite
      if (vx === 0) {
        if (this.keyA?.isDown) {
          this.player.flipX = true;
        }
        this.player.play("idle", true);
        this.breaking = 0;
      } else {
        this.player.flipX = vx < 0;
        if (vx < 0) {
          if (this.keyD?.isDown) {
            if (this.breaking === 1) this.player.play("break", true);
          } else this.player.play(Math.abs(vx) < 300 ? "walk" : "run", true);
        } else {
          if (this.keyA?.isDown) {
            if (this.breaking === -1) this.player.play("break", true);
          } else this.player.play(Math.abs(vx) < 300 ? "walk" : "run", true);
        }
      }
    } else {
      this.player.play("jump", true);
    }
  }

  private jump() {
    if (!this.player) return;
    if (this.player.body.touching.down) {
      this.jumping = true;
      this.player.setVelocityY(-this.jumpV0);
      this.player.setAccelerationY(-(this.gravityY + this.jumpF));
      this.sound.play("jump_small");
    }
  }

  private jumpBreak() {
    this.jumping = false;
  }

  private addKeys() {
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keySpace.on("down", this.jump, this);
    this.keySpace.on("up", this.jumpBreak, this);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.input.keyboard.on(
      "keydown-M",
      () => {
        if (this.bmg) {
          console.log(11);
          const bgm = this.bmg as Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;
          bgm.setMute(!bgm.mute);
        }
      },
      this
    );
  }

  private createAnims() {
    this.anims.create({
      key: "idle",
      frames: [{ key: "mario", frame: "idle_0.png" }],
      frameRate: 20,
    });
    this.anims.create({
      key: "walk",
      frames: [
        {
          key: "mario",
          frame: "walk_0.png",
        },
        {
          key: "mario",
          frame: "walk_1.png",
        },
        {
          key: "mario",
          frame: "walk_2.png",
        },
      ],
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "run",
      frames: [
        {
          key: "mario",
          frame: "walk_0.png",
        },
        {
          key: "mario",
          frame: "walk_1.png",
        },
        {
          key: "mario",
          frame: "walk_2.png",
        },
      ],
      frameRate: 16,
      repeat: -1,
    });
    this.anims.create({
      key: "jump",
      frames: [{ key: "mario", frame: "jump_0.png" }],
      frameRate: 20,
    });
    this.anims.create({
      key: "break",
      frames: [{ key: "mario", frame: "break_0.png" }],
      frameRate: 20,
    });
  }
}
