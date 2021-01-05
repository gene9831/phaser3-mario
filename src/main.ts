import Phaser from "phaser";

import MainScene from "./scenes/MainScene";

const config: Phaser.Types.Core.GameConfig = {
  parent: "phaser3-game",
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  audio: {
    disableWebAudio: true,
  },
  scale: {
    autoCenter: Phaser.Scale.Center.CENTER_HORIZONTALLY,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
      gravity: { y: 2000 },
    },
  },
  scene: [MainScene],
};

export default new Phaser.Game(config);
