import { VAValues } from "~/constants";
import { BaseSprite } from "../BaseSprite";

class Goomba extends BaseSprite {
  readonly objType = "enemy";

  init() {
    this.setSize(24, 32)
      .setBounceX(1)
      .setMaxVelocity(Infinity, VAValues.v_downMax)
      .setGravityY(VAValues.gravity)
      .setVelocityX(-(VAValues.enemies.goomba.v_x || 0));
  }
}

class GoombaFactory {
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    key: string,
    frame?: string | number,
    insideBlock?: boolean
  ) {
    return new Goomba(scene, x, y, key, frame, insideBlock);
  }
}

export { GoombaFactory };
