import { BLOCK_PIXELS } from "~/constants";
import { BaseSprite } from "~/objects/BaseSprite";
import { objectConfigs } from "./constants";
import { SpawnConfig } from "./Types";

export default class SpawnManager extends Phaser.Plugins.ScenePlugin {
  readonly spawnConfigs = new Array<SpawnConfig>();
  readonly spawnOnCollisionConfigs = new Array<SpawnConfig>();

  readonly spawnedSprites = {
    items: new Array<BaseSprite>(),
    enemies: new Array<BaseSprite>(),
    others: new Array<BaseSprite>(),
  };

  private interactiveSprite?: Phaser.GameObjects.Sprite;

  readonly spawnDistance = BLOCK_PIXELS * 14;
  readonly destoryDistance = BLOCK_PIXELS * 32;

  constructor(scene: Phaser.Scene, pluginManager: Phaser.Plugins.PluginManager) {
    super(scene, pluginManager);

    if (!scene.sys.settings.isBooted) {
      scene.sys.events.once("boot", this.boot, this);
    }
  }

  //  Called when the Plugin is booted by the PluginManager.
  //  If you need to reference other systems in the Scene (like the Loader or DisplayList) then set-up those references now, not in the constructor.
  boot() {
    const eventEmitter = this.systems.events;

    eventEmitter.on("update", this.update, this);
    eventEmitter.on("shutdown", this.shutdown, this);
    eventEmitter.on("destroy", this.destroy, this);
  }

  init(data: {
    tilemap: Phaser.Tilemaps.Tilemap;
    blocksLayer: Phaser.Tilemaps.TilemapLayer;
    interactiveSprite: Phaser.GameObjects.Sprite;
  }) {
    const { tilemap, blocksLayer, interactiveSprite } = data;

    this.interactiveSprite = interactiveSprite;

    tilemap.objects.forEach((objectLayer) => {
      objectLayer.objects.forEach((object) => {
        if (object.gid) {
          const gid = object.gid;
          // 找出对应的 tileset
          const tileset = tilemap.tilesets.find((t) => gid >= t.firstgid && gid < t.firstgid + t.total);

          if (!tileset) return;

          const tileid = gid - tileset.firstgid;
          const key = tileset.tileProperties[tileid].key || object.name;

          if (!key) return;

          // push spawn config
          const spawnConfig = this.createSpawnConfig(key, object, tileset);
          if (spawnConfig) {
            if (blocksLayer.getTileAtWorldXY(spawnConfig.spawnX, spawnConfig.spawnY)) {
              this.spawnOnCollisionConfigs.push(spawnConfig);
            } else {
              this.spawnConfigs.push(spawnConfig);
            }
          }
        }
      });
    });

    this.scene.physics.add.collider(this.spawnedSprites.enemies, this.spawnedSprites.enemies);
  }

  update(time: number, delta: number) {
    if (!this.interactiveSprite) return;

    const spriteX = this.interactiveSprite.x;
    const spriteY = this.interactiveSprite.y;

    for (let key in this.spawnedSprites) {
      const sprites: Array<BaseSprite> = this.spawnedSprites[key];
      for (let i = sprites.length - 1; i >= 0; i--) {
        const sprite = sprites[i];

        if (
          sprite.x < spriteX - this.destoryDistance ||
          sprite.x > spriteX + this.destoryDistance ||
          sprite.y < spriteY - this.destoryDistance ||
          sprite.y > spriteY + this.destoryDistance
        ) {
          sprite.destroy();
          sprites.splice(i, 1);
        } else {
          sprite.update(time, delta);
        }
      }
    }

    for (let i = this.spawnConfigs.length - 1; i >= 0; i--) {
      const spawnConfig = this.spawnConfigs[i];
      if (
        spawnConfig.spawnX >= spriteX - this.spawnDistance &&
        spawnConfig.spawnX <= spriteX + this.spawnDistance &&
        spawnConfig.spawnY >= spriteY - this.spawnDistance &&
        spawnConfig.spawnY <= spriteY + this.spawnDistance
      ) {
        if (!spawnConfig.spawned) {
          // 生成
          const sprite = spawnConfig.Factory.create(
            this.scene,
            spawnConfig.spawnX,
            spawnConfig.spawnY,
            spawnConfig.tileset.image.key,
            spawnConfig.gid - spawnConfig.tileset.firstgid
          ).setDepth(-1);

          if (sprite.objType === "item") {
            this.spawnedSprites.items.push(sprite);
          } else if (sprite.objType === "enemy") {
            this.spawnedSprites.enemies.push(sprite);
          } else {
            this.spawnedSprites.others.push(sprite);
          }
          spawnConfig.sprite = sprite;

          if (spawnConfig.repeat) {
            // repeat 不为 0, 可重复生成
            spawnConfig.spawned = true;

            if (spawnConfig.repeat > 0) {
              spawnConfig.repeat -= 1;
            }
          } else {
            // 最后一次生成，可以移除了
            this.spawnConfigs.splice(i, 1);
          }
        }
      } else {
        // 距离太远，且 sprite 被 destroy，重置出生点
        if (!spawnConfig.sprite?.body) {
          spawnConfig.spawned = false;
        }
      }
    }
  }

  //  Called when a Scene shuts down, it may then come back again later (which will invoke the 'start' event) but should be considered dormant.
  shutdown() {}

  //  Called when a Scene is destroyed by the Scene Manager. There is no coming back from a destroyed Scene, so clear up all resources here.
  destroy() {
    this.shutdown();

    for (let key in this.spawnedSprites) {
      const sprites: Array<BaseSprite> = this.spawnedSprites[key];
      sprites.forEach((sprite) => sprite.destroy());
    }

    super.destroy();
  }

  createSpawnConfig(
    key: string,
    tiledObject: Phaser.Types.Tilemaps.TiledObject,
    tileset: Phaser.Tilemaps.Tileset
  ): SpawnConfig | undefined {
    const gid = tiledObject.gid || -1;
    const width = tiledObject.width || 0;
    const height = tiledObject.height || 0;

    let spawnX = (tiledObject.x || 0) + width / 2;
    let spawnY = (tiledObject.y || 0) - height / 2;

    const config = objectConfigs[key];

    if (gid < 0 || !config) {
      console.warn(`no spawn config for key '${key}'`);
      return;
    }

    return {
      key,
      tiledObject,
      tileset,
      gid,
      spawnX,
      spawnY,
      spawned: false,
      ...config,
    };
  }

  spawnOnCollision(index: number) {
    const spawnConfig = this.spawnOnCollisionConfigs[index];

    const sprite = spawnConfig.Factory.create(
      this.scene,
      spawnConfig.spawnX,
      spawnConfig.spawnY,
      spawnConfig.tileset.image.key,
      spawnConfig.gid - spawnConfig.tileset.firstgid,
      true
    ).setDepth(-1);

    if (sprite.objType === "item") {
      this.spawnedSprites.items.push(sprite);
    } else if (sprite.objType === "enemy") {
      this.spawnedSprites.enemies.push(sprite);
    } else {
      this.spawnedSprites.others.push(sprite);
    }
    spawnConfig.sprite = sprite;

    // 通过顶砖块生成的 object 只能生成一次
    this.spawnOnCollisionConfigs.splice(index, 1);
  }
}
