import GameData, { GAME_TYPE } from "@/data/game_data";
import GameDataEmitter, * as GDE from "@/game/game_data_emitter";
import { MAP_SIZE } from "@/data/game_map";
import GraphData,  * as GH from "@/data/graph.js"

/** @typedef { "RALLY"| "MATCH"| "TOURNAMENT" } Time */
/** @typedef { "ZONE_DURATION"| "BALL_ROUTE"| "HIT_ZONE"| "BALL_SPEED" } Attribute */

/** @typedef { Array<T> | Float32Array } Row<T> 
 *  @template { any } T
 **/

/** @typedef { Array<T> | Float32Array } Column<T> 
 *  @template { any } T
 **/

/** @typedef { Row<Column<T>> | Float32Array } Table 
 *  @template { any } T
 */

/** 
 * @typedef { Table<number> } ZONE_DURATIONFormat
 */
/**
 * @typedef { Record<number, number>[] } BALL_SPEEDFormat
 */

/** @typedef { ZONE_DURATIONFormat | BALL_SPEEDFormat } DataFormat */

export class DataRecord {

  static defaultConfig = Object.freeze({
    zoneDurationSizePrecision: 10,
  });

  /** @type {{
   *    type: Time,
   *    start: number,
   *    end: number,
   *    totalDuration: number
   * }} */
  #time;
  #config = DataRecord.defaultConfig;

  /** @type {{
   *  numRow: number,
   *  numColumn: number
   * }} */
  #zoneConfig;

  /** @type {{
   *  [key in Attribute]: DataFormat
  * }} */
  #data; 

  /** @param {{
   *  time: {
   *    type: Time,
   *    start: number,
   *    end: number
   *  }
   *  data: GDE.EmitterData[],
   * }} params
  */
  constructor({time, data}) {
    this.#time = { ...time, totalDuration: time.end - time.start };
    this.#zoneConfig = {
      numRow: Math.ceil(MAP_SIZE.height / this.#config.zoneDurationSizePrecision),
      numColumn: Math.ceil(MAP_SIZE.width / this.#config.zoneDurationSizePrecision)
    };

    this
      .#initData()
      .#generate(data);
  }

  export() {
    /** @type {{
     *   [ key in string ]: GH.GraphData
    * }} */
    const ballSpeed = new GraphData({
      type: "LINE",
      label: "Ball speed",
      axies: { "X": "time", "Y": "speed" },
      data: {
        "DEFAULT": this.#data.BALL_SPEED
      }
    });
    return ballSpeed;
  }

  #initData() {
    // @ts-ignore
    this.#data = {};
    this.#data.BALL_SPEED = [];
    {
      this.#data.ZONE_DURATION = new Float32Array(
        this.#zoneConfig.numRow * this.#zoneConfig.numColumn);
    }
    return this;
  }

  /** @param { GDE.EmitterData[] } allData */
  #generate(allData) {
    const filtered = {
      "BALL": [],
      "PEDDLE": [],
    };
    for (const data of allData) {
      switch (data.type) {
        case ("PERIODICAL"):
          if (filtered[data.key]) {
            filtered[data.key].push(data);
          }
          break;
        default: break;
      }
    }
    this.#analysisBall(filtered["BALL"]);
    return this;
  }

  /** @param { GDE.EmitterData[] } data */
  #analysisBall(data) {
    const position = [];
    for (const ballData of data) {
      const ball = ballData.content;
      const time = ballData.date;
      const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
      //@ts-ignore
      this.#data["BALL_SPEED"].push({
        time,
        speed
      });
      position.push({
        time: ballData.date,
        x: Math.max(Math.round(ball.position.x) + MAP_SIZE.halfWidth, 0),
        y: Math.max(Math.round(ball.position.y) + MAP_SIZE.halfHeight)
      });
    }
    if (position.length > 0)
      this.#analysisBallPosition(position);
    return this;
  }

  /** @param {{
   *    time: number,
   *    x: number,
   *    y: number
   *  }[]} position */
  #analysisBallPosition(position) {
    if (position.length == 1)  {
      // ?
      return ;
    }
    /** @type {Float32Array} */ //@ts-ignore
    const container = this.#data["ZONE_DURATION"];
    for (let i = 0; i < position.length - 1; ++i) {
      const cur = position[i], next = position[i + 1];
      const interval = next.time - cur.time;
      const slope = (next.y - cur.x) /  (next.x - cur.x);
      const pos = {
        x: cur.x,
        y: cur.y
      };
      const stepAxis = Math.abs(slope) > 1 ? "y" : "x";
      const subAxis = stepAxis == "x" ? "y": "x";
      const dir = stepAxis == "x" ? cur.x < next.x ? 1: -1
        : cur.y < next.y ? 1: -1; 
      let onLine = true;
      const subStep = stepAxis == "x" ? slope: 1 / slope;
      const totalStep = Math.abs(next[stepAxis] - pos[stepAxis]);
      const perStep = interval / totalStep;
      while (onLine) {
        pos[stepAxis] += dir;
        pos[subAxis] += subStep;
        const row = Math.round(pos.x / this.#config.zoneDurationSizePrecision);
        const column = Math.round(pos.y / this.#config.zoneDurationSizePrecision);
        container[
        this.#zoneConfig.numColumn * row + column] += perStep;
        onLine = dir > 0 ? pos[stepAxis] < next[stepAxis]:
          pos[stepAxis] > next[stepAxis];
      }
    }
  }
}

export default class GameAnalytics {

  /** @type { GameData } */
  #gameData;
  /** @type { boolean } */
  #isRallying;
  /** @type {{
   *  [key in Time]?: Table<GDE.EmitterData[]>
   * }}*/
  #unUsedData;
  /** @type {{
   *  [key in Time]?: number
   * }}*/
  #dataCursor;

  #records = [];

  /** @type { GDE.EmitterData[] } */
  get #currentBuffer() {
    return this.#unUsedData[this.#dataCursor.MATCH][this.#dataCursor.RALLY];
  }

  #_isTOURNAMENT;
  get isTOURNAMENT() {
    return this.#_isTOURNAMENT;
  }

  /** @param {{ 
   *    gameData: GameData
   * }} params */
  constructor({ gameData }) {
    this.#gameData = gameData;
    this.#_isTOURNAMENT = gameData.gameType == GAME_TYPE.localTournament;
    this.#dataCursor = {
      "RALLY": 0,
      "MATCH": 0,
    };
    this.#unUsedData = {};
    this.#unUsedData[0] = [[]];
    this.#dataCursor.TOURNAMENT = 0; // history
  }

  /** @param { GameDataEmitter } emitter */
  setEmitter(emitter) {
    emitter.addReciever((output) => this.#recieveData(output));
  } 

  createGraph() {
    return this.#records.map(r => r.export());
  }

  /** @param { GDE.DataOutput } dataOutput*/
  #recieveData(dataOutput) {
    for (let data of dataOutput.data) {
      if (data.type == "EVENT") {
        this.#onEvent(data);
      }
      else if (this.#isRallying) {
        this.#currentBuffer.push(data);
      }
      //ignore data
    }
  }

  /** @param { GDE.EmitterData } data */
  #onEvent(data) {
    switch (data.key) {
      case ("GAME_DATA_CHANGED"):
        this.#onStateChanged(data);
        break;
      default:
        if (this.#isRallying)
          this.#currentBuffer.push(data);
        break;
    }
  }

  /** @param { GDE.EmitterData } data */
  #onStateChanged(data) {
    this.#currentBuffer.push(data);
    switch (data.content.description) {
      case ("START_RALLY"):
        this.#isRallying = true;
        break;
      case ("WIN_SCORE"):
        this.#moveCursor("RALLY") 
        this.#isRallying = false;
        break;
      case ("NEXT_MATCH"):
        this.#moveCursor("MATCH");
        this.#isRallying = false;
      case ("END_MATCH"):
        this.#isRallying = false;
      default: 
        break;
    }
  }

  /** @param { Time } next */
  #moveCursor(next) {
    this.#createRecord(this.#currentBuffer);
    switch (next) {
      case "RALLY":
        this.#dataCursor.RALLY += 1;
        this.#unUsedData[this.#dataCursor.MATCH][this.#dataCursor.RALLY] = [];
        break;
      default: break;
    }
  }

  /** @param { GDE.EmitterData[] } data */
  #createRecord(data) {
    if (data.length < 2)
      return ;
    /** @type {Time} */
    const type = "RALLY"
    const start = data[0].date;
    const end = data[data.length - 1].date;

    const record = new DataRecord({
      time: { type, start, end },
      data,
    });
    this.#records.push(record);
  }
}

export const Types = {};
