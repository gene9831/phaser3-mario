import { TileMapConfig } from "./Types";

const tileAssets: {
  tilesetKeys: string[];
  tilemapConfigs: TileMapConfig[];
} = {
  // 不需要加后缀 .png 或 .json

  tilesetKeys: [
    "tilesets/overworld",
    "tilesets/underground",
    "tilesets/underwater",
    "tilesets/castle",
    "tilesets/alternative",
    "tilesets/genral",
    "tilesets/enemies-1",
  ],

  tilemapConfigs: [
    {
      key: "tilemaps/level-1-1",
      tilesetIndex: [0, 1, 5, 6],
    },
  ],
};

export { tileAssets };
