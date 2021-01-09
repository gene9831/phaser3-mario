import Phaser from "phaser";
import { createMarioAnims } from "~/anims/CharacterAnims";
import { SMBPhysics } from "~/smb-physics";
import { debugDraw } from "~/utils/debug";

export default class MainScene extends Phaser.Scene {
  private readonly smbPhysics = new SMBPhysics(32);

  private player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private playerPreviousVelocityY: number = 0;

  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private debugText?: Phaser.GameObjects.Text;
  private debugTextOn = false;

  private state: {
    onGround: boolean;
    groud: "idle" | "walking" | "running" | "runAWhile" | "skidding" | "release";
    jumping: boolean;
  };

  constructor() {
    super("main");
    this.state = {
      onGround: true,
      groud: "idle",
      jumping: false,
    };
  }

  preload() {
    this.load.image("tiles_overworld", "tiles/overworld.png");
    this.load.image("tiles_underground", "tiles/underground.png");
    this.load.tilemapTiledJSON("level_1_1", "levels/levele1-1.json");

    this.load.atlas("mario", "players/mario.png", "players/mario.json");
  }

  create() {
    // console.log(this.smbPhysics);

    const level_1_1 = this.make.tilemap({ key: "level_1_1" });
    const tilesOverworld = level_1_1.addTilesetImage("overworld", "tiles_overworld");
    const tilesUnderground = level_1_1.addTilesetImage("underground", "tiles_underground");

    level_1_1.createLayer("地上背景", tilesOverworld);
    level_1_1.createLayer("地上风景", tilesOverworld);
    const layer = level_1_1.createLayer("地上平台", tilesOverworld);
    level_1_1.createLayer("目标", tilesOverworld);
    level_1_1.createLayer("城堡", tilesOverworld);

    layer.setCollisionByProperty({ collides: true });

    // this.player = this.physics.add.sprite(5550, 348 - 32 * 2, "mario", "mario-idle-0");
    this.player = this.physics.add.sprite(100, layer.height - 32 * 2 - 16, "mario", "mario-idle-0");
    this.player.setCollideWorldBounds(true);
    this.player.setMaxVelocity(this.smbPhysics.velocities.maxRun, 1000);
    this.player.setDragX(this.smbPhysics.decelerations.release);
    this.player.setGravityY(this.smbPhysics.vertical.stage_0.falling_gy);
    this.player.setBodySize(28, 32);
    createMarioAnims(this.anims);

    level_1_1.createLayer("城堡2", tilesOverworld);

    this.cameras.main.setBounds(0, 48, layer.width, layer.height - 64);
    this.cameras.main.startFollow(this.player, true);

    this.physics.add.collider(this.player, layer, (_player, _tile: unknown) => {
      const tile = _tile as Phaser.Tilemaps.Tile;
      if (_player.body.blocked.up && tile.faceBottom) {
        const bodyWidth = _player.body.width;
        if (_player.body.velocity.x === 0) {
          // 静止的时候移动最大半个腰
          if (_player.body.x + bodyWidth / 2 < tile.pixelX && !layer.getTileAt(tile.x - 1, tile.y)) {
            _player.body.x = tile.pixelX - bodyWidth;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          } else if (
            _player.body.x + bodyWidth / 2 > tile.pixelX + tile.width &&
            !layer.getTileAt(tile.x + 1, tile.y)
          ) {
            _player.body.x = tile.pixelX + tile.width;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          }
        } else {
          // 运动的时候移动最大1/4个腰
          if (_player.body.x + (bodyWidth * 3) / 4 < tile.pixelX && !layer.getTileAt(tile.x - 1, tile.y)) {
            _player.body.x = tile.pixelX - bodyWidth;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          } else if (
            _player.body.x + bodyWidth / 4 > tile.pixelX + tile.width &&
            !layer.getTileAt(tile.x + 1, tile.y)
          ) {
            _player.body.x = tile.pixelX + tile.width;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          }
        }
      }
    });

    this.physics.world.setBounds(0, 0, level_1_1.widthInPixels, level_1_1.heightInPixels);

    this.addKeys();

    this.debugText = this.add
      .text(2, 2, "debug", {
        color: "#FFF",
        fontSize: "16px",
        shadow: {
          offsetX: 1,
          offsetY: 1,
          fill: true,
        },
      })
      .setScrollFactor(0)
      .setActive(this.debugTextOn)
      .setVisible(this.debugTextOn);
    this.input.keyboard.on(
      "keydown-BACKSPACE",
      () => {
        this.debugTextOn = !this.debugTextOn;
        this.debugText?.setActive(this.debugTextOn).setVisible(this.debugTextOn);
      },
      this
    );

    // debugDraw(layer, this);
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

  update() {
    if (!this.player || !this.keys) return;
    this.state.onGround = this.player.body.onFloor();

    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;
    if (vy != 0) this.playerPreviousVelocityY = vy;

    this.horizontalPhysics(this.player, this.keys);

    this.verticalPhysics(this.player, this.keys);

    this.playAnims(this.player);

    // debug text
    if (this.debugTextOn && this.debugText) {
      this.debugText.setText(`x: ${this.player.x}
y: ${this.player.y}
bodyX: ${this.player.body.x}
bodyY: ${this.player.body.y}
vx: ${vx}
vy: ${vy}
ax: ${this.player.body.acceleration.x}
ay: ${this.player.body.acceleration.y}
gx: ${this.player.body.gravity.x}
gy: ${this.player.body.gravity.y}
`);
    }
  }

  private runAWhile = false;
  private runTimer = -1;
  private startedJumpSpeed = 0;
  private skidDirection = 0;
  private horizontalPhysics(
    _player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    _keys: Record<string, Phaser.Input.Keyboard.Key>
  ) {
    const vx = _player.body.velocity.x;
    const vx_abs = Math.abs(vx);
    // 十字键水平方向
    let crossKeyHorizontal: "left" | "right" | "none" = "none";
    if (_keys.left.isDown && _keys.right.isUp) {
      crossKeyHorizontal = "left";
    } else if (_keys.right.isDown && _keys.left.isUp) {
      crossKeyHorizontal = "right";
    }
    const sameDirection = (vx <= 0 && crossKeyHorizontal === "left") || (vx >= 0 && crossKeyHorizontal === "right");

    if (this.state.onGround) {
      // 在地面的水平方向速度变化
      if (crossKeyHorizontal !== "none") {
        // 施加横向力
        const directionOfAcceleration = crossKeyHorizontal === "left" ? -1 : 1;
        if (sameDirection) {
          // 速度与加速度同向
          let minWalkV = this.smbPhysics.velocities.minWalk;
          if (this.state.groud === "skidding" && this.skidDirection !== directionOfAcceleration) {
            // 打滑未完成（打滑没有把速度降至0），继续walk或者run，有一个最小skidTrunaround速度
            minWalkV = this.smbPhysics.velocities.skidTrunaround;
          }
          if (vx_abs < minWalkV) {
            _player.setVelocityX(directionOfAcceleration * minWalkV);
          }
          // buutonB.isDown 的优先级要大于runAWhile
          if (_keys.buttonB.isDown) {
            _player.body.maxVelocity.x = this.smbPhysics.velocities.maxRun;
            _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.run);
            this.state.groud = "running";
            // clear run timer
            if (this.runTimer > 0) {
              clearTimeout(this.runTimer);
              this.runTimer = -1;
            }
            this.runAWhile = false;
          } else if (this.runAWhile) {
            _player.body.maxVelocity.x = Math.max(vx_abs, this.smbPhysics.velocities.maxWalk);
            this.state.groud = "runAWhile";
          } else {
            if (this.state.groud === "running") {
              // next state is 'runAWhile'
              if (this.runTimer > 0) {
                clearTimeout(this.runTimer);
              }
              this.runAWhile = true;
              this.runTimer = setTimeout(() => {
                this.runAWhile = false;
                this.runTimer = -1;
              }, this.smbPhysics.keepingTimeWhenRunningToWalking);
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
          this.skidDirection = directionOfAcceleration;
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
      // 在空中的水平方向速度变化
      _player.setDragX(0);

      if (crossKeyHorizontal !== "none") {
        const directionOfAcceleration = crossKeyHorizontal === "left" ? -1 : 1;
        if (sameDirection) {
          // 速度与加速度同向
          if (vx_abs < this.smbPhysics.velocities.maxWalk) {
            _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.walk);
          } else {
            _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.run);
          }
        } else {
          // 速度与加速度不同向
          if (vx_abs < this.smbPhysics.velocities.maxWalk) {
            if (this.startedJumpSpeed < this.smbPhysics.air.V_01D00) {
              _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.walk);
            } else {
              // 当你的速度小于0x1900(maxWalk)，但起跳时的速度超过了0x01D00时，会给你一个比walk acceleration更大的加速度
              // 简单的说就是往回拉得更快
              _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.air.A_000D0);
            }
          } else {
            _player.setAccelerationX(directionOfAcceleration * this.smbPhysics.accelerations.run);
          }
        }
      } else {
        _player.setAccelerationX(0);
      }
    }
  }

  private jumpStage = 0;
  private verticalPhysics(
    _player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    _keys: Record<string, Phaser.Input.Keyboard.Key>
  ) {
    const vy = _player.body.velocity.y;

    if (this.state.onGround) {
      // 在地面，随时准备起跳
      this.state.jumping = false;
      _player.setGravityY(this.smbPhysics.vertical.stage_0.falling_gy);
      // addKeys()里面监听了down事件，this.keys.buttonA.on("down", callback)
      // callback里面调用了this.jump
    } else {
      // 在空中长按A松开后，或者垂直速度方向开始向下
      if (_keys.buttonA.isUp || vy >= 0) {
        if (this.jumpStage === 1) {
          _player.setGravityY(this.smbPhysics.vertical.stage_0.falling_gy);
        } else if (this.jumpStage === 2) {
          _player.setGravityY(this.smbPhysics.vertical.stage_1.falling_gy);
        } else if (this.jumpStage === 3) {
          _player.setGravityY(this.smbPhysics.vertical.stage_2.falling_gy);
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
    if (this.state.onGround && _keys.buttonA.isDown) {
      // 在地面，按下A
      const vx = _player.body.velocity.x;

      this.state.jumping = true;
      this.startedJumpSpeed = Math.abs(vx);

      const vx_abs = Math.abs(vx);
      if (vx_abs < this.smbPhysics.vertical.stage_0.max_vx) {
        // console.log("stage 1");
        this.jumpStage = 1;
        _player.setVelocityY(-this.smbPhysics.vertical.stage_0.initial_vy);
        _player.setGravityY(this.smbPhysics.vertical.stage_0.holdingA_gy);
      } else if (vx_abs < this.smbPhysics.vertical.stage_1.max_vx) {
        // console.log("stage 2");
        this.jumpStage = 2;
        _player.setVelocityY(-this.smbPhysics.vertical.stage_1.initial_vy);
        _player.setGravityY(this.smbPhysics.vertical.stage_1.holdingA_gy);
      } else {
        // console.log("stage 3");
        this.jumpStage = 3;
        _player.body.maxVelocity.y = this.smbPhysics.vertical.stage_2.initial_vy;
        _player.setVelocityY(-this.smbPhysics.vertical.stage_2.initial_vy);
        _player.setGravityY(this.smbPhysics.vertical.stage_2.holdingA_gy);
      }
    }
  }

  private playAnims(_player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    if (this.state.onGround) {
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
          _player.anims.play("skid", true);

        default:
          break;
      }
    } else {
      if (this.state.jumping) {
        _player.anims.play("jump", true);
      } else {
        // fall
        const animName = _player.anims.getName();
        if (animName !== "walk" && animName !== "run") {
          _player.setTexture("mario", "mario-walk-0");
        }
        // 掉落时动画定格在walk或者run的某一帧
        _player.anims.stop();
        // _player.setTexture("mario", `mario-walk-${Math.floor(3 * Math.random())}`);
      }
    }
  }
}
