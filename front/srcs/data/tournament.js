import Player from "@/data/player";
import { DEBUG } from "./global";

/** @typedef {Object} Match 
 *  @property {{
 *    name: string,
 *    score: number | "",
 *    class: string
 *  }} playerA
 *  @property {{
 *    name: string,
 *    score: number | "",
 *    class: string
 *  }} playerB
 *  @property { Date } time
*/

/** Tournament. */
export default class Tournament {

  /** @param {string[]} names */
  static hasDuplicatedName(names) {
    /** @type {Set<string>} */
    const nameSet = new Set();
    for (let name of names) {
      if (nameSet.has(name))
        return true;
      else 
        nameSet.add(name);
    }
    return false;
  }

  /** @type {number} */
  #_currentMatchIndex;

  /** @type {number} */
  #_winScore;

  /** @type {{
   *    numberOfPlayers: number,
   *    matches: Match[],
   * }} */
  #_currentRound;

  #_allRounds;

  get allRounds() {
    return this.#_allRounds;
  }

  get allMatches() {
    const allMatches = [];
    this.#_allRounds.forEach(round => 
      allMatches.push(...round.matches)
    );
    return allMatches;
  }

  /** @type {Player[]} */
  #allPlayers;

  /** @returns {Match} */
  get currentMatch() {
    return {...this.#_currentRound.matches[this.#_currentMatchIndex]};
  }

  /** @param {{
   *  player: Player, 
   *  score: number
   *  }} params
   */
  setScore({player, score}) {
    const match = this.#_currentRound.matches[this.#_currentMatchIndex];
    if (match.playerA.name == player.nickname) 
      match.playerA.score = score;
    else if (match.playerB.name == player.nickname) 
      match.playerB.score = score;
  }

  get currentPlayers() {
    const playerNames = [this.currentMatch.playerA.name, this.currentMatch.playerB.name];
    return playerNames.map(name => this.#allPlayers.find(p => p.nickname == name));
  }

  /** @returns {{
   *    numberOfPlayers: number,
   *    matches: Match[]
   * }} */
  get currentRound() {
    return {...this.#_currentRound};
  }

  goToNextMatch() {
    if (!this.isCurrentMatchFinished)
      throw ("current match is not finished");
    const match = this.#_currentRound.matches[this.#_currentMatchIndex];
    if (match.playerA.score > match.playerB.score) {
      match.playerA.class = "winner";
      match.playerB.class = "looser";
    }
    else {
      match.playerB.class = "winner";
      match.playerA.class = "looser";
    }

    if (this.#_currentMatchIndex + 1 < this.#_currentRound.matches.length) 
      this.#_currentMatchIndex += 1;
    else if (this.isLastRound) {
      if (DEBUG.isDebug())
        console.error ("tournament is finished");
      return ;
    }
    else {
      this.#goToNextRound();
      this.#_currentMatchIndex = 0;
    }
    this.#_currentRound.matches[this.#_currentMatchIndex].playerA.score = 0;
    this.#_currentRound.matches[this.#_currentMatchIndex].playerB.score = 0;
    this.#_currentRound.matches[this.#_currentMatchIndex].time = new Date();
  }

  get isCurrentMatchFinished() {
    const match = this.currentMatch;
    return (match.playerA.score >= this.#_winScore ||
      match.playerB.score >= this.#_winScore);
  }

  get isLastRound() {
    return this.currentRound.numberOfPlayers == 2;
  }

  get winnerByDefault() {
    if (this.currentMatch.playerB.name == "")
      return this.currentMatch.playerA;
    else if(this.currentMatch.playerA.name == "") 
      return this.currentMatch.playerB;

    return null;
  }

  #goToNextRound() {
    const nameOfWinners = this.currentRound.matches.reduce(
      /** @param {string[]} arr
       * @param {Match} match */
    (names, match) => {
      if (match.playerA.score > match.playerB.score)
        names.add(match.playerA.name);
      else 
        names.add(match.playerB.name);
      return names;
    }, new Set);

    const newRound = this.#createRound(
      this.#allPlayers.filter(
        player => nameOfWinners.has(player.nickname)
      )
    );
    this.#_allRounds.push(newRound);
    this.#_currentRound = newRound;
  }

  /**
   * constructor.
   * @param {{
   *  players: Player[],
   *  winScore: number
   * }} params
   */
  constructor({ players, winScore }) {
    this.#allPlayers = players;
    this.#_winScore = winScore;
    this.#_currentRound = this.#createRound(players);
    this.#_currentMatchIndex = 0;
    this.#_allRounds = [this.#_currentRound];
    this.#_currentRound.matches[this.#_currentMatchIndex].playerA.score = 0;
    this.#_currentRound.matches[this.#_currentMatchIndex].playerB.score = 0;
    this.#_currentRound.matches[this.#_currentMatchIndex].time = new Date();
  }

  /** @param { Player[] } players */
  #createRound(players) {
    let numberOfPlayers = players.length;
    while (numberOfPlayers % 2 != 0)
      numberOfPlayers++;
    const playerIndices = [...Array(players.length).keys()];
    const round = {
      numberOfPlayers,
      matches: []
    }
    playerIndices.sort(() => Math.random() - 0.5);
    while (numberOfPlayers > 0) {
      const playerA = playerIndices.length > 0 ? players[playerIndices.pop()]: null;
      const playerB = playerIndices.length > 0 ? players[playerIndices.pop()]: null;
      round.matches.push({
        playerA: {
          name: playerA?.nickname ?? "",
          score: "",
          class: "",
        },
        playerB: {
          name: playerB?.nickname ?? "",
          score: "",
          class: ""
        },
      })
      numberOfPlayers -= 2;
    }
    return round;
  }
}

export const Types = {};
