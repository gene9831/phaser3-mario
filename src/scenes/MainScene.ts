import Phaser from "phaser";
import AnimatedTiles from "../plugins/phaser-animated-tiles/AnimatedTiles";
import { debugDraw } from "~/utils/debug";
import PlayerController from "./PlayerController";
import BlockPushAnimation from "./BlockPushAnimation";
import { TileMapConfig, TileMapData, TilesetConfig } from "./tile-assets/Types";
import SpawnManager from "~/spawner/SpawnManager";
import { BaseSprite } from "~/objects/BaseSprite";
import { VAValues } from "~/constants";

const BLOCK_SIZE = 32;
export default class MainScene extends Phaser.Scene {
  private playerController?: PlayerController;

  private tilemapConfigs: TileMapConfig[] = [];
  private tilesetConfigs: TilesetConfig[] = [];

  private gameTime: number = 0;

  private owPlatform!: Phaser.Tilemaps.TilemapLayer;

  private animatedTiles!: AnimatedTiles;
  private objectSpawner!: SpawnManager;

  private tilePushAnim?: BlockPushAnimation;

  private debugText?: Phaser.GameObjects.Text;
  private drawDebug = true;

  constructor() {
    super("level-1-1");
  }

  init(data: TileMapData) {
    const { tilemapConfigs, tilesetConfigs } = data;
    this.tilemapConfigs = tilemapConfigs;
    this.tilesetConfigs = tilesetConfigs;
  }

  preload() {
    this.load.atlas("mario", "objects/mario.png", "objects/mario.json");

    this.load.scenePlugin({
      key: "AnimatedTiles",
      url: AnimatedTiles,
      sceneKey: "animatedTiles",
    });

    this.load.scenePlugin({
      key: "ObjectSpawner",
      url: SpawnManager,
      sceneKey: "objectSpawner",
    });
  }

  create() {
    const levelConfig = this.tilemapConfigs[0];
    const level = this.make.tilemap({ key: levelConfig.key });
    const tilesets = levelConfig.tilesetIndex.map((index) => {
      const config = this.tilesetConfigs[index];
      return level.addTilesetImage(config.defaultName, config.key);
    });

    const owBackground = level.createLayer("地上背景", tilesets).setDepth(-1);
    const owLandspace = level.createLayer("地上风景", tilesets).setDepth(-1);
    this.owPlatform = level.createLayer("地上平台", tilesets);
    const target = level.createLayer("目标", tilesets);
    const castle1 = level.createLayer("城堡", tilesets);
    const castle2 = level.createLayer("城堡2", tilesets).setDepth(1);
    const ugBackground = level.createLayer("地下背景", tilesets);
    const ugPlatform = level.createLayer("地下平台", tilesets);

    ugBackground.setActive(false).setVisible(false);
    ugPlatform.setActive(false).setVisible(false);

    this.owPlatform.setCollisionByProperty({ collides: true });
    const player = this.physics.add.sprite(100, this.owPlatform.height - BLOCK_SIZE * 2.5, "mario", "mario-idle-0");
    this.playerController = new PlayerController(player, this.addKeys(), this.drawDebug);

    this.animatedTiles.init(level);
    this.objectSpawner.init({
      tilemap: level,
      blocksLayer: this.owPlatform,
      interactiveSprite: player,
    });

    this.tilePushAnim = new BlockPushAnimation(this, tilesets);

    this.physics.add.collider(player, this.owPlatform, this.playerCollidesWithTile, undefined, this);
    this.physics.add.collider(player, this.tilePushAnim.imageGroup);
    this.physics.add.collider(this.objectSpawner.spawnedSprites.items, this.owPlatform);
    this.physics.add.collider(this.objectSpawner.spawnedSprites.items, this.tilePushAnim.imageGroup, (obj1, obj2) => {
      const baseObj = obj1 as BaseSprite;
      if (baseObj.objType === "item" && baseObj.body.touching.down) {
        baseObj.setVelocityY(-VAValues.v_downMax);

        const image = obj2 as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
        if (baseObj.x < image.getCenter().x) {
          baseObj.setVelocityX(-baseObj.body.velocity.x);
        }
      }
    });
    this.physics.add.collider(this.objectSpawner.spawnedSprites.enemies, this.owPlatform);

    this.physics.world.setBounds(0, 0, level.widthInPixels, level.heightInPixels, true, true, false, false);

    this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height);
    this.cameras.main.startFollow(player, true, 0.1);

    this.debugText = this.add
      .text(2, 2, "debug", {
        color: "#FFF",
        fontSize: "16px",
        shadow: {
          offsetX: 1,
          offsetY: 1,
          fill: true,
        },
      })
      .setScrollFactor(0)
      .setActive(this.drawDebug)
      .setVisible(this.drawDebug);
    this.physics.world.drawDebug = this.drawDebug;
    this.physics.world.debugGraphic.setVisible(this.drawDebug);
    this.input.keyboard.on(
      "keydown-BACKSPACE",
      () => {
        this.drawDebug = !this.drawDebug;
        this.physics.world.drawDebug = this.drawDebug;
        this.physics.world.debugGraphic.setVisible(this.drawDebug);
        this.debugText?.setActive(this.drawDebug).setVisible(this.drawDebug);
        if (this.playerController) {
          this.playerController.debug = this.drawDebug;
        }
      },
      this
    );

    // debugDraw(layer, this);
  }

  private addKeys() {
    return this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      buttonA: Phaser.Input.Keyboard.KeyCodes.SPACE,
      buttonB: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(t: number, dt: number) {
    this.gameTime += dt;
    // console.log(this.gameTime);

    this.playerController?.update(dt);

    this.tilePushAnim?.update(t, dt);

    // debug
    if (this.drawDebug && this.debugText) {
      this.debugText.setText(`fps: ${this.game.loop.actualFps}
delta: ${dt}
${this.playerController?.debugText || ""}`);
    }
  }

  private playerCollidesWithTile(_player: Phaser.Types.Physics.Arcade.GameObjectWithBody, _tile: unknown) {
    const tile = _tile as Phaser.Tilemaps.Tile;
    if (_player.body.blocked.up && tile.faceBottom) {
      // remove 后 layerData 中对应的 tile 会变成 null. Tile.destroy() 好像并没有把内存清除掉
      const layer = tile.tilemapLayer;
      const bodyWidth = _player.body.width;
      let offsetWidthTimes = 0;
      if (_player.body.velocity.x === 0) {
        // 静止的时候移动最大半个腰
        offsetWidthTimes = 1 / 2;
      } else {
        // 运动的时候移动最大1/4个腰
        offsetWidthTimes = 1 / 4;
      }

      if (_player.body.x + bodyWidth * (1 - offsetWidthTimes) < tile.pixelX && !layer.getTileAt(tile.x - 1, tile.y)) {
        // block 左下方
        _player.body.x = tile.pixelX - bodyWidth;
        _player.body.velocity.y = _player.getData("previousVelocityY");
      } else if (
        _player.body.x + bodyWidth * offsetWidthTimes > tile.pixelX + tile.width &&
        !layer.getTileAt(tile.x + 1, tile.y)
      ) {
        // block 右下方
        _player.body.x = tile.pixelX + tile.width;
        _player.body.velocity.y = _player.getData("previousVelocityY");
      } else {
        const nextTile = layer.getTileAt(tile.x + 1, tile.y);
        const pushTile = _player.body.x + bodyWidth / 2 > tile.pixelX + tile.width && nextTile ? nextTile : tile;
        if (pushTile.properties.pushable) {
          this.playerPushBlock(_player, pushTile);
        }
      }
    }
  }

  private playerPushBlock(_player: Phaser.Types.Physics.Arcade.GameObjectWithBody, tile: Phaser.Tilemaps.Tile) {
    // 顶砖块的逻辑写在这里

    let spawnConfigIndex = 0;
    const spawnConfig = this.objectSpawner.spawnOnCollisionConfigs.find((config, index) => {
      spawnConfigIndex = index;
      return tile.containsPoint(config.spawnX, config.spawnY);
    });

    this.tilePushAnim?.play(tile, () => {
      if (spawnConfig) {
        this.objectSpawner.spawnOnCollision(spawnConfigIndex);
      }
    });

    if (tile.properties.name === "? block") {
      tile.index = (tile.properties.pushid || 0) + tile.tileset.firstgid;
      tile.properties.pushable = false;
    }
  }
}
