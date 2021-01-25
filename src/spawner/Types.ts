import { BaseSprite } from "~/objects/BaseSprite";

interface ObjectFactory {
  create(
    scene: Phaser.Scene,
    key: string,
    x: number,
    y: number,
    textureKey: string,
    frame?: string | number,
    insideBlock?: boolean
  ): BaseSprite;
}

type ObjectConfig = {
  Factory: ObjectFactory;
  repeat?: number;
};

type SpawnConfig = {
  key: string;
  tileid: number;
  tiledObject: Phaser.Types.Tilemaps.TiledObject;
  tileset: Phaser.Tilemaps.Tileset;
  gid: number;
  spawnX: number;
  spawnY: number;
  spawned: boolean;
  sprite?: BaseSprite;
} & ObjectConfig;

export { ObjectConfig, ObjectFactory, SpawnConfig };
