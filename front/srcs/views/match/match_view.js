import Observable from "@/lib/observable";
import View from "@/lib/view";
import { NAVIGATE_DRIRECTION, route } from "@/router";
import httpRequest from "@/utils/httpRequest";
import { getUsername } from "@/views/game/game_view";

export default class MatchView extends View {


  mapModal = {};

  /** @type { HTMLAnchorElement } */
  #startButton;
  setNickname;
  setMap;
  setSpeed;
  setPowerUp;

  /** @type {{
   * nicknames: boolean,
   * map: boolean,
   * powerUp: boolean,
   * peddleSpeed: boolean
   * }} */ 
  #parameter = {
    nicknames: false,
    map: false,
    powerUp: false,
    peddleSpeed: false
  };

  /** @param {string} name*/ 
  #setParameter(name)  {
    this.#parameter = ({
      ...this.#parameter, //@ts-ignore
      [name]: true
    });
    if (Object.values(this.#parameter).indexOf(false) == -1) {
      this.#startButton.id = "";
    }
  }

  constructor({data, registerGame}) {
    super();
    this.data = data
    const { parameter } = registerGame;
    this.setNickname = /** @param{ string[] } nicknames */
      (nicknames) => parameter({nicknames})
    this.setMap =  /** @param{ any }  map */
      (map) => parameter({map})
    this.setSpeed = /** @param{ number } speed */
      (speed) => parameter({ speed })
    this.setPowerUp = /** @param{ boolean } powerUp */
      (powerUp) => parameter({ powerUp })
  }

  _initUserCard(data) {
    const userAvatar = this.querySelector('.match-player-card .user-avatar-match');
    const userLevelId = this.querySelector('.match-player-card .user-level-id');
    const userScore = this.querySelector('.match-player-card .score');
    const stateMessage = this.querySelector('.match-player-card .state-message');

    userLevelId.textContent = `Lv ${data.level} ${data.username}`
    this.username = data.username;
    userAvatar.src = `data:image;base64,${data.avatar}`;
    userScore.textContent = `${data.wins} 승 ${data.loses} 패`;
    stateMessage.textContent = `${data.message}`;
    this.#setNicknames();
  }

  async _fetchUserInfo() {
    const url = `${window.location.protocol}//${window.location.host}/api/users/me/profile/`;

    await httpRequest('GET', url, null, this._initUserCard.bind(this));
  }

  _setPaddleModal() {
    const paddleModalBtn = this.querySelector('#confPaddleBtn');
    const paddleModal = this.querySelector('.paddle-wrap');

    paddleModalBtn.addEventListener('click', () => {
      paddleModal.style.display = 'flex'
    })

    paddleModal.querySelector('.btn-close').addEventListener('click', () => {
      paddleModal.style.display = 'none';
    })

    paddleModal.querySelector('.submit').addEventListener('click', () => {
      paddleModal.style.display = 'none';
      this.#setParameter("peddleSpeed");
    })

    paddleModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget)
        paddleModal.style.display = 'none';
    })

    this.querySelector("#paddleSpeed").addEventListener("input", (event) => { //@ts-ignore
      this.setSpeed( Number(event.target.value) )
    })
  }

  _setItemModal() {
    const itemModalBtn = this.querySelector('#confItemBtn');
    const itemModal = this.querySelector('.item-wrap');
    const itemBtns = this.querySelector('.item-btns');

    itemModalBtn.addEventListener('click', () => {
      itemModal.style.display = 'flex'
    })

    itemModal.querySelector('.btn-close').addEventListener('click', () => {
      itemModal.style.display = 'none';
    })

    itemModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget)
        itemModal.style.display = 'none';
    })

    itemBtns.addEventListener('click', () => {
      // TODO: use-item vs disuse-item
      itemModal.style.display = 'none';

    })
    for (const child of Array.from(itemBtns.querySelectorAll("button"))) {
      /** @type { HTMLButtonElement } */ //@ts-ignore
      const button = child;
      const useItem = button.classList.contains("use-item");
      button.addEventListener("click", () => {
        this.setPowerUp(useItem);
        this.#setParameter("powerUp");
      })
    }
  }

  connectedCallback() {
    super.connectedCallback();
    const styleElement = document.createElement('style');
    styleElement.textContent = `#game-link{ display: none !important}`;
    document.head.append(styleElement);
    const mapModalBtn = this.querySelector('#confMapBtn');
    const mapModal = this.querySelector("#map-modal");
    this.#startButton = this.querySelector("a[href='/game']");
    this.#startButton.id = "game-link";

    mapModalBtn.addEventListener("click", () => {
      mapModal.style.display = "block";
      if (!this.mapModal["allMaps"]) {
        const allCanvas = mapModal.querySelectorAll("canvas");

        this.mapModal["allMaps"] = allCanvas;
        allCanvas.forEach(c => {
          c.addEventListener("click", 
            () =>  {
              mapModal.style.display = "none";
              this.setMap(c.dataset.map);
              this.#setParameter("map");
            }
          ) 
        })
      }
    })

    this._fetchUserInfo();
    this._setPaddleModal();
    this._setItemModal();

    const backBtn = document.getElementById('move-to-mode');
    backBtn.addEventListener('click', () => {
      route({
        path: '/mode',
        direction: NAVIGATE_DRIRECTION.backward
      })
    })
  }

  async #setNicknames() {
    let username = this.username ?? await getUsername();
    const opponentName = 'guest';
    username = username ?? "PLAYER";
    if (username.trim() == "" || opponentName.trim() == "")
      return ;
    this.setNickname([username, opponentName]);
    this.#setParameter("nicknames");
  }
}
