import Phaser from "phaser";
import AnimatedTiles from "../plugins/phaser-animated-tiles/AnimatedTiles";
import { debugDraw } from "~/utils/debug";
import PlayerController from "./PlayerController";
import PushableBlocks from "./PushableBlocks";
import { TileMapConfig, TileMapData, TilesetConfig } from "./tile-assets/Types";
import SpawnManager from "~/spawner/SpawnManager";
import { BaseSprite } from "~/objects/BaseSprite";
import SpriteRect from "~/objects/SpriteRect";
import { VAValues } from "~/constants";

const BLOCK_SIZE = 32;
export default class MainScene extends Phaser.Scene {
  private playerController?: PlayerController;

  private tilemapConfigs: TileMapConfig[] = [];
  private tilesetConfigs: TilesetConfig[] = [];

  private gameTime: number = 0;

  private platform!: Phaser.Tilemaps.TilemapLayer;

  private animatedTiles!: AnimatedTiles;
  private spawnManager!: SpawnManager;

  private pushableBlocks?: PushableBlocks;

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
      key: "SpawnManager",
      url: SpawnManager,
      sceneKey: "spawnManager",
    });
  }

  create() {
    const levelConfig = this.tilemapConfigs[0];
    const level = this.make.tilemap({ key: levelConfig.key });
    const tilesets = levelConfig.tilesetIndex.map((index) => {
      const config = this.tilesetConfigs[index];
      return level.addTilesetImage(config.defaultName, config.key);
    });

    const background = level.createLayer("背景", tilesets).setDepth(-1);
    const landspace = level.createLayer("风景", tilesets).setDepth(-1);
    const platform = level.createLayer("平台", tilesets).setDepth(0);
    const target = level.createLayer("目标", tilesets).setDepth(0);
    const castle1 = level.createLayer("城堡", tilesets).setDepth(0);
    const castle2 = level.createLayer("城堡2", tilesets).setDepth(1);

    this.platform = platform;

    this.platform.setCollisionByProperty({ collides: true });
    const player = this.physics.add.sprite(100, this.platform.height - BLOCK_SIZE * 2.5, "mario", "mario-idle-0");
    this.playerController = new PlayerController(player, this.addKeys(), this.drawDebug);

    // 一些插件
    this.pushableBlocks = new PushableBlocks(this, tilesets);
    this.animatedTiles.init(level);
    this.spawnManager.init({
      tilemap: level,
      blocksLayer: this.platform,
      interactiveSprite: player,
    });

    this.physics.add.collider(player, this.platform, this.playerCollidesWithBlock, undefined, this);
    this.physics.add.collider(player, this.pushableBlocks.imageGroup);
    this.physics.add.overlap(
      player,
      this.spawnManager.spriteRectGroup,
      (_player, obj2) => {
        const rect = obj2 as SpriteRect;

        switch (rect.parent.getData("spriteType")) {
          case "item":
            break;
          case "enemy":
            const player = _player as Phaser.Physics.Arcade.Sprite;
            if (player.y < rect.y) {
              rect.parent.trampled(player);
            } else {
              this.scene.pause();
              console.log("你已经死了，只是代码逻辑还没写");
            }
            break;
          default:
            break;
        }
      },
      undefined,
      this
    );

    this.physics.add.collider(this.spawnManager.spriteGroup, this.platform);
    this.physics.add.collider(this.spawnManager.spriteGroup, this.pushableBlocks.imageGroup, (obj1, obj2) => {
      const sprite = obj1 as BaseSprite;
      const block = obj2 as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

      sprite.pushed(block);
    });

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

    // debugDraw(this.owPlatform, this);
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

    this.pushableBlocks?.update(t, dt);

    // debug
    if (this.drawDebug && this.debugText) {
      this.debugText.setText(`fps: ${this.game.loop.actualFps}
delta: ${dt}
${this.playerController?.debugText || ""}`);
    }
  }

  private playerCollidesWithBlock(_player: Phaser.Types.Physics.Arcade.GameObjectWithBody, _tile: unknown) {
    const tile = _tile as Phaser.Tilemaps.Tile;
    if (_player.body.blocked.up && tile.faceBottom) {
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
          this.pushBlock(_player, pushTile);
        }
      }
    }
  }

  private pushBlock(_player: Phaser.Types.Physics.Arcade.GameObjectWithBody, tile: Phaser.Tilemaps.Tile) {
    // 顶砖块的逻辑写在这里

    let spawnConfigIndex = 0;
    const spawnConfig = this.spawnManager.spawnOnCollisionConfigs.find((config, index) => {
      spawnConfigIndex = index;
      return tile.containsPoint(config.spawnX, config.spawnY);
    });

    this.pushableBlocks?.play(
      tile,
      {
        x: _player.body.center.x,
        y: _player.body.y,
      },
      () => {
        if (spawnConfig) {
          this.spawnManager.spawnOnCollision(spawnConfigIndex);
        }
      }
    );

    if (tile.properties.pushable && tile.properties.pushid) {
      // 一次性砖块
      tile.index = tile.properties.pushid + tile.tileset.firstgid;
      tile.properties.pushable = false;
    }
  }
}
