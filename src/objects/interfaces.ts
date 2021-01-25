interface Trampable {
  trampled(sprite: Phaser.Physics.Arcade.Sprite): void;
}

interface Pushable {
  pushed(block: Phaser.Physics.Arcade.Image): void;
}

interface Hitable {
  hit(sparkOrShell: any): void;
}

export { Trampable, Pushable, Hitable };
