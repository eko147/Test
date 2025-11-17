import View from "@/lib/view";
import Scene from "@/game/scene";
import GameData,{ GAME_TYPE } from "@/data/game_data";
import ObservableObject from "@/lib/observable_object";
import { GameMap, WALL_TYPES } from "@/data/game_map";
import TournamentPanel from "@/views/components/tournament_panel";
import * as PU from "@/data/power_up";
import Asset from "@/game/asset";
import ColorPicker from "@/views/components/color_picker.js";
import Observable from "@/lib/observable";
import { getRandomFromArray } from "@/utils/type_util";
import GameDataEmitter from "@/game/game_data_emitter";
import globalData, { DEBUG, STATE } from "@/data/global";
import { NAVIGATE_DRIRECTION, route } from "@/router";
import ResultModal from "@/views/components/result_modal";
import { requestRefresh } from "@/utils/httpRequest";

export default class GameView extends View {

  /** @type {HTMLCanvasElement} */
  #canvas;
  /** @type {Scene} */
  #scene;
  /** @type {ObservableObject} */
  #data;
  /** @type {GameData} */
  #gameData;
  #isPaused = true;
  /** @type {HTMLButtonElement} */
  #startButton;
  /** @type {HTMLButtonElement} */
  #resetButton;
  /** @type {HTMLButtonElement} */
  #tournamentButton;
  /** @type {HTMLButtonElement} */
  #returnGameButton;
  /** @type{GameMap} */
  #gameMap;
  /** @type {boolean} */
  #isReadyToPlay = false;
  /** @type {Observable[]} */
  #pickerColors = [];
  /** @type {GameDataEmitter} */
  #dataEmitter;

  // @ts-ignore
  constructor({data}) {
    super({data: data.gameData()});
    const game = data.gameData();
    if (!game || !data.gameMap()){
      return ;
    }
    this.#setState();
    this.#data = game;
    //@ts-ignore
    this.#gameData = game;
    this.#data.subscribe("scores", 
      (/**@type {{ [key: string]: number }} */ newScores) =>
      this.#onScoreUpdate(newScores));
    this.#gameMap = data.gameMap();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.#data == null) {
      window.history.back();
      return ;
    }
    Asset.shared.onLoaded(() => {
      if (DEBUG.isDebug())
        console.log(`Asset load ${Asset.shared.loadedPercentage * 100}%`);
    })
    this
      .#givePowerUps()
      .#createScene()
      .#addColorPicker()
      .#initHelperText()
      .#initButtons()
      .#initEvents();
    /** @type {GameData} */ //@ts-ignore
    if (this.#gameData.gameType == GAME_TYPE.localTournament) {
      this.#initTournament();
    }
    else if (this.#gameData.gameType == GAME_TYPE.remote) {
      this.#scene.setDataEmitter(this.#dataEmitter)
      this.#dataEmitter.startCollecting();
      this.#dataEmitter.startEmit();
    }
  }

  #setState() {
    STATE.setPlayingGame(true);
    STATE.setCancelGameCallback(
      () => new Promise(resolve => 
        this.#onRequestCancel(resolve)
      )
    );
  }

  /** @param {(_: boolean) => void} callback */
  #onRequestCancel(callback) {
    
    const alert = this.querySelector("#close-alert" );
    alert.animate([
      { transform: `translateY(-150%)`},
      { transform: `translateY(0%)`},
    ],
      {
        duration: 500,
        fill: "forwards"
      }
    )

    const onPress = (cancel) => {
      if (cancel)
        globalData.removeGame();

      callback(cancel);
    };

    this.#setAlertButton(onPress, alert);
  }

  #setAlertButton(callback, alert) {
    const closeButton = this.querySelector("#close-button");
    closeButton.addEventListener("click", 
      () => {
        callback(true);
      }
    );

    const cancelButton = this.querySelector("#cancel-button");
    cancelButton.addEventListener("click",
      () => {
        callback(false);

        alert.animate([
          { transform: `translateY(0%)`},
          { transform: `translateY(-150%)`},
        ],
          {
            duration: 500,
            fill: "forwards"
          }
        )
      }
    );
  }

  #createScene() {
    this.#canvas = this.querySelector("#game-canvas")
    const container = this.#canvas.parentElement;
    this.#canvas.width = container.offsetWidth
    this.#canvas.height = container.offsetHeight;
    this.#scene = new Scene({
      canvas: this.#canvas,
      gameData: this.#data,
      gameMap: this.#gameMap,
      stuckHandler: (isStuck) => {
        this.#resetButton.style.visibility = isStuck ? "visible": "hidden";
        this.#resetButton.disabled = !isStuck;
      }
    });
    return this;    
  }

  #initHelperText() {
    /** @type {HTMLParagraphElement} */
    const container = this.querySelector("#help-text");
    let text = "";
    const controls = this.#gameData.controls;
    controls.forEach((control, index) => {
      text += index == 0 ? "Player 1" : "Player 2";
      text += '\n';
      text += `left: ${control.left} \n`
      text += `right: ${control.right} \n`
      if (this.#gameData.isPowerAvailable) {
        text += `power up: ${control.powerUp}\n`
      }
      text += '\n';
    })
    text += "Change 🎵: Click 📻";
    container.innerText = text;
    return this;
  }

  #initButtons() {
    this.#initStartButton()
    .#initResetButton()
    .#initTournamentButton()
    .#initReturnGameButton(); 
    return this;
  }

  #initStartButton() {
    this.#startButton = this.querySelector("#start-button");
    setTimeout(() => {
      this.#startButton.style.visibility = "visible";  
      this.#isReadyToPlay = true;
    }, 4000);

    this.#startButton
      .addEventListener("click", () => {
        if (!this.#isReadyToPlay)
          return ;

        if (this.#isPaused) {
          this.#scene.startGame();
          this.#isPaused = false;
          this.#startButton.style.visibility = "hidden";
        }
      });
    return this;
  }

  #initResetButton() {
    this.#resetButton = this.querySelector("#reset-button");
    this.#resetButton.addEventListener("click", () => {
      this.#scene.resetBall();
      this.#resetButton.style.visibility = "hidden";
      this.#resetButton.disabled = true;
    });
    return this;
  }

  #initTournamentButton() {
    this.#tournamentButton = this.querySelector("#tournament-button");
    this.#tournamentButton.disabled = true;
    if (this.#gameData.gameType != GAME_TYPE.localTournament) {

      this.#tournamentButton.style.visibility = "hidden";
      return this;
    }
    this.#tournamentButton.style.opacity = "0.3";
    this.#tournamentButton.addEventListener("click",
      () => {
        this.#startButton.style.visibility = "hidden";
        this.#tournamentButton.style.opacity = "0.3"; 
        this.#isReadyToPlay = false;

        this.#scene.showTournamentBoard(() => {
          this.#returnGameButton.style.visibility = "visible";
          this.#returnGameButton.style.opacity = "1";
          this.#returnGameButton.disabled = false;
          this.#tournamentButton.disabled = true;
        });
      })
    return this;
  }

  #initReturnGameButton() {

    this.#returnGameButton = this.querySelector("#return-game-button");
    this.#returnGameButton.style.visibility = "hidden";
    this.#returnGameButton.disabled = true;
    this.#returnGameButton.addEventListener("click", 
      () => {
        this.#returnGameButton.style.visibility = "hidden";
        this.#scene.goToGamePosition(this.#returnToGame.bind(this));
      }
    );
    return this;
  }

  #addColorPicker() {
    const containers = this.querySelectorAll(".container-for-player");  
    const pickerSize = {
      width: 50,
      height: 50
    };
    for (let i = 0; i < containers.length; ++i) {
      const playerColor = new Observable(this.#scene.getPlayerColor(this.#gameData.currentPlayers[i]));
      this.#pickerColors.push(playerColor);
      const colorPicker = new ColorPicker({
        color: playerColor,
        onPickColor: (color) => {
          this.#scene.setPlayerColor(
            this.#gameData.currentPlayers[i],
            color
          );
        },
        size: pickerSize
      }) ;
      /** @type {HTMLElement} */ //@ts-ignore
      const container = containers[i];
      colorPicker.render().then (() => {
        colorPicker.addEventListener("mouseenter", () => {
          /** @type{HTMLElement} */
          const picker = colorPicker.querySelector("#picker-container"); 
          picker.style.transform = "scale(2,2)";
          picker.style.transformOrigin = `${pickerSize.width * -0.3}px ${pickerSize.height * -0.3}px`;
        });

        colorPicker.addEventListener("mouseleave", () => {
          /** @type{HTMLElement} */
          const picker = colorPicker.querySelector("#picker-container"); 
          picker.style.transform = "scale(1, 1)";
        });
        container.appendChild(colorPicker);
      }
      );
    }
    return this;
  }

  #initEvents() {
    window.addEventListener("keypress", event => {
      if (event.key == "Enter" && this.#isPaused) {
        if (!this.#isReadyToPlay)
          return ;
        this.#scene.startGame();
        this.#isPaused = false;
        this.#startButton.style.visibility = "hidden";
      }
    }) 
    return this;
  }

  #initTournament() {
    this.#showTournamentBoard();
    return this; 
  }

  #showNextMatch() {
    /** @type {GameData} */ //@ts-ignore
    const nextPlayers = this.#gameData.currentPlayers;
    /** @type {NodeListOf<HTMLSpanElement>}*/
    const labels = this.querySelectorAll(".player-nickname");
    labels[0].innerText = nextPlayers[0].nickname;
    labels[1].innerText = nextPlayers[1].nickname;
    /** @type {NodeListOf<HTMLSpanElement>}*/
    const scoresLabels = this.querySelectorAll(".score-placeholder");
    scoresLabels[0].innerText = "0";
    scoresLabels[0].dataset["player"] = nextPlayers[0].nickname;
    scoresLabels[1].innerText = "0";
    scoresLabels[1].dataset["player"] = nextPlayers[1].nickname;
    this.#scene.showNextMatch();
    for (let [i, player] of this.#gameData.currentPlayers.entries()) {
      const color = this.#scene.getPlayerColor(player);
      this.#pickerColors[i].value = color;
    }
    return this;
  }

  #givePowerUps() {
    if (!this.#gameData.isPowerAvailable) {
      return this;
    }
    const allPowerUps = [
      PU.BUFFS.peddleSize,
      PU.BUFFS.peddleSpeed,
      PU.DEBUFFS.peddleSize,
      PU.DEBUFFS.peddleSpeed
    ];
    for (let player of this.#gameData.currentPlayers) {
      for (let i = 0; i < this.#gameData.winScore; ++i ) {
        if (this.#gameData.getPowerUpCountFor(player) >= this.#gameData.winScore)
          break;
        const powerUp = getRandomFromArray(allPowerUps);
        this.#gameData.givePowerUpTo({
          player,
          powerUp
        });
      }
    }
    return this;
  }

  async #showTournamentBoard() {
    const panel = new TournamentPanel({
      data:this.#data,
      onUpdated : () => this.#updatedTournamentBoard(panel)
    });

    panel.defaultBoardStyle = {
      display: "block",
      width:  "1600px",
      height: "1200px",
    };
    await panel.render();
    /** @type {HTMLElement} */ //@ts-ignore
    const board = panel.children[0];
    this.#scene.createBoard(board);
  }

  disconnectedCallback() {
    if (this.#data == null) {
      return ;
    }
    super.disconnectedCallback();
    this.#scene.prepareDisappear();
    this.#scene = null;
    STATE.setPlayingGame(false);
  }

  async #updatedTournamentBoard(panel) {
    /** @type {HTMLElement} */ //@ts-ignore
    const board = panel.children[0];
    this.#scene.updateBoard(board);
  }

  /** @param {{ [key: string]: number }} newScores) */
  #onScoreUpdate(newScores) {
    /** @type {GameData} */
    for (let player of this.#gameData.currentPlayers) {
      const score = newScores[player.nickname];
      /** @type {HTMLSpanElement} */
      const label = this.querySelector(
        `span[data-player='${player.nickname}']`);
      label.innerText = score.toString();
      if (score == this.#gameData.winScore) {
        this.#scene.endGame(
          this.#gameData.isEnded ? () => this.#onFinishGame(): null);
        switch (this.#gameData.gameType) {
          case (GAME_TYPE.local1on1):
            this.#isReadyToPlay = false;
            break;
          case GAME_TYPE.localTournament:
            const tournament = this.#gameData.tournament;
            if (tournament.isLastRound) {
              return ;
            }
            tournament.goToNextMatch(); 
            this.#tournamentButton.disabled = false;
            this.#tournamentButton.style.opacity = "1";
            this.#startButton.disabled = true;
            this.#startButton.style.visibility = "hidden";
            this.#isReadyToPlay = false;
            break;
          default: break;
        }
      }
    }
    this.#isPaused = true;
    if (this.#isReadyToPlay) {
      this.#startButton.style.visibility = "visible";
    }
  }

  #findWinner() {
    const scores = this.#gameData.scores;
    const players = this.#gameData.currentPlayers;
    if (scores[players[0].nickname] > scores[players[1].nickname]) {
      return players[0];
    }
    return players[1];
  }

  async #onFinishGame() {
    let delay = 1;
    if (this.#gameData.gameType == GAME_TYPE.localTournament) {
      delay = 2;
    }
    const winner = this.#findWinner().nickname;
   
    const modal = new ResultModal({
      data: {
        delay,
        text: winner + "의 승리!"
      },
      confirmHandler: () => {
        route({
          path: "/",
          direction: NAVIGATE_DRIRECTION.backward,
          callback: () => window.location.assign("/")
        }, 

        )
      }
    });
    await modal.render();
    this.appendChild(modal); 
    const finalScores = this.#gameData.finalScores;
    sendResult(finalScores, this.#gameData.gameType)
      .then(() => globalData.removeGame())
      .catch(err => {
        if (DEBUG.isDebug())
          console.error(err);
      })
  }

  #returnToGame() {
    this.#isReadyToPlay = true;
    this.#returnGameButton.style.visibility = "hidden";
    this.#startButton.style.visibility = "visible";
    this.#startButton.disabled = false;
    this
      .#showNextMatch()
      .#givePowerUps();
  }

}

function _url() {
  return "https://" + window.location.hostname;
}

export async function getToken(needRefresh = false) {
  const accessToken = localStorage.getItem("access");
  const refreshToken = localStorage.getItem("refresh");

  if (!accessToken)
    return null;

  if (!needRefresh)
    return accessToken;

  if (!refreshToken)
    return null;

  const url = new URL("/api/token/refresh/", _url());
  const res = await fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + accessToken
    },
    body: JSON.stringify( {
      "refresh": refreshToken
    })
  })
  if (!res.ok)
    return null;
  const json = await res.json(); 
  const { access, refresh } = json;
  if (access)
    localStorage.setItem("access", access);

  if (refresh) 
    localStorage.setItem("refresh", refresh);
  return access ?? null;
}

export async function getUsername(retry = false) {
  const accessToken = await getToken();

  const url = new URL("/api/users/me/profile/", _url());
  try {
  const res = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + accessToken
    },
  })
  if (!res.ok && !retry && res.status == 401) {
    await requestRefresh();
    return await getUsername(true); 
  }
  else if (!res.ok) {
    return null;
  }
  const json = await res.json();
  return json["username"] ?? "USER";
  } catch  {
    return "USER";
  }
}

async function sendResult(scores, gameType) {
 
  const username = await getUsername();
  const accessToken = await getToken();

  /** @type { URL | string } */
  let url = _url();
  const time = dateFormat(new Date());
  let body = null;
 
  switch (gameType) {
    case (GAME_TYPE.local1on1):
      let player1 = Object.keys(scores[0]).find(name => name == username);
      if (!player1) {
        player1 = Object.keys(scores[0])[0];
      }
      const player2 = Object.keys(scores[0]).find(name => name != player1);
      if (!player1 || !player2)
        return ;
      url = new URL("/api/game/me/1v1s/", url);
      body = {
        "player_one": player1,
        "player_two": player2,
        "player_one_score": scores[0][player1],
        "player_two_score": scores[0][player2],
        time
      };
      break;
    case (GAME_TYPE.localTournament):
      if (scores.length < 3)
        return ;

      url = new URL("/api/game/me/tournaments/", url);
      body = {};
      let lastOne = null;
      if (scores[0]["playerA"].score > scores[0]["playerB"].score) {
        lastOne = { name: scores[0]["playerA"].name };
      }
      else
        lastOne = { name: scores[0]["playerB"].name };
      
      let lastTwo = null;
      if (scores[1]["playerA"].score > scores[1]["playerB"].score) {
        lastTwo = { name: scores[1]["playerA"].name };
      }
      else
        lastTwo = { name: scores[1]["playerB"].name };

      if (scores[2]["playerA"].name == lastOne.name) {
        lastOne.score = scores[2]["playerA"].score;
        lastTwo.score = scores[2]["playerB"].score;
      }
      else {
        lastOne.score = scores[2]["playerB"].score;
        lastTwo.score = scores[2]["playerA"].score;
      }

      scores.slice(0, 3).forEach(
      (score, i) => {
        let key = "game_", one = "playerA", two = "playerB";
        switch (i) {
          case (0): key += "one"; break; 
          case (1): key += "two"; one = "playerB"; two = "playerA"; break;
          case (2): key += "three"; break;
        }
        if (i == 2) {
          body[key] = {
            "player_one": lastOne.name,
            "player_two": lastTwo.name,
            "player_one_score": lastOne.score,
            "player_two_score": lastTwo.score,
            time: dateFormat(score["time"])
          };
        }
        else {
          body[key] = {
            "player_one": score[one].name,
            "player_two": score[two].name,
            "player_one_score": score[one].score,
            "player_two_score": score[two].score,
            time: dateFormat(score["time"])
          };
        }
      }
      );
      break;
    default:
      return ;
  }

  fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + accessToken
    },
    body: JSON.stringify(body)
  }).catch(e => console.error(e));
}

function dateFormat(date) {
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hour = date.getHours();
  let minute = date.getMinutes();
  let second = date.getSeconds();

  month = month >= 10 ? month : '0' + month;
  day = day >= 10 ? day : '0' + day;
  hour = hour >= 10 ? hour : '0' + hour;
  minute = minute >= 10 ? minute : '0' + minute;
  second = second >= 10 ? second : '0' + second;

  return date.getFullYear() + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;
}
