import Phaser from "phaser";

import MainScene from "./scenes/MainScene";
import TileMapLoader from "./scenes/TileMapLoader";
import { SMBPhysics } from "./smb-physics";

const gSmbPhysics = new SMBPhysics(32);
console.log(gSmbPhysics);

const config: Phaser.Types.Core.GameConfig = {
  parent: "phaser3-game",
  type: Phaser.AUTO,
  width: 1024,
  height: 448,
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
      gravity: { y: 1500 },
    },
  },
  scene: [TileMapLoader, MainScene],
};

export { gSmbPhysics };
export default new Phaser.Game(config);
