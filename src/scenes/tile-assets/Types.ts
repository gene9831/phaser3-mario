export type TileMapConfig = {
  key: string;
  tilesetIndex: number[];
};

export type TilesetConfig = {
  defaultName: string;
  key: string;
};

export type TileMapData = {
  tilemapConfigs: TileMapConfig[];
  tilesetConfigs: TilesetConfig[];
};
