export class SMBPhysics {
  // 参考资料：（https://web.archive.org/web/20130807122227/http://i276.photobucket.com/albums/kk21/jdaster64/smb_playerphysics.png）。Super mario bros中一个block是16个pixcel
  private readonly frameRate = 0x3c;
  // 10 frames, 转成ms
  readonly keepingTimeWhenRunningToWalking = (1000 * 10) / this.frameRate;
  private readonly originalBlockPixel = 0x10;
  private times = 1;

  readonly velocities: {
    minWalk: number;
    maxWalk: number;
    maxWalkUnderWater: number;
    maxWalkLevelEntry: number;
    maxRun: number;
    skidTrunaround: number;
  };

  readonly accelerations: {
    walk: number;
    run: number;
  };

  readonly decelerations: {
    release: number;
    skid: number;
  };

  readonly vertical: {
    downwardMax: number;
    initial_vx_0: {
      lessThan_vx: number;
      initial_vy: number;
      holdingA_gy: number;
      falling_gy: number;
    };
    initial_vx_1: {
      lessThan_vx: number;
      initial_vy: number;
      holdingA_gy: number;
      falling_gy: number;
    };
    initial_vx_2: {
      initial_vy: number;
      holdingA_gy: number;
      falling_gy: number;
    };
    initial_vx_levelEntry: {
      initial_vy: number;
      holdingA_gy: number;
      falling_gy: number;
    };
  };

  constructor(blockPixel?: number) {
    if (blockPixel && blockPixel > 0) {
      this.times = blockPixel / this.originalBlockPixel;
    }

    this.velocities = {
      minWalk: this.transformVelocity(0x130),
      maxWalk: this.transformVelocity(0x1900),
      maxWalkUnderWater: this.transformVelocity(0x1100),
      maxWalkLevelEntry: this.transformVelocity(0xd00),
      maxRun: this.transformVelocity(0x2900),
      skidTrunaround: this.transformVelocity(0x900),
    };

    this.accelerations = {
      walk: this.transformAcceleration(0x98),
      run: this.transformAcceleration(0xe4),
    };

    this.decelerations = {
      release: this.transformAcceleration(0xd0),
      skid: this.transformAcceleration(0x1a0),
    };

    this.vertical = {
      downwardMax: this.transformVelocity(0x4000),
      initial_vx_0: {
        lessThan_vx: this.transformVelocity(0x1000),
        initial_vy: this.transformVelocity(0x4000),
        holdingA_gy: this.transformAcceleration(0x200),
        falling_gy: this.transformAcceleration(0x700),
      },
      initial_vx_1: {
        lessThan_vx: this.transformVelocity(0x2500),
        initial_vy: this.transformVelocity(0x4000),
        holdingA_gy: this.transformAcceleration(0x1e0),
        falling_gy: this.transformAcceleration(0x600),
      },
      initial_vx_2: {
        initial_vy: this.transformVelocity(0x5000),
        holdingA_gy: this.transformAcceleration(0x280),
        falling_gy: this.transformAcceleration(0x900),
      },
      initial_vx_levelEntry: {
        initial_vy: this.transformVelocity(0x0),
        holdingA_gy: this.transformAcceleration(0x280),
        falling_gy: this.transformAcceleration(0x280),
      },
    };
  }

  /**
   * 单位换算成pixel/s
   * @param velocity 5位16进制，分别表示blocks, pixels, sub-pixels, ss-pixels, sss-pixels. 每个都是前一个的1/16.
   */
  transformVelocity = (velocity: number) => {
    return (((velocity * this.frameRate) >> 8) / 16) * this.times;
  };

  /**
   * 单位换算成pixel/(s^2)
   * @param acceleration 5位16进制，分别表示blocks, pixels, sub-pixels, ss-pixels, sss-pixels. 每个都是前一个的1/16. Super mario bros中一个block是16个pixcel
   */
  transformAcceleration = (acceleration: number) => {
    return (((acceleration * this.frameRate * this.frameRate) >> 8) / 16) * this.times;
  };
}

/**
 *
 */
