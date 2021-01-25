type OnExitCallback = (item?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) => void;

export default class PushableBlocks {
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
      onExitContext?: any;
      // 每帧位移之差。相当于速度
      deltaY?: number;
      // 每帧位移之差之差。相当于加速度
      dealtaDeltaY?: number;
      maxY?: number;
    }
  >();

  imageGroup: Phaser.Physics.Arcade.Group;

  private goFrames = 8;
  private backFrames = 9;

  // TODO 写成插件。待优化，tileset 中要有 pushable 的属性的 block 才需要处理
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

  play(tile: Phaser.Tilemaps.Tile, collisionPoint: Phaser.Types.Math.Vector2Like, onExit?: OnExitCallback) {
    const data = this.data.get(tile.tileset.firstgid);

    if (!data) return;

    this.stop(tile.tileset.firstgid);

    data.onExit = onExit;
    data.deltaY = -3.5;
    data.dealtaDeltaY = 0.5;
    data.maxY = tile.pixelY + tile.height / 16;

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

    // 设置位置
    data.image.setPosition(tile.pixelX, tile.pixelY);

    data.image.setData("collisionPoint", collisionPoint);

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

    data.tile = undefined;
    data.status = "static";

    data.onExit?.();
  }

  update(t: number, dt: number) {
    this.data.forEach((data, firstgid) => {
      if (data.status === "static") {
        this.stop(firstgid);
        return;
      }

      data.image.y += data.deltaY!;
      data.deltaY! += data.dealtaDeltaY!;

      if (data.image.y > data.maxY!) {
        data.image.y = data.maxY!;
      }

      data.elapsedFrames += 1;

      if (data.status === "go" && data.elapsedFrames >= this.goFrames) {
        data.status = "back";
        data.elapsedFrames = 0;
      } else if (data.status === "back" && data.elapsedFrames >= this.backFrames) {
        data.status = "static";
      }
    });
  }
}
