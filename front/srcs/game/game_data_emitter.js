/** @typedef DataInterval 
 *  @property {"MS" | "SEC"} unit 
 *  @property { number } value
 */

import { DEBUG } from "@/data/global";
import { isEmptyObject } from "@/utils/type_util";

/** @typedef {"INSTANT" | "FLUSH" | "LAZY"} EventReactConfig */
/** @typedef {"BALL" | "PEDDLE" | "GAME_STATE"} CollectTarget */
/** @typedef {"PLAYER_BEHAVIOR" | "COLLISION" | "GAME_DATA_CHANGED"} EventType */

/** @typedef Config 
 *  @property {DataInterval} emitInterval
 *  @property {{
 *    [key in CollectTarget]: (DataInterval | "IGNORE")
 *  }}  periodicalCollect
 *  @property {{
 *    [key in EventType]: EventReactConfig
 *  }} event
 */

/** @typedef EmitterData 
 *  @property { number } date
 *  @property { "PERIODICAL" | "EVENT" } type
 *  @property { any } content
 *  @property { string } key
 */

/** @typedef DataOutput
 *  @property { "GAME_DATA_OUTPUT" } prefix
 *  @property { Date } emittedTime
 *  @property { EmitterData[] } data
 */

/** @type {{
 *    [key in string]: ((_: number) => DataInterval)
 * }}
 */
const DATA_INTERVAL = Object.freeze({
  SEC: (sec) => ({ unit: "SEC", value: sec}),
  MS: (ms) => ({ unit: "MS", value: ms}),
});

export default class GameDataEmitter {

  /** @type Config */
  static DefaultConfig = Object.freeze({
    emitInterval: DATA_INTERVAL.SEC(1),
    periodicalCollect: {
      BALL: DATA_INTERVAL.MS(500),
      PEDDLE: DATA_INTERVAL.MS(500),
      GAME_STATE: DATA_INTERVAL.MS(2000),
    },
    event: {
      PLAYER_BEHAVIOR: "LAZY",
      COLLISION: "LAZY",
      GAME_DATA_CHANGED: "LAZY"
    }
  });

  /** @type Config */
  #config;

  /** @type {((output:DataOutput) => void)[]} */
  #receivers;

  /** @type {{
   *  [key in CollectTarget] : () => Object
   * }} */
  #collectors;

  #isCollecting = false;

  /** @type {EmitterData[]} */
  #pendingData;
  /** @type {number} */
  #lastEmittedDate;
  /** @type {"GAME_DATA_OUTPUT"} */
  static get outputPrefix() {
    return "GAME_DATA_OUTPUT";
  }

  /** @param {{
   *  receiver?: (output:DataOutput) => void,
   *  config?: Config
   * } | null
  * } params */
  constructor(params = null) {
    this.#config = params?.config ?? GameDataEmitter.DefaultConfig,
    this.#receivers = [];
    if (params?.receiver) {
      this.#receivers.push(params.receiver);
    }
    // @ts-ignore
    this.#collectors = {};
    this.#pendingData = [];
  }

  /** @param { (output:DataOutput) => void } receiver */
  addReciever(receiver) {
    this.#receivers.push(receiver);
  }

  startEmit() {
    if (this.#receivers.length == 0) {
      if (DEBUG.isDebug())
        console.error("No receiver");
      return ;
    }
    this.#lastEmittedDate = new Date().getTime();
    this.#emit();
  }

  /** @param {CollectTarget} target
   *  @param {() => Object} collector
   */
  setCollector(target, collector) {
    this.#collectors[target] = collector;
  }

  #emit() {
    const interval = this.#config.emitInterval.value * 
      (this.#config.emitInterval.unit == "SEC" ? 1000 : 1);
    if (this.#receivers.length == 0)
      return;
    setTimeout(() => {
      this.#emit();
    }, interval);
   
    const data = this.#pendingData;
    this.#pendingData = [];
    /** @type {DataOutput} */
    const output = {
      prefix: GameDataEmitter.outputPrefix,
      data: data.sort(
      (lhs, rhs) => 
        lhs.date > rhs.date ? 1: -1),
      emittedTime: new Date()
    };
    for (let receiver of this.#receivers) {
      receiver(output); 
    }
  }

  /** @param {EventType} type
   *  @param {Object} event
   */
  submitEvent(type, event) {
    /** @type {EventReactConfig} */
    const config = this.#config.event[type];
    const date = new Date().getTime();
    /** @type {EmitterData} */
    const formatted = {
      date,
      type: "EVENT",
      key: type,
      content: event
    };
    switch (config) {
      case("LAZY"):
        this.#pendingData.push(formatted);
        break;
      default:
        throw "not implemented";
    }
  }

  startCollecting() {
    if (this.#isCollecting)
      return ;
    this.#isCollecting = true;
    for (let k in this.#config.periodicalCollect) {
      /** @type {CollectTarget} */ //@ts-ignore 
      const target = k;
      const config = this.#config.periodicalCollect[target];
      if (config == "IGNORE")
        continue;
      this.#collect(target, config);
    }
  }

  /** @param {CollectTarget} target
   *  @param {DataInterval} interval
   * */
  #collect(target, interval) {
    if (!this.#isCollecting)
      return ;
    setTimeout(() => 
      this.#collect(target, interval),
      interval.value * (interval.unit == "SEC" ? 1000 : 1));
    const date = new Date().getTime();
    const collector = this.#collectors[target];
    if (collector) {
      const content = collector();
      if (isEmptyObject(content))
        return;
      this.#pendingData.push({
        date,
        type: "PERIODICAL",
        key: target,
        content
      });
    }
  }
}
