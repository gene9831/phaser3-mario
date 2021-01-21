import { BaseSprite } from "~/objects/BaseSprite";

interface ObjectFactory {
  create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    key: string,
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
  tiledObject: Phaser.Types.Tilemaps.TiledObject;
  tileset: Phaser.Tilemaps.Tileset;
  readonly gid: number;
  readonly spawnX: number;
  readonly spawnY: number;
  spawned: boolean;
  sprite?: BaseSprite
} & ObjectConfig;

export { ObjectConfig, ObjectFactory, SpawnConfig };
