import Phaser from "phaser";
import { debugDraw } from "~/utils/debug";
import AnimatedTile, { TilesetTileData } from "./AnimatedTile";
import PlayerController from "./PlayerController";
import { TileMapData, TileMapConfig, TilesetConfig } from "./TileMapLoader";

const BLOCK_SIZE = 32;
export default class MainScene extends Phaser.Scene {
  private playerController?: PlayerController;

  private tilemapConfigs: TileMapConfig[] = [];
  private tilesetConfigs: TilesetConfig[] = [];

  private animatedTiles: AnimatedTile[] = [];

  private gameTime: number = 0;

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
    this.load.atlas("mario", "players/mario.png", "players/mario.json");
  }

  create() {
    const levelConfig = this.tilemapConfigs[0];
    const level = this.make.tilemap({ key: levelConfig.key });
    const tilesets = levelConfig.tilesetIndex.map((index) => {
      const config = this.tilesetConfigs[index];
      return level.addTilesetImage(config.defaultName, config.key);
    });

    const owBackground = level.createLayer("地上背景", tilesets);
    const owLandspace = level.createLayer("地上风景", tilesets);
    const owPlatform = level.createLayer("地上平台", tilesets);
    const target = level.createLayer("目标", tilesets);
    const castle1 = level.createLayer("城堡", tilesets);
    const castle2 = level.createLayer("城堡2", tilesets);

    owPlatform.setCollisionByProperty({ collides: true });
    castle2.setDepth(1);

    tilesets.forEach((tileset) => {
      const tileData = tileset.tileData as TilesetTileData;
      for (let tileid in tileData) {
        this.animatedTiles.push(new AnimatedTile(tileid, tileData[tileid].animation, tileset.firstgid, owPlatform));
      }
    });

    const player = this.physics.add.sprite(100, owPlatform.height - BLOCK_SIZE * 2.5, "mario", "mario-idle-0");

    this.playerController = new PlayerController(player, this.addKeys(), this.drawDebug);

    this.physics.add.collider(player, owPlatform, (_player, _tile: unknown) => {
      const tile = _tile as Phaser.Tilemaps.Tile;
      if (_player.body.blocked.up && tile.faceBottom) {
        const bodyWidth = _player.body.width;
        if (_player.body.velocity.x === 0) {
          // 静止的时候移动最大半个腰
          if (_player.body.x + bodyWidth / 2 < tile.pixelX && !owPlatform.getTileAt(tile.x - 1, tile.y)) {
            _player.body.x = tile.pixelX - bodyWidth;
            _player.body.velocity.y = _player.getData("previousVelocityY");
          } else if (
            _player.body.x + bodyWidth / 2 > tile.pixelX + tile.width &&
            !owPlatform.getTileAt(tile.x + 1, tile.y)
          ) {
            _player.body.x = tile.pixelX + tile.width;
            _player.body.velocity.y = _player.getData("previousVelocityY");
          }
        } else {
          // 运动的时候移动最大1/4个腰
          if (_player.body.x + (bodyWidth * 3) / 4 < tile.pixelX && !owPlatform.getTileAt(tile.x - 1, tile.y)) {
            _player.body.x = tile.pixelX - bodyWidth;
            _player.body.velocity.y = _player.getData("previousVelocityY");
          } else if (
            _player.body.x + bodyWidth / 4 > tile.pixelX + tile.width &&
            !owPlatform.getTileAt(tile.x + 1, tile.y)
          ) {
            _player.body.x = tile.pixelX + tile.width;
            _player.body.velocity.y = _player.getData("previousVelocityY");
          }
        }
      }
    });

    this.physics.world.setBounds(0, 0, level.widthInPixels, level.heightInPixels + BLOCK_SIZE);

    this.cameras.main.setBounds(0, 48, this.physics.world.bounds.width, this.physics.world.bounds.height - 96);
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

    let boundLeft = this.cameras.main.worldView.x;
    let boundRight = boundLeft + this.cameras.main.width;
    this.animatedTiles.forEach((animatedTile) => animatedTile.update(this.gameTime, dt, boundLeft, boundRight));

    // console.log(t);
    // debug
    if (this.drawDebug && this.debugText) {
      this.debugText.setText(`fps: ${this.game.loop.actualFps}
delta: ${dt}
${this.playerController?.debugText || ""}`);
    }
  }
}
