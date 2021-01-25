import { BLOCK_PIXELS, VAValues } from "~/constants";
import { Hitable, Pushable, Trampable } from "./interfaces";
import SpriteRect from "./SpriteRect";

type RectCollisions = {
  [key: string]: boolean | undefined;
  ignoreSpriteBody?: boolean;
};

class BaseSprite extends Phaser.Physics.Arcade.Sprite implements Pushable, Trampable, Hitable {
  readonly key: string;
  readonly insideBlock?: boolean;

  rect1?: SpriteRect;
  rect2?: SpriteRect;
  rectCollisions: RectCollisions = {};

  protected growing: boolean = false;
  protected growLength = 0;
  protected growLengthDelta = 1 / 8;

  constructor(
    scene: Phaser.Scene,
    key: string,
    x: number,
    y: number,
    texture: string | Phaser.Textures.Texture,
    frame?: string | number,
    insideBlock?: boolean
  ) {
    super(scene, x, y, texture, frame);
    this.key = key;
    this.insideBlock = insideBlock;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.init();

    this.debugBodyColor = 0xffffff;

    if (insideBlock) {
      // preGrowUp -> gorwUp -> postGrowUp -> start
      this.preGrowUp();
    } else {
      this.start();
    }
  }

  init() {}

  preGrowUp() {
    this.growing = true;
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setAllowGravity(false);
    }
  }

  growUp(t: number, dt: number) {
    this.y -= this.growLengthDelta * BLOCK_PIXELS;
    this.growLength += this.growLengthDelta;

    // 生长帧时长: 192 / 8 = 24
    this.growLengthDelta -= 1 / 192;

    if (this.growLength < 1) {
      this.scaleX = this.growLength;
      this.setScale(this.growLength, 1);
    } else {
      this.setScale(1, 1);
    }

    if (this.growLength >= 1.5) {
      this.postGrowUp();
    }
  }

  postGrowUp() {
    this.growing = false;
    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setAllowGravity(true);
    }

    this.start();
  }

  start() {}

  update(t: number, dt: number) {
    super.update(t, dt);
    if (this.growing) {
      this.growUp(t, dt);
    }
  }

  postUpdate(t: number, dt: number) {
    this.rect1?.postUpdate(t, dt);
    this.rect2?.postUpdate(t, dt);
  }

  destroy() {
    super.destroy();
    this.rect1?.destroy();
    this.rect2?.destroy();
  }

  setScale(x: number, y?: number) {
    super.setScale(x, y);
    this.rect1?.setScale(x, y);
    this.rect2?.setScale(x, y);

    return this;
  }

  addRect1(width: number, height: number, offsetX: number = 0, offsetY: number = 0) {
    const rect = new SpriteRect(this.scene, this, this.x, this.y, width, height);

    (rect.body as Phaser.Physics.Arcade.Body).offset.x += offsetX;
    (rect.body as Phaser.Physics.Arcade.Body).offset.y += offsetY;

    this.rect1 = rect;

    return this;
  }

  addRect2(width: number, height: number, offsetX: number = 0, offsetY: number = 0) {
    const rect = new SpriteRect(this.scene, this, this.x, this.y, width, height);

    (rect.body as Phaser.Physics.Arcade.Body).offset.x += offsetX;
    (rect.body as Phaser.Physics.Arcade.Body).offset.y += offsetY;

    this.rect2 = rect;

    return this;
  }

  addRectCollisions(rectCollisions: RectCollisions) {
    this.rectCollisions = { ...rectCollisions, ...this.rectCollisions };
    return this;
  }

  pushed(block: Phaser.Physics.Arcade.Image): void {}

  trampled(sprite: Phaser.Physics.Arcade.Sprite): void {
    sprite.setVelocityY(-(VAValues.characters.mario.v_trample || 0));
  }

  hit(sparkOrShell: any): void {}
}

export { BaseSprite };
