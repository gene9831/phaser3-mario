import { BLOCK_PIXELS, VAValues } from "~/constants";
import { BaseSprite } from "../BaseSprite";

class MagicMushroom extends BaseSprite {
  init() {
    this.setSize(26, 32).setBounceX(1).setMaxVelocity(Infinity, VAValues.v_downMax).setData("spriteType", "item");

    this.addRect1(26, 26, undefined, -3);
  }

  growUp(t: number, dt: number) {
    if (this.growLength === 0) {
      this.y -= (1 / 4) * BLOCK_PIXELS;
      this.growLength += 1 / 4;
    } else {
      this.y -= (1 / 64) * BLOCK_PIXELS;
      this.growLength += 1 / 64;
    }

    if (this.growLength >= 1) {
      this.postGrowUp();
    }
  }

  start() {
    this.setGravityY(VAValues.gravity)
      .setVelocityX(VAValues.items.magicMushroom.v_x || 0)
      .setDepth(1);
  }

  update(t: number, dt: number) {
    super.update(t, dt);
  }

  pushed(block: Phaser.Physics.Arcade.Image): void {
    this.setVelocityY(-VAValues.v_downMax);

    if (this.x < block.getCenter().x) {
      this.setVelocityX(-this.body.velocity.x);
    }
  }
}

class MagicMushroomFactory {
  static create(
    scene: Phaser.Scene,
    key: string,
    x: number,
    y: number,
    textureKey: string,
    frame?: string | number,
    insideBlock?: boolean
  ) {
    return new MagicMushroom(scene, key, x, y, textureKey, frame, insideBlock);
  }
}

export { MagicMushroomFactory };
