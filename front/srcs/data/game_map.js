
/**
 * @typedef {Object} Wall
 *  @property {string} type
 *  @property {number} width
 *  @property {number} height
 *  @property {number} centerX
 *  @property {number} centerY
*/

import { clamp } from "three/src/math/MathUtils";

export const MAP_SIZE = Object.freeze({
  width: 100,
  height: 100,
  halfWidth: 50,
  halfHeight: 50
});

export const WALL_TYPES = Object.freeze({
  safe: "SAFE",
  trap: "TRAP",
});

export const DIRECTION = Object.freeze({
  top: "TOP",
  bottom: "BOTTOM",
  left: "LEFT",
  right: "RIGHT"
});

/**
 * GameMap.
 */
export class GameMap {


  /** @type {Wall[]} */
  #allWalls = [];
  /** @type {{
   * [key: string]: number[]
   * }}
   */
  #allWallByType = {};

  /** @type {{
   * [key: number]: number[]
   * }}
   */
  #allWallBySize = {};

  /** @param {Wall[]} walls */
  static createFromWalls(walls) {
     return new GameMap({
      safeWalls: walls.filter(wall => wall.type == WALL_TYPES.safe),
      trapWalls: walls.filter(wall => wall.type == WALL_TYPES.trap)
    });
  }

  /**
   * constructor.
   * @params {Object} params
   * @param {{
   *   safeWalls: { 
   *    width: number,
   *    height: number,
   *    centerX: number,
   *    centerY: number
   *   }[],
   *   trapWalls: { 
   *    width: number,
   *    height: number,
   *    centerX: number,
   *    centerY: number
   *   }[],
   * }} params
   */
  constructor({
    safeWalls,
    trapWalls,
  }) {
    Object.values(WALL_TYPES).forEach(type => {
      this.#allWallByType[type] = [];
    })
    this.addWalls(safeWalls, WALL_TYPES.safe);
    this.addWalls(trapWalls, WALL_TYPES.trap);
  }

  /** @param {string} type */
  getWallsByType(type) {
    return this.#allWallByType[type].map(index =>
      this.#allWalls[index]
    );
  }

  /** @params {Object} params
   * @param {{
   *   width: number,
   *   height: number
   *   }} params */
  getWallsBySize({ width, height }) {
    const key = this.#sizeToKey(width, height);
    if (!this.#allWallBySize[key])
      return [];
    return (this.#allWallBySize[key].map(index => 
      this.#allWalls[index]
    ));
  }

  get wallSizes() {
    return Object.keys(this.#allWallBySize).map(
      key => this.#keyToSize(Number(key))
    );
  }

  /** @param {{ 
   *    width: number,
   *    height: number,
   *    centerX: number,
   *    centerY: number
   *   }[]} walls
   *  @param {string} type
   */
  addWalls(walls, type) {
    walls.forEach(wall => {
      const width = Math.trunc(clamp(wall.width, 0, 100));
      const height = Math.trunc(clamp(wall.height, 0, 100));
      this.#allWalls.push({
        type,
        width,
        height, 
        centerX: wall.centerX,
        centerY: wall.centerY
      });
      const index = this.#allWalls.length - 1;
      this.#allWallByType[type].push(index);
      const key = this.#sizeToKey(width, height);
      if (!this.#allWallBySize[key]) {
        this.#allWallBySize[key] = [];
      }
      this.#allWallBySize[key].push(index);
    });
  }

  get allWalls() {
    return [...this.#allWalls];
  }

  addBorderWalls() {
    const sideWallSize = { 
      width: 2,
      height: 100
    };

    const sideWallPositions = [
      { x: 1, y: 50 },
      { x: 99, y: 50 }
    ];

    sideWallPositions.forEach(pos => {
      const type = WALL_TYPES.safe;
      this.addWalls([{
        width: sideWallSize.width,
        height: sideWallSize.height,
        centerX: pos.x,
        centerY: pos.y
      }],
        type
      );
    });

    const topBottomSize =  {
      width: 100, 
      height: 2
    };
    const topBottomPositions = [
      { x: 50, y: 1 },
      { x: 50, y: 99 },
    ];

    topBottomPositions.forEach(pos => {
      const type = WALL_TYPES.trap;
      this.addWalls([{
        width: topBottomSize.width,
        height: topBottomSize.height,
        centerX: pos.x,
        centerY: pos.y
      }], 
      type);
    });
  }

  /** @param {number} width
   * @param {number} height
   */

  #sizeToKey(width, height) {
    return (width * 1000 + height);
  }

  /** @param {number} key */
  #keyToSize(key) {
    return ({ width: Math.trunc(key / 1000), 
      height: key % 1000 })
  }
}

const exampleWalls = [
  {
    safeWalls: [ ]
  },
  {
    safeWalls: [
      {
        centerX: 20,
        centerY: 35,
        width: 40,
        height: 5
      },
      {
        centerX: 80,
        centerY: 65,
        width: 40,
        height: 5
      }
    ],
  },
  {
    safeWalls: [ 
      {
        centerX: 50,
        centerY: 30,
        width: 30,
        height: 5,
      },
      {
        centerX: 50,
        centerY: 70,
        width: 30,
        height: 5,
      }
    ]
  },
  {
    safeWalls: [ 
      {
        centerX: 20,
        centerY: 35,
        width: 30,
        height: 20,
      },
      {
        centerX: 80,
        centerY: 65,
        width: 30,
        height: 20,
      },
    ]
  },
  {
    safeWalls: [ 
      {
        centerX: 30,
        centerY: 50,
        width: 10,
        height: 60,
      },
      {
        centerX: 70,
        centerY: 50,
        width: 10,
        height: 60,
      },
    ]
  },
];

export const examples = exampleWalls.map(({safeWalls, trapWalls}) => {
    const map = new GameMap({
      safeWalls,
      trapWalls: trapWalls ?? [],
    });
    map.addBorderWalls();
    return ({
      textureName: "brick",
      map,
    });
});

export const Types = {};
