/** @typedef { "LINE" | "BAR" | "PIE" } GraphType */

import { DEBUG } from "./global";

export default class GraphData {

  /** @type { string } */
  #label; 
  get label() { return this.#label; }

  /** @type { GraphType } */
  #graphType;
  get graphType() { return this.#graphType; }

  /** @type {{ [ key in string ]: {
   *    name: string,
   *    length: number,
   *    min: number,
   *    max: number
   * }}} */
  #axies;
  get axies() { return ({...this.#axies}); }
 
  /** @type {{
   *  [ key in string ]: number[]
   * }} 
   */
  #data;

  getDefaultData() {
    return this.#data["DEFAULT"];
  }

  getDataFor(key) {
    return this.#data[key];
  }

  /** @type {{
   *  [ key in string ]: string
   * }}
   */ 
  #colors;

  /** @param { string } axies */
  getColor(axies) {
    return this.#colors[axies];
  }


  /** @param {{
   *    type: GraphType,
   *    label: string,
   *    axies: {
   *      [ key in string ]: string 
   *    },
   *    data: {
   *      [ key in string ]: any[]
   *    },
   *    colors: {
   *      [ key in string ]: string
   *    }
  * }} params */
  constructor({ type, label, axies, data, colors = {} }) {
    this.#graphType= type;
    this.#label = label;
    this.#data = data;
    this.#axies = {};
    this.#colors = {};
    for (const key in axies) {
      this.#axies[key] = {
        name: axies[key],
        length: 0 
      };
      this.#colors[key] = colors[key] ?? "#000000";
    }
    this.#calcAxiesLength();
  }

  #calcAxiesLength() { 
    let min = {};
    let max = {};
    for (let axis in this.#axies) {
       min[axis] = 0;
       max[axis] = 0;
    }   
    if (this.#data["DEFAULT"].length < 2) {
      if (DEBUG.isDebug())
        console.error("data length < 2");
      return ;
    }

    this.#data["DEFAULT"].forEach(data => {
      Object.entries(this.#axies).forEach(([axis, { name }]) => {
        min[axis] = Math.min(min[axis], data[name]);
        max[axis] = Math.max(max[axis], data[name]);
      })
    });
    for (let axis in this.#axies) {
      this.#axies[axis].length = max[axis] - min[axis];
      this.#axies.min = min[axis];
      this.#axies.max = max[axis];
    }   
    return this;
  }
}

export const Types = {};
