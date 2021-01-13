export type TilesetTileData = { [key: number]: { animation: TileAnimationData } };

export type TileAnimationData = Array<{ duration: number; tileid: number }>;

export default class AnimatedTile {
  private tileid: string | number;
  private tileAnimationData: TileAnimationData;
  private firstgid: number;
  private layer: Phaser.Tilemaps.TilemapLayer;

  private frameIndex: number;
  private duration: number;
  private frameEndtime: number[] = [0];

  private tiles: Phaser.Tilemaps.Tile[] = [];

  private tileWidth: number;
  private tileHeight: number;

  /**
   * 一个 tileid 对应一个 AnimatedTile 类。这个类会处理 tileid 相等的 多个 tiles (在同一个 tileset 中) 的动画。
   * tileset.tileData 对象中的 key 代表 tileid, value 代表 tileAnimationData
   * @param tileid tileId 指的是在对应的 tileset 中，这个 tile 的位置。从 0 开始，可以在 tiled 软件中查看到
   * @param tileAnimationData
   * @param firstgid
   * @param layer
   */
  constructor(
    tileid: string | number,
    tileAnimationData: TileAnimationData,
    firstgid: number,
    layer: Phaser.Tilemaps.TilemapLayer
  ) {
    this.tileid = tileid;
    this.tileAnimationData = tileAnimationData;
    this.firstgid = firstgid;
    this.layer = layer;

    this.frameIndex = 0;
    this.duration = tileAnimationData.reduce((accumulator, current) => {
      const res = accumulator + current.duration;
      this.frameEndtime.push(res);
      return res;
    }, 0);

    const layerData = layer.layer.data;
    // 先从上到下，再从左到后。保证前一个 tile 的 x 不会大于后一个 tile 的 x
    for (let x = 0; x < layerData[0].length; x++) {
      for (let y = 0; y < layerData.length; y++) {
        const tile = layerData[y][x];
        if (tile.index - firstgid === parseInt(`${tileid}`, 10)) {
          this.tiles.push(tile);
        }
      }
    }

    this.tileWidth = layerData[0][0].width;
    this.tileHeight = layerData[0][0].height;
  }

  update(time: number, delta: number, boundLeft: number = 0, boundRight: number = this.layer.width): void {
    if (this.tiles.length === 0) {
      return;
    }

    const elapsedTime = time % this.duration;

    if (elapsedTime >= this.frameEndtime[this.frameIndex] && elapsedTime < this.frameEndtime[this.frameIndex + 1]) {
      // 当前帧未播放完，无需操作
      return;
    }

    this.frameIndex = this.searchAnimationIndex(time % this.duration);

    boundLeft -= this.layer.x;
    boundRight -= this.layer.x;

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      if (boundLeft - this.tileWidth >= tile.pixelX) {
        continue;
      }

      if (boundRight <= tile.pixelX) {
        break;
      }

      tile.index = this.tileAnimationData[this.frameIndex].tileid + this.firstgid;
    }
  }

  private searchAnimationIndex(x: number) {
    let left = 0;
    let right = this.tileAnimationData.length;

    while (right - left > 1) {
      let mid = Math.floor((left + right) / 2);
      if (x < this.frameEndtime[mid]) {
        right = mid;
      } else if (x > this.frameEndtime[mid]) {
        left = mid;
      } else {
        return mid;
      }
    }
    return left;
  }
}
