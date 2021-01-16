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

export default class TileMapLoader extends Phaser.Scene {
  private tilesetKeys: string[] = [];

  private tilemaps: TileMapConfig[] = [];

  constructor() {
    super("tilemap-loader");
  }

  init(data: any) {
    // 无需后缀 .png
    this.tilesetKeys = ["tiles/overworld", "tiles/underground", "tiles/genral"];

    // 无需后缀 .json
    this.tilemaps.push({
      key: "tilemap/level-1-1",
      tilesetIndex: [0, 1, 2],
    });
  }

  preload() {
    // 加载 tileset
    this.tilesetKeys.forEach((key) => {
      this.load.spritesheet({
        key: key,
        frameConfig: {
          margin: 2,
          spacing: 2,
          frameWidth: 32,
          frameHeight: 32,
        },
      });
    });

    // 加载 tilemap
    this.tilemaps.forEach((tilemapConfig) => {
      this.load.tilemapTiledJSON(tilemapConfig.key);
    });
  }

  create() {
    this.scene.start("level-1-1", {
      tilemapConfigs: this.tilemaps,
      tilesetConfigs: this.tilesetKeys.map(
        (key) =>
          ({
            defaultName: this.getDefaultTilesetName(key),
            key: key,
          } as TilesetConfig)
      ),
    } as TileMapData);
  }

  private getDefaultTilesetName(tilesetKey: string): string {
    return tilesetKey.slice(tilesetKey.lastIndexOf("/") + 1);
  }
}
