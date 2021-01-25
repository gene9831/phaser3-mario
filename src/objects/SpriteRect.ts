import { BaseSprite } from "./BaseSprite";

export default class SpriteRect extends Phaser.GameObjects.Rectangle {
  readonly parent: BaseSprite;
  body!: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, parent: BaseSprite, x: number, y: number, width?: number, height?: number) {
    super(scene, x, y, width, height);
    this.parent = parent;

    this.scene.physics.add.existing(this);

    this.body = this.body as Phaser.Physics.Arcade.Body;
    this.body.setImmovable(true).debugBodyColor = 0x0000ff;
  }

  postUpdate(t: number, dt: number) {
    // 补偿一帧。因为设置 x, y 只能在下一帧生效
    this.x = this.parent.x + (this.parent.body.velocity.x * dt) / 1000;
    this.y = this.parent.y + (this.parent.body.velocity.y * dt) / 1000;
  }
}
