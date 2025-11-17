import { DEBUG } from "./global";

export const POWER_UP_CONFIG = {
  defaultDuration: 3,
  peddleSpeedUpDuration: 0.5,
  peddleSpeedDownDuration: 1.5,
  velocityIncrease: 40,
  velocityDecrease: 40
};

/** @typedef {Object} PowerUpInfo
 *  @property {"SUMMON" | "BUFF" | "DEBUFF"} type,
 *  @property {"BALL" | "PEDDLE" | "BLOCK"} target
 *  @property {string} key,
 *  @property {string} desc
 */

/**@type {{
 * [key: string]: "SUMMON" | "BUFF" | "DEBUFF" 
 * }} */
export const POWER_UP_TYPES = Object.freeze({
  summon: "SUMMON",
  buff: "BUFF",
  debuff: "DEBUFF",
});

export const POWER_TARGETS = Object.freeze({
  ball: "BALL",
  peddle: "PEDDLE",
});

/** @type {{
 *  [key: string] : PowerUpInfo
 * }} */
export const SUMMONS = Object.freeze({
  block: {
    type: POWER_UP_TYPES.summon,
    target: "BLOCK",
    key: "SUMMON_BLOCK",
    desc: "🧱 Create block",
  },
  ball: {
    type: POWER_UP_TYPES.summon,
    target: "BALL",
    key: "SUMMON_BALL",
    desc: "🔴 Summon ball",
  },
  peddle: {
    type: POWER_UP_TYPES.summon,
    target: "PEDDLE",
    key: "SUMMON_PEDDLE",
    desc: "🏓 Helper peddle",
  },
});

/** @type {{
 *  [key: string] : PowerUpInfo
 * }} */
export const BUFFS = Object.freeze({
  peddleSize: {
    type: POWER_UP_TYPES.buff,
    target: "PEDDLE",
    key: "PEDDLE_SIZE_UP",
    desc: "⏫ Size up me",
  },
  peddleSpeed: { 
    type: POWER_UP_TYPES.buff,
    target: "PEDDLE",
    key: "PEDDLE_SPEED_UP", 
    desc: "🚀 Speed up me",
  },
});

/** @type {{
 *  [key: string] : PowerUpInfo
 * }} */
export const DEBUFFS = Object.freeze({
  peddleSize: { 
    type: POWER_UP_TYPES.debuff,
    target: "PEDDLE",
    key: "PEDDLE_SIZE_DOWN", 
    desc: "⏬ Size down"
  },
  peddleSpeed: {
    type: POWER_UP_TYPES.debuff,
    target: "PEDDLE",
    key: "PEDDLE_SPEED_DOWN", 
    desc: "🐢 Handle lock"
  },
});

export default class PowerUp {

  /** @type {"SUMMON" | "BUFF" | "DEBUFF"} type */
  #_type;

  /** @type {PowerUpInfo} */
  #info;

  /** @type {any} */
  #target;
  get targetStatus() {
    return this.#target;
  }

  /** @type {any} */
  #_defaultTargetStatus = null;

  get defaultTargetStatus() {
    return {...this.#_defaultTargetStatus};
  }
  
  get info() {
    return ({
      ...this.#info
    });
  }

  /** @type {((target: any) => void)[]} */
  #useCallbacks = [];

  /** @type {((target: any) => void)[]} */
  #revokeCallbacks = [];

  /** @type {number} */
  #_duration;
  #_totalDuration;
  get duration() {
    return this.#_duration;
  }

  /**
   * constructor.
   * @param {{
   *  info: PowerUpInfo,
   *  duration: number,
   * }} params
   */
  constructor({info, duration}) {

    if (duration <= 0) {
      throw "Invalid duration";
    }
    this.#_type = info.type;
    this.#info = info;
    this.#_duration = duration;
    this.#_totalDuration = duration;
    this.#target = null;
  }

  /** @param {any} target */
  use(target) {
    this.#setState(target);
    switch (this.#_type) {
      case(POWER_UP_TYPES.buff):
        this.#useBuff();
        break;
      case(POWER_UP_TYPES.debuff):
        this.#useDebuff();
        break;
    }
    this.#useCallbacks.forEach(callback => {
      callback(this.#target);
    });
  }

  revoke() {
    if (this.#info.target == "PEDDLE") {
      this.#target = this.#_defaultTargetStatus;
    }
    this.#revokeCallbacks.forEach(callback => {
      callback(this.#target);
    });
  }

  update(duration) {
    if (this.#_duration == 0)
      return ;
    this.#_duration = Math.max(this.#_duration - duration, 0);
    switch (this.#_type) {
      case (POWER_UP_TYPES.buff):
        this.#updateBuff();
        break;
      case (POWER_UP_TYPES.debuff):
        this.#updateDebuff();
        break;
      case (POWER_UP_TYPES.summon):
        break;
    }
  }

  get isEnd() {
    return this.#_duration == 0;
  }

  /** @param {number} duration*/
  setTotalDuration(duration) {
    this.#_duration = duration;
    this.#_totalDuration = duration;
  }

  /** @param {(target: any) => void} callback */
  setUseCallback(callback) {
    this.#useCallbacks.push(callback);
  }

  /** @param {(target: any) => void} callback */
  setRevokeCallback(callback) {
    this.#revokeCallbacks.push(callback);
  }

  /** @param {any} target */
  #setState(target) {
    switch (this.#info.target) {
      case ("PEDDLE"):
        if (this.#info.key.includes("PEDDLE_SIZE")) {
          this.#_defaultTargetStatus = {
            width: target.width,
            height: target.height
          };
          this.#target = {
            ...this.#_defaultTargetStatus
          };
        }
        else if (this.#info.key.includes("PEDDLE_SPEED")) {
          this.#_defaultTargetStatus = {
            velocity: {
              ...target.velocity
            }
          };
          this.#target = {
            velocity: {
              ...this.#_defaultTargetStatus.velocity
            }
          };
        }
        break;
      default:
        if (DEBUG.isDebug())
          console.error("power up state not set");
        break;
    }
  }

  #useBuff() { 
    
    if (this.#info == BUFFS.peddleSize) {
      this.#target.width *= 2;
    }
    else if (this.#info == BUFFS.peddleSpeed) {
      if (this.#target.velocity.x > 0) {
        this.#target.velocity.x += POWER_UP_CONFIG.velocityIncrease;
      }
      else {
        this.#target.velocity.x -= POWER_UP_CONFIG.velocityIncrease;
      }
    }
  }

  #updateBuff() {
    if (this.#info == BUFFS.peddleSpeed) {
      const ratio = this.#_duration / this.#_totalDuration;
      this.#target.velocity.x = this.#_defaultTargetStatus.velocity.x * (1 - ratio) + this.#target.velocity.x * ratio;
    }
  }

  #useDebuff() {
    if (this.#info == DEBUFFS.peddleSize) {
      this.#target.width *= 0.5;
    }
    else if (this.#info == DEBUFFS.peddleSpeed) {
      if (this.#target.velocity.x > 0) {
        this.#target.velocity.x = Math.max(
        this.#target.velocity.x - POWER_UP_CONFIG.velocityDecrease, 0);
      }
      else {
        this.#target.velocity.x = Math.min(this.#target.velocity.x + POWER_UP_CONFIG.velocityDecrease, 0);
      }
    }
  }

  #updateDebuff() {
    const ratio = this.#_duration / this.#_totalDuration;
    if (this.#info == DEBUFFS.peddleSpeed) {
        this.#target.velocity.x =  this.#_defaultTargetStatus.velocity.x * (1 - ratio) + this.#target.velocity.x * ratio
    }
  }
}

export const Types = {};

