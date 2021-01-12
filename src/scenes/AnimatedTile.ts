export type TilesetTileData = { [key: number]: { animation: TileAnimationData } };

export type TileAnimationData = Array<{ duration: number; tileid: number }>;

// TODO 有待优化。frameIndex, duration, frameEndtime都进行了大量的重复计算
export default class AnimatedTile {
  private tile: Phaser.Tilemaps.Tile;
  private tileAnimationData: TileAnimationData;
  private firstgid: number;
  private frameIndex: number;
  private duration: number;
  private frameEndtime: number[] = [0];

  constructor(tile: Phaser.Tilemaps.Tile, tileAnimationData: TileAnimationData, firstgid: number) {
    this.tile = tile;
    this.tileAnimationData = tileAnimationData;
    this.firstgid = firstgid;
    // this.elapsedTime = 0;
    this.frameIndex = 0;
    this.duration = tileAnimationData.reduce((accumulator, current) => {
      const res = accumulator + current.duration;
      this.frameEndtime.push(res);
      return res;
    }, 0);
  }

  update(time: number, delta: number, boundLeft?: number, boundRight?: number): void {
    if (boundLeft !== undefined && boundRight !== undefined) {
      if (this.tile.pixelX <= boundLeft - this.tile.width || this.tile.pixelX >= boundRight) {
        // 不在此范围内不展示动画
        return;
      }
    }

    const elapsedTime = time % this.duration;

    if (elapsedTime >= this.frameEndtime[this.frameIndex] && elapsedTime < this.frameEndtime[this.frameIndex + 1]) {
      // 当前帧未播放完，无需操作
      return;
    }

    this.frameIndex = this.searchAnimationIndex(time % this.duration);
    console.log(this.frameIndex);

    this.tile.index = this.tileAnimationData[this.frameIndex].tileid + this.firstgid;
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
