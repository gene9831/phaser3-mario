import { tileAssets } from "./constants";
import { TileMapConfig, TileMapData, TilesetConfig } from "./Types";

class TileMapLoader extends Phaser.Scene {
  private tilemapConfigs: TileMapConfig[];

  constructor() {
    super("tilemap-loader");

    this.tilemapConfigs = tileAssets.tilemapConfigs;
  }

  preload() {
    // 加载 tilemap
    this.tilemapConfigs.forEach((tilemapConfig) => {
      this.load.tilemapTiledJSON(tilemapConfig.key);
    });
  }

  create() {
    this.scene.start("tileset-loader", {
      tilemapConfigs: this.tilemapConfigs,
    });
  }
}

class TilesetLoader extends Phaser.Scene {
  private tilesetConfigs: TilesetConfig[];
  private keyLoaded: boolean[];

  private tilemapConfigs: TileMapConfig[] = [];

  constructor() {
    super("tileset-loader");

    this.tilesetConfigs = tileAssets.tilesetKeys.map((key) => ({
      defaultName: this.getDefaultTilesetName(key),
      key,
    }));

    this.keyLoaded = new Array(tileAssets.tilesetKeys.length).fill(false);
  }

  init(data: { tilemapConfigs: TileMapConfig[] }) {
    this.tilemapConfigs = data.tilemapConfigs;
  }

  preload() {
    const tilemapsData = this.cache.tilemap.entries.entries;

    this.tilemapConfigs.forEach((tilemapConfig) => {
      // 获取 tilemap 中 tileset 的一些参数，来正确加载 spritesheet
      // 加载 spritesheet 而不是 image 的目的是可以设置图像帧，方便将 tiledobject 转成 sprite
      const tilesetsData: {
        name: string;
        margin: number;
        spacing: number;
        tilewidth: number;
        tileheight: number;
      }[] = tilemapsData[tilemapConfig.key].data.tilesets;

      // 遍历 tilemapConfig 所需要的 tileset, 只加载需要的 tileset
      tilemapConfig.tilesetIndex.forEach((index) => {
        // 不重复加载
        if (this.keyLoaded[index]) return;

        const tilesetData = tilesetsData.find((tileset) => tileset.name === this.tilesetConfigs[index].defaultName);

        if (!tilesetData) return;

        this.load.spritesheet({
          key: this.tilesetConfigs[index].key,
          frameConfig: {
            margin: tilesetData.margin,
            spacing: tilesetData.spacing,
            frameWidth: tilesetData.tilewidth,
            frameHeight: tilesetData.tileheight,
          },
        });
        this.keyLoaded[index] = true;
      });
    });
  }

  create() {
    this.scene.start("level-1-1", {
      tilemapConfigs: this.tilemapConfigs,
      tilesetConfigs: this.tilesetConfigs,
    } as TileMapData);
  }

  private getDefaultTilesetName(tilesetKey: string): string {
    return tilesetKey.slice(tilesetKey.lastIndexOf("/") + 1);
  }
}

export { TileMapLoader, TilesetLoader };
