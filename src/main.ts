import Phaser from "phaser";

import MainScene from "./scenes/MainScene";
import { TileMapLoader, TilesetLoader } from "./scenes/tile-assets/Loaders";
import { SMBPhysics } from "./smb-physics";
import "./constants";

const gSmbPhysics = new SMBPhysics(32);
console.log(gSmbPhysics);

const config: Phaser.Types.Core.GameConfig = {
  parent: "phaser3-game",
  type: Phaser.AUTO,
  width: 1024,
  height: 480,
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
    },
  },
  scene: [TileMapLoader, TilesetLoader, MainScene],
};

export { gSmbPhysics };
export default new Phaser.Game(config);
