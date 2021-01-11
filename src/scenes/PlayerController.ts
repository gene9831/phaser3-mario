import { SMBPhysics } from "~/smb-physics";
import StateMachine from "~/statemachine/StateMachine";

enum Ground {
  NAME = "ground",
  IDLE = "idle",
  WALK = "walk",
  RUN = "run",
  RUNAWHILE = "runAWhile",
  SKID = "skid",
  RELEASE = "release",
}

enum Air {
  NAME = "air",
  JUMP = "jump",
  FALL = "fall",
}

const States = {
  Ground,
  Air,
};

export default class PlayerController {
  private readonly smbPhysics = new SMBPhysics(32);

  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private horizontalKeyDirection: -1 | 0 | 1 = 0;

  private stateMachine: StateMachine;
  debugText?: string;
  debug: boolean = false;

  constructor(
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    keys: Record<string, Phaser.Input.Keyboard.Key>,
    debug: boolean = false
  ) {
    this.sprite = sprite;

    this.keys = keys;

    this.debug = debug;

    this.createAnims();

    this.stateMachine = new StateMachine(this, "player", debug)
      .addStateGroup(
        States.Ground.NAME,
        {
          onEnter: this.groundOnEnter,
          onUpdate: this.groundOnUpdate,
        },
        [
          { name: States.Ground.IDLE },
          {
            name: States.Ground.WALK,
            onEnter: this.walkOnEnter,
          },
          {
            name: States.Ground.RUN,
            onEnter: this.runOnEnter,
          },
          {
            name: States.Ground.RUNAWHILE,
            onEnter: this.runAWhileOnEnter,
          },
          {
            name: States.Ground.SKID,
            onEnter: this.skidOnEnter,
            onUpdate: this.skidOnUpdate,
          },
          {
            name: States.Ground.RELEASE,
            onEnter: this.releaseOnEnter,
          },
        ]
      )
      .addStateGroup(
        States.Air.NAME,
        {
          onUpdate: this.airOnUpdate,
        },
        [
          {
            name: States.Air.JUMP,
            onEnter: this.jumpOnEnter,
            onUpdate: this.jumpOnUpdate,
          },
          {
            name: States.Air.FALL,
            onEnter: this.fallOnEnter,
          },
        ]
      )
      .setState(States.Ground.IDLE, States.Ground.NAME);

    console.log(this.smbPhysics);
    console.log(this.stateMachine.states);

    this.keys.buttonA.on("down", () => {
      if (this.stateMachine.getCurrentState()?.startsWith(States.Ground.NAME)) {
        // 如果在地面，按下A
        this.stateMachine.setState(States.Air.JUMP, States.Air.NAME);
      }
    });
  }

  update(dt: number) {
    // 十字键水平方向
    if (this.keys.left.isDown && this.keys.right.isUp) {
      this.horizontalKeyDirection = -1;
    } else if (this.keys.right.isDown && this.keys.left.isUp) {
      this.horizontalKeyDirection = 1;
    } else {
      this.horizontalKeyDirection = 0;
    }

    this.stateMachine.udpate(dt);

    this.playAnims();

    const vx = this.sprite.body.velocity.x;
    const vy = this.sprite.body.velocity.y;

    // console.log(vx);

    if (this.debug) {
      this.debugText = `x: ${this.sprite.x}
y: ${this.sprite.y}
bodyX: ${this.sprite.body.x}
bodyY: ${this.sprite.body.y}
vx: ${vx}
vy: ${vy}
ax: ${this.sprite.body.acceleration.x}
ay: ${this.sprite.body.acceleration.y}
gx: ${this.sprite.body.gravity.x}
gy: ${this.sprite.body.gravity.y}
dragX: ${this.sprite.body.drag.x}
dragY: ${this.sprite.body.drag.y}
`;
    }
  }

  createAnims() {
    this.sprite.anims.create({
      key: "idle",
      frames: [{ key: "mario", frame: "mario-idle-0" }],
      frameRate: 20,
    });
    this.sprite.anims.create({
      key: "walk",
      frames: this.sprite.anims.generateFrameNames("mario", { start: 0, end: 2, prefix: "mario-walk-" }),
      frameRate: 8,
      repeat: -1,
    });
    this.sprite.anims.create({
      key: "run",
      frames: this.sprite.anims.generateFrameNames("mario", { start: 0, end: 2, prefix: "mario-walk-" }),
      frameRate: 16,
      repeat: -1,
    });
    this.sprite.anims.create({
      key: "skid",
      frames: [{ key: "mario", frame: "mario-skid-0" }],
      frameRate: 20,
    });
    this.sprite.anims.create({
      key: "jump",
      frames: [{ key: "mario", frame: "mario-jump-0" }],
      frameRate: 20,
    });
  }

  playAnims() {
    const stateName = this.stateMachine.getCurrentState();
    if (!stateName) return;

    const [group, name] = stateName.split(".");

    if (group === States.Ground.NAME) {
      const vx = this.sprite.body.velocity.x;
      if (vx > 0) this.sprite.setFlipX(false);
      else if (vx < 0) this.sprite.setFlipX(true);

      switch (name) {
        case States.Ground.IDLE:
          this.sprite.anims.play("idle", true);
          break;
        case States.Ground.WALK:
        case States.Ground.RUN:
        case States.Ground.RUNAWHILE:
        case States.Ground.RELEASE:
          this.sprite.anims.play(Math.abs(vx) < this.smbPhysics.velocities.maxRun - 1 ? "walk" : "run", true);
          break;
        case States.Ground.SKID:
          this.sprite.anims.play("skid", true);
        default:
          break;
      }
    } else if (group === States.Air.NAME) {
      switch (name) {
        case States.Air.JUMP:
          this.sprite.anims.play("jump", true);
          break;
        case States.Air.FALL:
          // 掉落时动画定格某一帧
          this.sprite.anims.stop();
          break;
        default:
          break;
      }
    }
  }

  groundOnEnter() {
    this.sprite.setGravityY(this.smbPhysics.vertical.stage_0.falling_gy);
  }

  private skidDirection = 0;
  groundOnUpdate(dt: number) {
    if (!this.sprite.body.onFloor()) {
      this.stateMachine.setState(States.Air.NAME);
      return;
    }

    const vx = this.sprite.body.velocity.x;
    const vx_abs = Math.abs(vx);

    const sameDirection = (vx <= 0 && this.horizontalKeyDirection < 0) || (vx >= 0 && this.horizontalKeyDirection > 0);

    if (this.horizontalKeyDirection !== 0) {
      // 施加横向力
      if (sameDirection) {
        // 速度与加速度同向

        // 开始行动的最小初速度速度
        let minWalkV = this.smbPhysics.velocities.minWalk;
        if (
          this.stateMachine.isCurrentState(States.Ground.SKID, States.Ground.NAME) &&
          this.skidDirection !== this.horizontalKeyDirection
        ) {
          // 打滑未完成（打滑没有把速度降至0），继续walk或者run，有一个最小skidTrunaround速度
          minWalkV = this.smbPhysics.velocities.skidTrunaround;
        }

        if (vx_abs < minWalkV) {
          this.sprite.setVelocityX(this.horizontalKeyDirection * minWalkV);
        }

        if (this.keys.buttonB.isDown) {
          // RUN
          this.stateMachine.setState(States.Ground.RUN, States.Ground.NAME);
        } else if (this.stateMachine.isCurrentState(States.Ground.RUN, States.Ground.NAME)) {
          // 'RUN' 不会直接变成 'WALK', 中间最多存在 10 frames 的 'RUNAWHILE'
          this.stateMachine.setState(
            States.Ground.RUNAWHILE,
            States.Ground.NAME,
            this.smbPhysics.keepingTimeWhenRunningToWalking,
            States.Ground.WALK,
            States.Ground.NAME
          );
        } else if (this.stateMachine.isCurrentState(States.Ground.RUNAWHILE, States.Ground.NAME)) {
          // 如果当前状态是 RUNAWHILE, 不能被下面的 WALK 状态打断
        } else {
          // WALK
          this.stateMachine.setState(States.Ground.WALK, States.Ground.NAME);
        }
      } else {
        // 速度与加速度不同向
        // SKID
        this.stateMachine.setState(States.Ground.SKID, States.Ground.NAME);
      }
    } else {
      // 无横向力作用
      this.sprite.setAccelerationX(0);
      if (vx === 0) {
        // IDLE
        this.stateMachine.setState(States.Ground.IDLE, States.Ground.NAME);
      } else if (!this.stateMachine.isCurrentState(States.Ground.SKID, States.Ground.NAME)) {
        // RELEASE
        this.stateMachine.setState(States.Ground.RELEASE, States.Ground.NAME);
      }
    }
  }

  walkOnEnter() {
    this.sprite.body.maxVelocity.x = this.smbPhysics.velocities.maxWalk;
    this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.accelerations.walk);
  }

  runOnEnter() {
    this.sprite.body.maxVelocity.x = this.smbPhysics.velocities.maxRun;
    this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.accelerations.run);
  }

  runAWhileOnEnter() {
    this.sprite.body.maxVelocity.x = Math.max(
      Math.abs(this.sprite.body.velocity.x),
      this.smbPhysics.velocities.maxWalk
    );
  }

  skidOnEnter() {
    this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.decelerations.skid);
  }

  skidOnUpdate() {
    if (this.horizontalKeyDirection === 0) {
      // 即使没有横向力了，打滑也要继续，直到速度为0
      this.sprite.setDragX(this.smbPhysics.decelerations.skid);
    }
  }

  releaseOnEnter() {
    this.sprite.setDragX(this.smbPhysics.decelerations.release);
  }

  private startedJumpSpeed = 0;
  airOnUpdate() {
    if (this.sprite.body.onFloor()) {
      this.stateMachine.setState(States.Ground.NAME);
      return;
    }

    this.sprite.setDragX(0);

    const vx = this.sprite.body.velocity.x;
    const vy = this.sprite.body.velocity.y;
    const vx_abs = Math.abs(vx);

    if (vy >= 0) {
      this.stateMachine.setState(States.Air.FALL, States.Air.NAME);
    }

    // 处理水平方向速度。代码也可以分成两个状态机，一个处理水平方向速度的状态机，一个处理垂直方向速度的状态机
    if (this.horizontalKeyDirection !== 0) {
      const sameDirection =
        (vx <= 0 && this.horizontalKeyDirection < 0) || (vx >= 0 && this.horizontalKeyDirection > 0);

      if (sameDirection) {
        // 速度与加速度同向
        if (vx_abs < this.smbPhysics.velocities.maxWalk) {
          this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.accelerations.walk);
        } else {
          this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.accelerations.run);
        }
      } else {
        // 速度与加速度不同向
        if (vx_abs < this.smbPhysics.velocities.maxWalk) {
          if (this.startedJumpSpeed < this.smbPhysics.air.V_01D00) {
            this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.accelerations.walk);
          } else {
            // 当你的速度小于0x1900(maxWalk)，但起跳时的速度超过了0x01D00时，会给你一个比walk acceleration更大的加速度
            // 简单的说就是往回拉得更快
            this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.air.A_000D0);
          }
        } else {
          this.sprite.setAccelerationX(this.horizontalKeyDirection * this.smbPhysics.accelerations.run);
        }
      }
    } else {
      this.sprite.setAccelerationX(0);
    }
  }

  private jumpStage = 0;
  jumpOnEnter() {
    const vx = this.sprite.body.velocity.x;

    this.startedJumpSpeed = Math.abs(vx);

    const vx_abs = Math.abs(vx);
    if (vx_abs < this.smbPhysics.vertical.stage_0.max_vx) {
      // console.log("stage 1");
      this.jumpStage = 1;
      this.sprite.setVelocityY(-this.smbPhysics.vertical.stage_0.initial_vy);
      this.sprite.setGravityY(this.smbPhysics.vertical.stage_0.holdingA_gy);
    } else if (vx_abs < this.smbPhysics.vertical.stage_1.max_vx) {
      // console.log("stage 2");
      this.jumpStage = 2;
      this.sprite.setVelocityY(-this.smbPhysics.vertical.stage_1.initial_vy);
      this.sprite.setGravityY(this.smbPhysics.vertical.stage_1.holdingA_gy);
    } else {
      // console.log("stage 3");
      this.jumpStage = 3;
      // stage_2.initial_vy 大于 downMax, 先将垂直速度上限调高
      this.sprite.body.maxVelocity.y = this.smbPhysics.vertical.stage_2.initial_vy;
      this.sprite.setVelocityY(-this.smbPhysics.vertical.stage_2.initial_vy);
      this.sprite.setGravityY(this.smbPhysics.vertical.stage_2.holdingA_gy);
    }
  }

  jumpOnUpdate() {
    if (this.keys.buttonA.isUp) {
      // 在空中长按A松开后
      this.stateMachine.setState(States.Air.FALL, States.Air.NAME);
    }
  }

  fallOnEnter() {
    this.sprite.body.maxVelocity.y = this.smbPhysics.vertical.downwardMax;
    if (this.jumpStage === 1) {
      this.sprite.setGravityY(this.smbPhysics.vertical.stage_0.falling_gy);
    } else if (this.jumpStage === 2) {
      this.sprite.setGravityY(this.smbPhysics.vertical.stage_1.falling_gy);
    } else if (this.jumpStage === 3) {
      this.sprite.setGravityY(this.smbPhysics.vertical.stage_2.falling_gy);
    }
  }
}
