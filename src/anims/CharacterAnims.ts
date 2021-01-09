const createMarioAnims = (anims: Phaser.Animations.AnimationManager) => {
  anims.create({
    key: "idle",
    frames: [{ key: "mario", frame: "mario-idle-0" }],
    frameRate: 20,
  });
  anims.create({
    key: "walk",
    frames: anims.generateFrameNames("mario", { start: 0, end: 2, prefix: "mario-walk-" }),
    frameRate: 8,
    repeat: -1,
  });
  anims.create({
    key: "run",
    frames: anims.generateFrameNames("mario", { start: 0, end: 2, prefix: "mario-walk-" }),
    frameRate: 16,
    repeat: -1,
  });
  anims.create({
    key: "skid",
    frames: [{ key: "mario", frame: "mario-skid-0" }],
    frameRate: 20,
  });
  anims.create({
    key: "jump",
    frames: [{ key: "mario", frame: "mario-jump-0" }],
    frameRate: 20,
  });
};

export { createMarioAnims };
