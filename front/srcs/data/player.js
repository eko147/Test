import { DIRECTION } from "@/data/game_map";

/**
 * @typedef {Object} GameResult
 * @property {Player[]} players
 * @property {{
 *   [key: string]: number
 * }} scores
 */

/**
 * Player.
 */
export default class Player {

  /** @type {string} */
  nickname;

  /** @type {GameResult[]} */
  records = [];

  /** @params {string} nickname */
  constructor({nickname}) {
    this.nickname = nickname;
  }
}

export const PLAYER_POSITION = Object.freeze({
  [DIRECTION.top]: 0,
  [DIRECTION.bottom]: 1,
});

