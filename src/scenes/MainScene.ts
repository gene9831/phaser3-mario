import Phaser from "phaser";
import { SMBPhysics } from "~/smb-physics";

export default class MainScene extends Phaser.Scene {
  private readonly smbPhysics = new SMBPhysics(32);
  private gravityY: number = 0;

  private platform?: Phaser.Physics.Arcade.StaticGroup;
  private player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  private bmg?: Phaser.Sound.BaseSound;

  private state: {
    airOrGround: "air" | "ground";
    groud: "idle" | "walking" | "running" | "runAWhile" | "skidding" | "release";
  };

  constructor() {
    super("main");
    this.state = {
      airOrGround: "ground",
      groud: "idle",
    };
  }

  preload() {
    this.load.atlas("mario", "assets/mario.png", "assets/mario.json");
    this.load.image("block", "assets/block.png");
    this.load.audio("jump_small", "assets/smb_jump-small.wav");
    this.load.audio("mario_theme", "assets/mario_theme.mp3");
  }

  create() {
    console.log(this.smbPhysics);
    this.gravityY = this.physics.getConfig().gravity?.y || 0;

    this.platform = this.createPlatform();

    this.player = this.physics.add.sprite(100, 600 - 32 * 2, "mario", "mario-0.png");
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(this.smbPhysics.velocities.maxRun, 1000);
    this.player.setDragX(this.smbPhysics.decelerations.release);
    this.player.setSize(26, 30);
    console.log(this.player.width, this.player.body.width);

    this.physics.add.collider(this.platform, this.player, (_paltfrom, _play) => {
      if (_paltfrom.body.touching.up && _play.body.touching.down) {
        this.state.airOrGround = "ground";
      }
    });

    this.addKeys();

    this.createAnims();

    this.bmg = this.sound.add("mario_theme", {
      loop: true,
      volume: 0.3,
    });
    this.bmg.play();
  }

  createPlatform(): Phaser.Physics.Arcade.StaticGroup {
    const platform = this.physics.add.staticGroup({
      key: "block",
      repeat: Math.ceil(800 / 32) - 1,
      setXY: { x: 16, y: 600 - 32, stepX: 32 },
    });
    platform.createFromConfig({
      key: "block",
      repeat: Math.ceil(800 / 32),
      setXY: { x: 16, y: 600, stepX: 32 },
    });
    platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 66, y: 600 - 5 * 32, stepX: 32 },
    });
    platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 366, y: 600 - 9 * 32, stepX: 32 },
    });
    platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 666, y: 600 - 13 * 32, stepX: 32 },
    });
    platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 350, y: 600 - 16 * 32, stepX: 32 },
    });
    platform.createFromConfig({
      key: "block",
      repeat: 3,
      setXY: { x: 100, y: 600 - 14 * 32, stepX: 32 },
    });
    return platform;
  }

  private addKeys() {
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      buttonA: Phaser.Input.Keyboard.KeyCodes.SPACE,
      buttonB: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private createAnims() {
    this.anims.create({
      key: "idle",
      frames: [{ key: "mario", frame: "mario-0.png" }],
      frameRate: 20,
    });
    this.anims.create({
      key: "walk",
      frames: [
        {
          key: "mario",
          frame: "mario-1.png",
        },
        {
          key: "mario",
          frame: "mario-2.png",
        },
        {
          key: "mario",
          frame: "mario-3.png",
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
          frame: "mario-1.png",
        },
        {
          key: "mario",
          frame: "mario-2.png",
        },
        {
          key: "mario",
          frame: "mario-3.png",
        },
      ],
      frameRate: 16,
      repeat: -1,
    });
    this.anims.create({
      key: "skid",
      frames: [{ key: "mario", frame: "mario-4.png" }],
      frameRate: 20,
    });
    this.anims.create({
      key: "jump",
      frames: [{ key: "mario", frame: "mario-5.png" }],
      frameRate: 20,
    });
  }

  private runAWhile = false;
  private runTimer = -1;
  private setRunTimer() {
    // if (this.runTimer > 0) {
    //   clearTimeout(this.runTimer);
    // }
    this.runAWhile = true;
    this.runTimer = setTimeout(() => {
      this.runAWhile = false;
      this.runTimer = -1;
    }, this.smbPhysics.keepingTimeWhenRunningToWalking);
  }
  private clearRunTimer() {
    if (this.runTimer > 0) {
      clearTimeout(this.runTimer);
      this.runTimer = -1;
    }
    this.runAWhile = false;
  }

  update() {
    if (!this.player || !this.keys) return;
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;

    console.log(
      `${this.state.groud}\t${vx.toFixed(3)}\t${this.player.body.acceleration.x}\t${this.player.body.drag.x}`
    );

    // 十字键水平方向
    let crossKeyHorizontal: "left" | "right" | "none" = "none";
    if (this.keys.left.isDown && this.keys.right.isUp) {
      crossKeyHorizontal = "left";
    } else if (this.keys.right.isDown && this.keys.left.isUp) {
      crossKeyHorizontal = "right";
    }

    if (crossKeyHorizontal !== "none") {
      // 施加横向力
      const directionOfAcceleration = crossKeyHorizontal === "left" ? -1 : 1;
      if ((vx <= 0 && crossKeyHorizontal === "left") || (vx >= 0 && crossKeyHorizontal === "right")) {
        // 速度与加速度同向

        const minV =
          this.state.groud === "skidding"
            ? // 打滑速度降为0后的转向速度大于minWalk，所以你会发现在短的平台上有些大佬喜欢反向起跳然后正向加速
              this.smbPhysics.velocities.skidTrunaround
            : this.smbPhysics.velocities.minWalk;
        if (Math.abs(vx) < minV) {
          this.player.setVelocityX(directionOfAcceleration * minV);
        }
        // buutonB.isDown 的优先级要大于runAWhile
        if (this.keys.buttonB.isDown) {
          this.player.body.maxVelocity.x = this.smbPhysics.velocities.maxRun;
          this.player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.run);
          this.state.groud = "running";
          this.clearRunTimer();
        } else if (this.runAWhile) {
          this.player.body.maxVelocity.x = Math.max(Math.abs(vx), this.smbPhysics.velocities.maxWalk);
          this.state.groud = "runAWhile";
        } else {
          if (this.state.groud === "running") {
            // next state is 'runAWhile'
            this.setRunTimer();
          } else {
            this.player.body.maxVelocity.x = this.smbPhysics.velocities.maxWalk;
            this.player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.walk);
            this.state.groud = "walking";
          }
        }
      } else {
        // 速度与加速度不同向
        this.player.setAccelerationX(directionOfAcceleration * this.smbPhysics.decelerations.skid);
        this.state.groud = "skidding";
      }
    } else {
      // 无横向力作用
      this.player.setAccelerationX(0);
      if (vx === 0) {
        this.state.groud = "idle";
      } else {
        if (this.state.groud === "skidding") {
          // 即使没有横向力了，打滑也要继续，直到速度为0
          this.player.setDragX(this.smbPhysics.decelerations.skid);
        } else {
          this.player.setDragX(this.smbPhysics.decelerations.release);
          this.state.groud = "release";
        }
      }
    }

    this.playAnims(this.player);
  }

  private playAnims(_player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    const vx = _player.body.velocity.x;
    if (vx > 0) _player.setFlipX(false);
    else if (vx < 0) _player.setFlipX(true);
    switch (this.state.groud) {
      case "idle":
        _player.anims.play("idle", true);
        break;
      case "walking":
      case "running":
      case "runAWhile":
      case "release":
        _player.anims.play(Math.abs(vx) < this.smbPhysics.velocities.maxRun - 1 ? "walk" : "run", true);
        break;
      case "skidding":
        _player.setFlipX(!_player.flipX);
        _player.anims.play("skid", true);

      default:
        break;
    }
  }
}
