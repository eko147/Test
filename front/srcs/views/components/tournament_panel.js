import GameData from "@/data/game_data";
import { DEBUG } from "@/data/global";
import View from "@/lib/view";

/** @typedef {Object} Match 
 *  @property {{
 *    name: string,
 *    score: number | null,
 *    class: string
 *  }} playerA
 *  @property {{
 *    name: string,
 *    score: number | null,
 *    class: string
 *  }} playerB
*/

export default class TournamentPanel extends View {

  /** @type {{
   *   rounds: 
   *     {
   *      playerCounts: number
   *      matches : Match[]
   *     }[]
  * }} */
  data;
  onUpdated;
  defaultBoardStyle;

  constructor(params) {
    /** @type {GameData} */
    const gameData = params?.data;
    if (gameData) {
      const rounds = gameData.tournament.allRounds;
      super({data: { rounds }});
      this.data = { rounds };
      this.onUpdated = params?.onUpdated ?? null;
      //@ts-ignore
      gameData.subscribe("scores", () => {
        this.updatePanel(gameData.tournament.allRounds)
      })
    }
    else if (DEBUG.isDebug()){
      console.error("no data for TournamentPanel");
    }
  }

  async updatePanel(newRounds) {
    this.data = { rounds: newRounds };
    await this.render();
    if (this.onUpdated)
      this.onUpdated();
  }

  didRendered() {
    super.didRendered();
    if (this.defaultBoardStyle) {
      /** @type {HTMLElement} */ //@ts-ignore
      const board = this.children[0];
      for (let key in this.defaultBoardStyle) {
        board.style[key] = this.defaultBoardStyle[key];
      }
    }
    this.querySelectorAll("ul")
      .forEach(ul => {
        const space = document.createElement("li");
        space.innerHTML = "&nbsp;";
        ul.appendChild(space)
      }) 
  }
}
