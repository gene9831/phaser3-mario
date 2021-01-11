import Phaser from "phaser";
import { SMBPhysics } from "~/smb-physics";
import { debugDraw } from "~/utils/debug";
import PlayerController from "./PlayerController";

export default class MainScene extends Phaser.Scene {
  private readonly smbPhysics = new SMBPhysics(32);

  private playerController?: PlayerController;
  private playerPreviousVelocityY: number = 0;

  private debugText?: Phaser.GameObjects.Text;
  private drawDebug = true;

  constructor() {
    super("main");
  }

  preload() {
    this.load.image("tiles_overworld", "tiles/overworld.png");
    this.load.image("tiles_underground", "tiles/underground.png");
    this.load.tilemapTiledJSON("level_1_1", "levels/level-1-1.json");

    this.load.atlas("mario", "players/mario.png", "players/mario.json");
  }

  create() {
    // console.log(this.smbPhysics);

    const level_1_1 = this.make.tilemap({ key: "level_1_1" });
    const tilesOverworld = level_1_1.addTilesetImage("overworld", "tiles_overworld");
    const tilesUnderground = level_1_1.addTilesetImage("underground", "tiles_underground");

    level_1_1.createLayer("地上背景", tilesOverworld);
    level_1_1.createLayer("地上风景", tilesOverworld);
    const layer = level_1_1.createLayer("地上平台", tilesOverworld);
    level_1_1.createLayer("目标", tilesOverworld);
    level_1_1.createLayer("城堡", tilesOverworld);

    layer.setCollisionByProperty({ collides: true });

    // this.player = this.physics.add.sprite(5550, 348 - 32 * 2, "mario", "mario-idle-0");
    const player = this.physics.add.sprite(100, layer.height - 32 * 2 - 16, "mario", "mario-idle-0");
    player.setCollideWorldBounds(true);
    player.setMaxVelocity(this.smbPhysics.velocities.maxRun, 1000);
    player.setDragX(this.smbPhysics.decelerations.release);
    player.setGravityY(this.smbPhysics.vertical.stage_0.falling_gy);
    player.setBodySize(28, 32);

    this.playerController = new PlayerController(player, this.addKeys(), this.drawDebug);

    level_1_1.createLayer("城堡2", tilesOverworld);

    this.cameras.main.setBounds(0, 48, layer.width, layer.height - 64);
    this.cameras.main.startFollow(player, true);

    this.physics.add.collider(player, layer, (_player, _tile: unknown) => {
      const tile = _tile as Phaser.Tilemaps.Tile;
      if (_player.body.blocked.up && tile.faceBottom) {
        const bodyWidth = _player.body.width;
        if (_player.body.velocity.x === 0) {
          // 静止的时候移动最大半个腰
          if (_player.body.x + bodyWidth / 2 < tile.pixelX && !layer.getTileAt(tile.x - 1, tile.y)) {
            _player.body.x = tile.pixelX - bodyWidth;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          } else if (
            _player.body.x + bodyWidth / 2 > tile.pixelX + tile.width &&
            !layer.getTileAt(tile.x + 1, tile.y)
          ) {
            _player.body.x = tile.pixelX + tile.width;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          }
        } else {
          // 运动的时候移动最大1/4个腰
          if (_player.body.x + (bodyWidth * 3) / 4 < tile.pixelX && !layer.getTileAt(tile.x - 1, tile.y)) {
            _player.body.x = tile.pixelX - bodyWidth;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          } else if (
            _player.body.x + bodyWidth / 4 > tile.pixelX + tile.width &&
            !layer.getTileAt(tile.x + 1, tile.y)
          ) {
            _player.body.x = tile.pixelX + tile.width;
            _player.body.velocity.y = this.playerPreviousVelocityY;
          }
        }
      }
    });

    this.physics.world.setBounds(0, 0, level_1_1.widthInPixels, level_1_1.heightInPixels);

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
    this.playerController?.update(dt);

    const vy = this.playerController?.sprite.body.velocity.y || 0;
    if (vy != 0) this.playerPreviousVelocityY = vy;

    // debug
    if (this.drawDebug && this.debugText) {
      this.debugText.setText(`fps: ${this.game.loop.actualFps}
delta: ${dt}
${this.playerController?.debugText || ""}`);
    }
  }
}
