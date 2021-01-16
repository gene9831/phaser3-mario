import { easeInQuad, easeOutQuad } from "~/utils/easing-functions";

type OnExitCallback = (item?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) => void;

export default class TilePushAnimation {
  private data = new Map<
    number,
    {
      image: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
      orginalX: number;
      orginalY: number;
      status: "static" | "go" | "back";
      elapsedFrames: number;
      tile?: Phaser.Tilemaps.Tile;
      collides?: {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
      };
      onExit?: OnExitCallback;
      onExitArgs?: any[];
    }
  >();

  imageGroup: Phaser.Physics.Arcade.Group;

  private frames = 8;
  private goOffsetY = -10;
  private backOffsetY = 10;
  // h = (1/2) * g * t^2
  // v_max = 2 * h / t
  private vUp = (2 * this.goOffsetY) / (this.frames / 60);
  private vDown = (2 * this.backOffsetY) / (this.frames / 60);
  private aUp = -this.vUp / (this.frames / 60);
  private aDown = this.vDown / (this.frames / 60);

  constructor(scene: Phaser.Scene, tilesets: Phaser.Tilemaps.Tileset | Phaser.Tilemaps.Tileset[]) {
    let _tilesets: Phaser.Tilemaps.Tileset[] = [];

    if (tilesets instanceof Phaser.Tilemaps.Tileset) {
      _tilesets.push(tilesets);
    } else {
      _tilesets = tilesets;
    }

    this.imageGroup = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    let lastY = 0;
    _tilesets.forEach((tileset) => {
      const orginalX = -tileset.tileWidth;
      const orginalY = lastY;
      const image = scene.physics.add.image(orginalX, orginalY, tileset.image, 16).setOrigin(0, 0);

      lastY += tileset.tileHeight;

      this.imageGroup.add(image);

      this.data.set(tileset.firstgid, {
        image: image,
        orginalX: orginalX,
        orginalY: orginalY,
        status: "static",
        elapsedFrames: 0,
      });
    });
  }

  play(tile: Phaser.Tilemaps.Tile, onExit: OnExitCallback, ...args: any) {
    const data = this.data.get(tile.tileset.firstgid);

    if (!data) return;

    this.stop(tile.tileset.firstgid);

    data.onExit = onExit;
    data.onExitArgs = args;

    data.tile = tile;
    // 将碰撞信息保存
    data.collides = {
      left: tile.collideLeft,
      right: tile.collideRight,
      up: tile.collideUp,
      down: tile.collideDown,
    };

    tile.setCollision(false);
    tile.setVisible(false);

    // 设置 frame
    const tileid = tile.properties.pushid || tile.index - tile.tileset.firstgid;
    data.image.setFrame(tileid);

    // 设置位置和初速度
    data.image.setPosition(tile.pixelX, tile.pixelY);
    data.image.setVelocityY(this.vUp);
    data.image.setAccelerationY(this.aUp);

    data.status = "go";
    data.elapsedFrames = 0;
  }

  stop(firstgid: number) {
    const data = this.data.get(firstgid);

    if (!data || !data.tile) return;

    if (data.collides) {
      // 复原碰撞信息
      data.tile
        .setCollision(data.collides.left, data.collides.right, data.collides.up, data.collides.down)
        .setVisible(true);
    }

    // 恢复位置
    data.image.setPosition(data.orginalX, data.orginalY);
    data.image.setVelocityY(0);
    data.image.setAccelerationY(0);

    data.tile = undefined;
    data.status = "static";

    data.onExit?.(...(data.onExitArgs || []));
  }

  update(t: number, dt: number) {
    this.data.forEach((data, firstgid) => {
      if (data.status === "static") {
        this.stop(firstgid);
        return;
      }

      data.elapsedFrames += 1;

      // 前两帧没有位移。我这里给了 9 帧
      if (data.elapsedFrames > this.frames) {
        if (data.status === "back") {
          data.status = "static";
          // // 设置速度下一帧才生效，这里在stop前一帧设置为0
          // data.image.setVelocityY(0);
          // data.image.setAccelerationY(0);
        } else if (data.status === "go") {
          data.status = "back";
          data.image.setAccelerationY(this.aDown);
          data.elapsedFrames = 0;
        }
      }
    });
  }
}
