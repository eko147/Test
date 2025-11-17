/**
 * @typedef {Object} Wall
 *  @property {string} type
 *  @property {number} width
 *  @property {number} height
 *  @property {number} centerX
 *  @property {number} centerY
*/

import { GameMap, WALL_TYPES } from "@/data/game_map";
import { DEBUG } from "@/data/global";

const WALL_THICKNESS_THRESHOLD = 4;

const TEXTURE_SIZE_DEFAULT = Object.freeze({
  width: 1024,
  height: 1024
});

/** MapImageGenarator. */
export default class MapImageGenarator {

  /** @type {{
   *    [key in string]: HTMLImageElement
   * }}
   */
  #textures = {};

  /**
   * @type {{
   *    width: number,
   *    height: number
   *  }}
   */
  #size;
  #textureScale;

  #canvas;

  /**
   * constructor.
   * @param {{
   *  size: {
   *    width: number,
   *    height: number
   *  }
   * }} params
   */
  constructor({
    size,
  }) {
    this.#size = size
    this.#canvas = new OffscreenCanvas(size.width, size.height);
    this.#textureScale = {
      x: 10,
      y: 10,
    };
  }

  /**
   * @param {{
   *  name: string,
   *  path: string,
   * }[]} texturePath
   */
  async loadTexture(texturePath) {
    const status = texturePath.map(({name}) => ({
      name,
      loaded: false
    }));
    return (new Promise(resolve => {
      texturePath.forEach(({name, path}) => {
        if (this.#textures.name) {
          const i = status.findIndex(s => s.name == name);
          status[i].loaded = true; 
          if (status.findIndex(s => !s.loaded) == -1) {
            resolve();
          }
          return ;
        }
        const textureImage = new Image(this.#size.width, this.#size.height);
        textureImage.src = path;
        textureImage.onload = () => {
          this.#textures[name] = textureImage;
          const i = status.findIndex(s => s.name == name);
          status[i].loaded = true; 
          if (status.findIndex(s => !s.loaded) == -1) {
            resolve();
          }
        }
      })
    })
    );
  }

  /**
   * generate. 
   * @param {{ 
   *  map: GameMap ,
   *  textureName: string
   * }} params
   */
  generate({map, textureName}) {
    const texture = this.#textures[textureName];
    if (!texture) {
      if (DEBUG.isDebug())
        console.error(textureName + " texture not loaded");
      return ;
    }
    const ctx = this.#canvas.getContext("2d");
    ctx.fillRect(0, 0, this.#size.width, this.#size.height);
    map.allWalls.forEach(wall => this.#drawWall({wall, ctx, texture}));
    return this.#canvas.transferToImageBitmap();
  }

  /** @param {{
   *  wall: Wall,
   *  ctx: OffscreenCanvasRenderingContext2D,
   *  texture: HTMLImageElement
   * }} params
  */
  #drawWall({wall, ctx, texture}) {
    const wallWidth = Math.max(wall.width, WALL_THICKNESS_THRESHOLD);
    const wallHeight = Math.max(wall.height, WALL_THICKNESS_THRESHOLD);
    const x = Math.max(0, Math.min(100 - wallWidth, (wall.centerX - wallWidth * 0.5))) * 0.01 * this.#size.width;
    const y = Math.max(0, Math.min(100 - wallHeight, ((100 - wall.centerY) - wallHeight * 0.5))) * 0.01 * this.#size.height;
    const width = wallWidth * 0.01 * this.#size.width;
    const height = wallHeight * 0.01 * this.#size.height;
    ctx.drawImage(
      texture,
      0, 
      0, 
      Math.min(width * this.#textureScale.x, TEXTURE_SIZE_DEFAULT.width),
      Math.min(height * this.#textureScale.y, TEXTURE_SIZE_DEFAULT.height),
      x, 
      y, 
      width, 
      height
    );
  }
}
