declare type AnimatedTileData = {
  index: number;
  frames: Array<{ duration: number; tileid: number }>;
  currentFrame: number;
  tiles: Array<Array<Phaser.Tilemaps.Tile>>;
  rate: number;
};

declare class AnimatedTiles extends Phaser.Plugins.ScenePlugin {
  readonly animatedTiles: Array<{
    map: Phaser.Tilemaps.Tilemap;
    animatedTiles: Array<AnimatedTileData>;
    active: boolean;
    rate: number;
    activeLayer: boolean[];
  }>;

  readonly rate: number;

  active: boolean;

  activeLayer: any[];

  followTimeScale: boolean;

  constructor(scene: Phaser.Scene, pluginManager: Phaser.Plugins.PluginManager);

  init(map: Phaser.Tilemaps.Tilemap): void;

  setRate(rate: number, gid?: number, map?: Phaser.Tilemaps.Tilemap): void;

  resetRates(mapIndex?: number): void;

  /**
   * Start (or resume) animations
   * @param layerIndex
   * @param mapIndex
   */
  resume(layerIndex?: number, mapIndex?: number): void;

  /**
   * Stop (or pause) animations
   * @param layerIndex
   * @param mapIndex
   */
  pause(layerIndex?: number, mapIndex?: number): void;
}

export default AnimatedTiles;
