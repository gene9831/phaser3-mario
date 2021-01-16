import Phaser from "phaser";
import AnimatedTiles from "../plugins/phaser-animated-tiles/AnimatedTiles";
import { debugDraw } from "~/utils/debug";
import PlayerController from "./PlayerController";
import { TileMapData, TileMapConfig, TilesetConfig } from "./TileMapLoader";
import TilePushAnimation from "./TilePushAnimation";
import TileItem from "./TileItem";
import MushRoomAnim from "./MushRoomAnim";
import { gSmbPhysics } from "~/main";

const BLOCK_SIZE = 32;
export default class MainScene extends Phaser.Scene {
  private playerController?: PlayerController;

  private tilemapConfigs: TileMapConfig[] = [];
  private tilesetConfigs: TilesetConfig[] = [];

  private gameTime: number = 0;

  private owPlatform!: Phaser.Tilemaps.TilemapLayer;

  private animatedTiles!: AnimatedTiles;

  private tilePushAnim?: TilePushAnimation;

  private propItems: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];

  private mushroomAnim: MushRoomAnim = new MushRoomAnim();

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

    level.objects.forEach((objectLayer) => {
      objectLayer.objects.forEach((object) => {
        if (object.name !== "mushroom") return;
        if (object.gid) {
          const item = new TileItem(object);
          const tileset = tilesets.find(
            (tileset) => item.gid >= tileset.firstgid && item.gid < tileset.firstgid + tileset.total
          );
          if (tileset) {
            const sprite = this.physics.add
              .sprite(item.x, item.y, tileset.image.key, item.gid - tileset.firstgid)
              .setSize(26, 32)
              .setBounceX(1)
              .setMaxVelocity(Infinity, gSmbPhysics.vertical.downwardMax)
              .setActive(false)
              .setVisible(false)
              .setDepth(-1);
            sprite.body.setAllowGravity(false);
            this.propItems.push(sprite);
          }
        }
      });
    });

    this.owPlatform.setCollisionByProperty({ collides: true });
    const player = this.physics.add.sprite(100, this.owPlatform.height - BLOCK_SIZE * 2.5, "mario", "mario-idle-0");
    this.playerController = new PlayerController(player, this.addKeys(), this.drawDebug);

    this.animatedTiles.init(level);

    this.tilePushAnim = new TilePushAnimation(this, tilesets);

    this.physics.add.collider(player, this.owPlatform, this.playerCollidesWithTile, undefined, this);
    this.physics.add.collider(player, this.tilePushAnim.imageGroup);
    this.physics.add.collider(this.propItems, this.owPlatform);
    this.physics.add.collider(this.propItems, this.tilePushAnim.imageGroup, (propItem, tile) => {
      if (propItem.active) {
        if (propItem.body.touching.down && tile.body.touching) {
          propItem.body.velocity.y = -300;
        }
      }
    });

    this.physics.world.setBounds(0, 0, level.widthInPixels, level.heightInPixels, true, true, false, false);

    this.cameras.main.setBounds(0, 16, this.physics.world.bounds.width, this.physics.world.bounds.height - 32);
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

    this.mushroomAnim.update(t, dt);

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

    const propItem = this.propItems.find((item) => tile.containsPoint(item.x, item.y));
    this.tilePushAnim?.play(
      tile,
      (item) => {
        if (item) {
          this.mushroomAnim.add(item);
        }
      },
      propItem
    );

    if (tile.properties.name === "? block") {
      tile.index = (tile.properties.pushid || 0) + tile.tileset.firstgid;
      tile.properties.pushable = false;
    }
  }
}
