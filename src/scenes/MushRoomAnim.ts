export default class MushRoomAnim {
  private items: Array<{
    targetY: number;
    mushroom: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  }> = [];

  private vx = 115;
  private frames = 64;

  constructor(
    mushroom?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]
  ) {
    if (Array.isArray(mushroom)) {
      mushroom.forEach((m) => {
        this.add(m);
      });
    } else if (mushroom) {
      this.add(mushroom);
    }
  }

  add(mushroom: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    this.items.push({
      targetY: mushroom.y - mushroom.height,
      mushroom: mushroom,
    });
  }

  update(t: number, dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const mushroom = this.items[i].mushroom;
      if (mushroom.y > this.items[i].targetY) {
        mushroom.setActive(true).setVisible(true);
        mushroom.y -= mushroom.height / this.frames;
      } else {
        mushroom.setVelocityX(this.vx).body.setAllowGravity(true);
        this.items.splice(i, 1);
      }
    }
  }
}
