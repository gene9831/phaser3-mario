import { BLOCK_PIXELS } from "~/constants";
import { BaseSprite } from "~/objects/BaseSprite";
import { objectConfigs } from "./constants";
import { SpawnConfig } from "./Types";

export default class SpawnManager extends Phaser.Plugins.ScenePlugin {
  readonly spawnConfigs = new Array<SpawnConfig>();
  readonly spawnOnCollisionConfigs = new Array<SpawnConfig>();

  readonly spriteGroup: Phaser.GameObjects.Group;
  readonly spriteRectGroup: Phaser.GameObjects.Group;

  private collider?: Phaser.Physics.Arcade.Collider;

  private interactiveSprite?: Phaser.GameObjects.Sprite;

  // 这个机制要改。将地图划分为大地图块，相邻大地图块的精灵都产生
  readonly spawnDistance = BLOCK_PIXELS * 14;
  readonly destoryDistance = BLOCK_PIXELS * 32;

  constructor(scene: Phaser.Scene, pluginManager: Phaser.Plugins.PluginManager) {
    super(scene, pluginManager);

    this.spriteGroup = this.scene.add.group();
    this.spriteRectGroup = this.scene.add.group();

    if (!scene.sys.settings.isBooted) {
      scene.sys.events.once("boot", this.boot, this);
    }
  }

  boot() {
    const eventEmitter = this.systems.events;

    eventEmitter.on("update", this.update, this);
    eventEmitter.on("postupdate", this.postUpdate, this);
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

    // 遍历所有的 TiledObject
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
          const spawnConfig = this.createSpawnConfig(key, tileid, object, tileset);
          if (spawnConfig) {
            if (blocksLayer.getTileAtWorldXY(spawnConfig.spawnX, spawnConfig.spawnY)) {
              this.spawnOnCollisionConfigs.push(spawnConfig);
            } else {
              this.spawnConfigs.push(spawnConfig);
            }

            // create anims
            const tileAnimation: Array<{ tileid: number; duration: number }> | undefined =
              tileset.tileData[tileid]?.animation;

            if (!this.scene.anims.exists(spawnConfig.key) && tileAnimation) {
              this.scene.anims.create({
                key: spawnConfig.key,
                frames: tileAnimation.map((anim) => ({
                  key: tileset.image.key,
                  frame: anim.tileid,
                  duration: anim.duration,
                })),
                repeat: -1,
              });
            }
          }
        }
      });
    });

    // 敌人之间相互碰撞
    this.collider = this.scene.physics.add.collider(this.spriteGroup, this.spriteGroup, undefined, (obj1, obj2) => {
      const t1 = obj1.getData("spriteType");
      const t2 = obj2.getData("spriteType");

      return t1 === "enemy" && t2 === "enemy";
    });
  }

  update(time: number, delta: number) {
    if (!this.interactiveSprite) return;

    const spriteX = this.interactiveSprite.x;
    const spriteY = this.interactiveSprite.y;

    this.spriteGroup.getChildren().forEach((_child) => {
      const sprite = _child as BaseSprite;
      if (
        !sprite.body ||
        sprite.x < spriteX - this.destoryDistance ||
        sprite.x > spriteX + this.destoryDistance ||
        sprite.y < spriteY - this.destoryDistance ||
        sprite.y > spriteY + this.destoryDistance
      ) {
        this.spriteGroup.remove(_child);
        if (sprite.rect1) this.spriteRectGroup.remove(sprite.rect1);
        if (sprite.rect2) this.spriteRectGroup.remove(sprite.rect2);
        if (sprite.body) {
          sprite.destroy();
        }
      } else {
        sprite.update(time, delta);
      }
    });

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
            spawnConfig.key,
            spawnConfig.spawnX,
            spawnConfig.spawnY,
            spawnConfig.tileset.image.key,
            spawnConfig.tileid
          ).setDepth(-1);

          sprite.setData("tileProperties", spawnConfig.tileset.tileProperties[spawnConfig.tileid]);

          spawnConfig.sprite = sprite;
          this.spriteGroup.add(sprite);
          if (sprite.rect1) this.spriteRectGroup.add(sprite.rect1);
          if (sprite.rect2) this.spriteRectGroup.add(sprite.rect2);

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

  postUpdate(time: number, delta: number) {
    this.spriteGroup.getChildren().forEach((_child) => {
      const sprite = _child as BaseSprite;
      sprite.postUpdate(time, delta);
    });
  }

  //  Called when a Scene shuts down, it may then come back again later (which will invoke the 'start' event) but should be considered dormant.
  shutdown() {}

  //  Called when a Scene is destroyed by the Scene Manager. There is no coming back from a destroyed Scene, so clear up all resources here.
  destroy() {
    this.shutdown();

    this.collider?.destroy();
    this.spriteGroup.getChildren().forEach((_child) => {
      const sprite = _child as BaseSprite;
      this.spriteGroup.remove(_child);
      if (sprite.rect1) this.spriteRectGroup.remove(sprite.rect1);
      if (sprite.rect2) this.spriteRectGroup.remove(sprite.rect2);
      sprite.destroy();
    });

    super.destroy();
  }

  createSpawnConfig(
    key: string,
    tileid: number,
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
      tileid,
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
      spawnConfig.key,
      spawnConfig.spawnX,
      spawnConfig.spawnY,
      spawnConfig.tileset.image.key,
      spawnConfig.tileid,
      true
    ).setDepth(-1);

    sprite.setData("tileProperties", spawnConfig.tileset.tileProperties[spawnConfig.tileid]);

    spawnConfig.sprite = sprite;
    this.spriteGroup.add(sprite);
    if (sprite.rect1) this.spriteRectGroup.add(sprite.rect1);
    if (sprite.rect2) this.spriteRectGroup.add(sprite.rect2);

    // 通过顶砖块生成的 object 只能生成一次
    this.spawnOnCollisionConfigs.splice(index, 1);
  }
}
