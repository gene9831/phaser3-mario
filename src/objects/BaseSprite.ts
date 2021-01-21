import { BLOCK_PIXELS } from "~/constants";

class BaseSprite extends Phaser.Physics.Arcade.Sprite {
  readonly objType?: "item" | "enemy";
  protected growing: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string | Phaser.Textures.Texture,
    frame?: string | number,
    insideBlock?: boolean
  ) {
    super(scene, x, y, texture, frame);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.init();

    if (insideBlock) {
      this.growing = true;
    } else {
      this.growedUp();
    }
  }

  init() {}

  growUp(t: number, dt: number) {
    this.x += BLOCK_PIXELS;
    this.growing = false;
    this.growedUp();
  }

  growedUp() {}

  update(t: number, dt: number) {
    if (this.growing) {
      this.growUp(t, dt);
    }
  }
}

export { BaseSprite };
