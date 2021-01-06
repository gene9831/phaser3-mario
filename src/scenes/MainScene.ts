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
    groud: "idle" | "walking" | "running" | "runAWhile" | "skidding" | "release";
    jumping: boolean;
  };

  constructor() {
    super("main");
    this.state = {
      groud: "idle",
      jumping: false,
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
    this.player.setGravityY(this.smbPhysics.vertical.initial_vx_0.falling_gy);

    this.physics.add.collider(this.platform, this.player);

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
    this.keys.buttonA.on("down", () => {
      if (this.player && this.keys) this.jump(this.player, this.keys);
    });
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
    this.anims.create({
      key: "fall",
      frames: [{ key: "mario", frame: "mario-1.png" }],
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

    // console.log(
    //   `${this.state.groud}\t${vx.toFixed(3)}\t${this.player.body.acceleration.x}\t${this.player.body.drag.x}`
    // );
    // console.log(vx, this.player.body.acceleration.x);
    // console.log(vy, this.player.body.gravity.y);

    this.horizontalPhysics(this.player, this.keys);

    this.verticalPhysics(this.player, this.keys);

    this.playAnims(this.player);
  }

  private horizontalPhysics(
    _player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    _keys: Record<string, Phaser.Input.Keyboard.Key>
  ) {
    const vx = _player.body.velocity.x;
    const vy = _player.body.velocity.y;
    if (_player.body.touching.down) {
      // 在地面的水平方向速度变化
      // 十字键水平方向
      let crossKeyHorizontal: "left" | "right" | "none" = "none";
      if (_keys.left.isDown && _keys.right.isUp) {
        crossKeyHorizontal = "left";
      } else if (_keys.right.isDown && _keys.left.isUp) {
        crossKeyHorizontal = "right";
      }

      if (crossKeyHorizontal !== "none") {
        // 施加横向力
        const directionOfAcceleration = crossKeyHorizontal === "left" ? -1 : 1;
        if ((vx <= 0 && crossKeyHorizontal === "left") || (vx >= 0 && crossKeyHorizontal === "right")) {
          // 速度与加速度同向

          const minV =
            this.state.groud === "skidding"
              ? // 打滑速度降为0后的转向速度大于minWalk，所以你会发现在短的平台上反向起跳然后正向加速会缩短达到最大速度的时间。这个地方不知道我理解的对不对
                this.smbPhysics.velocities.skidTrunaround
              : this.smbPhysics.velocities.minWalk;
          if (Math.abs(vx) < minV) {
            _player.setVelocityX(directionOfAcceleration * minV);
          }
          // buutonB.isDown 的优先级要大于runAWhile
          if (_keys.buttonB.isDown) {
            _player.body.maxVelocity.x = this.smbPhysics.velocities.maxRun;
            _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.run);
            this.state.groud = "running";
            this.clearRunTimer();
          } else if (this.runAWhile) {
            _player.body.maxVelocity.x = Math.max(Math.abs(vx), this.smbPhysics.velocities.maxWalk);
            this.state.groud = "runAWhile";
          } else {
            if (this.state.groud === "running") {
              // next state is 'runAWhile'
              this.setRunTimer();
            } else {
              _player.body.maxVelocity.x = this.smbPhysics.velocities.maxWalk;
              _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.walk);
              this.state.groud = "walking";
            }
          }
        } else {
          // 速度与加速度不同向
          _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.decelerations.skid);
          this.state.groud = "skidding";
        }
      } else {
        // 无横向力作用
        _player.setAccelerationX(0);
        if (vx === 0) {
          this.state.groud = "idle";
        } else {
          if (this.state.groud === "skidding") {
            // 即使没有横向力了，打滑也要继续，直到速度为0
            _player.setDragX(this.smbPhysics.decelerations.skid);
          } else {
            _player.setDragX(this.smbPhysics.decelerations.release);
            this.state.groud = "release";
          }
        }
      }
    } else {
      // TODO 在空中的水平方向速度变化
      _player.setAccelerationX(0);
      _player.setDragX(0);
    }
  }

  private jumpStage = 0;
  private verticalPhysics(
    _player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    _keys: Record<string, Phaser.Input.Keyboard.Key>
  ) {
    const vx = _player.body.velocity.x;
    const vy = _player.body.velocity.y;

    if (_player.body.touching.down) {
      // 在地面，随时准备起跳
      this.state.jumping = false;
      _player.setGravityY(this.smbPhysics.vertical.initial_vx_0.falling_gy);
      // addKeys()里面监听了down事件，this.keys.buttonA.on("down", callback)
      // callback里面调用了this.jump
    } else {
      // 在空中长按A松开后，或者垂直速度方向开始向下
      if (_keys.buttonA.isUp || vy >= 0) {
        if (this.jumpStage === 1) {
          _player.setGravityY(this.smbPhysics.vertical.initial_vx_0.falling_gy);
        } else if (this.jumpStage === 2) {
          _player.setGravityY(this.smbPhysics.vertical.initial_vx_1.falling_gy);
        } else if (this.jumpStage === 3) {
          _player.setGravityY(this.smbPhysics.vertical.initial_vx_2.falling_gy);
        }
      }
      if (vy > this.smbPhysics.vertical.downwardMax) {
        _player.body.maxVelocity.y = this.smbPhysics.vertical.downwardMax;
      }
    }
  }

  private jump(
    _player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    _keys: Record<string, Phaser.Input.Keyboard.Key>
  ) {
    // ? 经过测试，在达到最大running速度后起跳，高度无法达到5个方块。可能哪个地方的计算出现了误差，或者是我没有理解对跳跃逻辑
    if (_player.body.touching.down && _keys.buttonA.isDown) {
      // 在地面，按下A
      this.state.jumping = true;

      const vx_abs = Math.abs(_player.body.velocity.x);
      if (vx_abs < this.smbPhysics.vertical.initial_vx_0.lessThan_vx) {
        console.log("stage 1");
        this.jumpStage = 1;
        _player.setVelocityY(-this.smbPhysics.vertical.initial_vx_0.initial_vy);
        _player.setGravityY(this.smbPhysics.vertical.initial_vx_0.holdingA_gy);
      } else if (vx_abs < this.smbPhysics.vertical.initial_vx_1.lessThan_vx) {
        console.log("stage 2");
        this.jumpStage = 2;
        _player.setVelocityY(-this.smbPhysics.vertical.initial_vx_1.initial_vy);
        _player.setGravityY(this.smbPhysics.vertical.initial_vx_1.holdingA_gy);
      } else {
        console.log("stage 3");
        this.jumpStage = 3;
        _player.body.maxVelocity.y = this.smbPhysics.vertical.initial_vx_2.initial_vy;
        _player.setVelocityY(-this.smbPhysics.vertical.initial_vx_2.initial_vy);
        _player.setGravityY(this.smbPhysics.vertical.initial_vx_2.holdingA_gy);
      }
    }
  }

  private playAnims(_player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    if (_player.body.touching.down) {
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
    } else {
      if (this.state.jumping) {
        _player.anims.play("jump", true);
      } else {
        // fall
        _player.anims.play("fall", true);
      }
    }
  }
}
