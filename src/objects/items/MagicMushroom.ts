import { BLOCK_PIXELS, VAValues } from "~/constants";
import { BaseSprite } from "../BaseSprite";

class MagicMushroom extends BaseSprite {
  readonly objType = "item";

  protected growUpElapsedFrames = 0;

  init() {
    this.setSize(28, 32).setBounceX(1).setMaxVelocity(Infinity, VAValues.v_downMax).setGravityY(VAValues.gravity);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  growedUp() {
    this.setVelocityX(VAValues.items.magicMushroom.v_x || 0);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
  }

  growUp(t: number, dt: number) {
    if (this.growUpElapsedFrames === 0) {
      this.y -= (1 / 4) * BLOCK_PIXELS;
    } else {
      this.y -= (1 / 64) * BLOCK_PIXELS;
    }

    this.growUpElapsedFrames += 1;

    if (this.growUpElapsedFrames >= 49) {
      this.growing = false;
      this.growedUp();
    }
  }

  update(t: number, dt: number) {
    super.update(t, dt);
  }
}

class MagicMushroomFactory {
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    key: string,
    frame?: string | number,
    insideBlock?: boolean
  ) {
    return new MagicMushroom(scene, x, y, key, frame, insideBlock);
  }
}

export { MagicMushroomFactory };
