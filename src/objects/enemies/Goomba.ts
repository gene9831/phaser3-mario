import { VAValues } from "~/constants";
import { BaseSprite } from "../BaseSprite";

class Goomba extends BaseSprite {
  private dieCountDown = -1;

  init() {
    this.setSize(24, 32)
      .setBounceX(1)
      .setMaxVelocity(Infinity, VAValues.v_downMax)
      .addRect1(24, 14)
      .setData("spriteType", "enemy")
      .play(this.key, true);

    if (this.insideBlock) {
      this.setScale(0, 1);
    }
  }

  start() {
    this.setGravityY(VAValues.gravity)
      .setVelocityX(-(VAValues.enemies.goomba.v_x || 0))
      .setDepth(1);
  }

  update(t: number, dt: number) {
    super.update(t, dt);

    if (this.dieCountDown > 0) {
      this.dieCountDown -= 1;
      if (this.dieCountDown <= 0) {
        this.destroy();
      }
    }
  }

  trampled(sprite: Phaser.Physics.Arcade.Sprite): void {
    super.trampled(sprite);
    const dieid: number | undefined = this.getData("tileProperties")?.dieid;
    this.setImmovable(true).stop().body.stop();
    if (dieid) {
      this.setFrame(dieid);
    }
    if (this.rect1) this.rect1.body.checkCollision.none = true;
    if (this.rect2) this.rect2.body.checkCollision.none = true;
    this.dieCountDown = 40;
  }

  pushed(block: Phaser.Physics.Arcade.Image): void {
    super.pushed(block);
    const direct = (block.getData("collisionPoint")?.x || 0) > block.body.center.x ? -1 : 1;
    this.body.checkCollision.none = true;
    if (this.rect1) this.rect1.body.checkCollision.none = true;
    if (this.rect2) this.rect2.body.checkCollision.none = true;
    this.stop()
      .setFlipY(true)
      .setVelocity(direct * (VAValues.enemies.goomba.v_x_die || 0), -(VAValues.enemies.goomba.v_y_die || 0));
  }
}

class GoombaFactory {
  static create(
    scene: Phaser.Scene,
    key: string,
    x: number,
    y: number,
    textureKey: string,
    frame?: string | number,
    insideBlock?: boolean
  ) {
    return new Goomba(scene, key, x, y, textureKey, frame, insideBlock);
  }
}

export { GoombaFactory };
