export default class TileItem {
  tileObject: Phaser.Types.Tilemaps.TiledObject;
  readonly gid: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  constructor(tileObject: Phaser.Types.Tilemaps.TiledObject) {
    this.tileObject = tileObject;
    this.gid = tileObject.gid || -1;
    this.width = tileObject.width || 0;
    this.height = tileObject.height || 0;
    this.x = (tileObject.x || 0) + this.width / 2;
    this.y = (tileObject.y || 0) + this.height / 2;
  }
}
