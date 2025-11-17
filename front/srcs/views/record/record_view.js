import globalData from "@/data/global";
import View from "@/lib/view";
import httpRequest from "@/utils/httpRequest";

export default class RecordView extends View {

  #username = null;

  constructor({ data }) {
    super();
    this.data = data;
  }

  async #fetchAndRenderPvpResults() {
    let url = `${window.location.protocol}//${window.location.host}`;
    /** @type { string | URL } */
    if (this.#username) {
      url = new URL(`/api/game/${this.#username}/1v1s/`, url);
    }
    else {
      url = new URL(`/api/game/me/1v1s/`, url);
    }

    httpRequest("GET", url, null, (res) => {
      const pvpLists = this.querySelector("#pvp-lists");
      const pvpListTemplate = this.querySelector("#pvp-list-template");

      res.forEach((res, index) => {
        const documentFragment = document.importNode(
          pvpListTemplate.content,
          true
        );
        const pvpListElement = documentFragment.querySelector("li");
        const winner = pvpListElement.querySelector(".winner");
        const detail = pvpListElement.querySelector(".score-detail");
        const date = pvpListElement.querySelector(".score-date");

        if (res.player_one_score > res.player_two_score)
          winner.textContent = `👑 ${res.player_one}`;
        else 
          winner.textContent = `👑 ${res.player_two}`;
        detail.textContent = `${res.player_one_score}:${res.player_two_score}`;
        date.textContent = `${res.time}`;
        pvpLists.appendChild(pvpListElement);
      })
      }, (res) => {
        console.error("can't fetch record data: ", res);
      });
    }

  #fetchTournamentDetail(res) {
    const tournamentDetailGroup = this.querySelector('#tournament-detail-list');
    const tournamentDetails = tournamentDetailGroup.querySelectorAll('li');
    const modal = this.querySelector("#infoModal");
    let winner;

    if (res.game_three.player_one_score > res.game_three.player_two_score)
      winner = res.game_three.player_one;
    else
      winner = res.game_three.player_two;
    this.querySelector('.tournament-winner').textContent = `👑 ${winner}`;
    let data;
    for (let i = 0; i < 3; i++)
    {
      if (i == 0)
        data = res.game_one;
      else if (i == 1)
        data = res.game_two;
      else
        data = res.game_three;
      tournamentDetails[i].querySelector('.tournament-play').textContent = `${data.player_one} VS ${data.player_two}`;
      tournamentDetails[i].querySelector('.score-detail').textContent = `${data.player_one_score}:${data.player_two_score}`;
      tournamentDetails[i].querySelector('.second-score-date').textContent = `${data.time}`;
    }
    modal.style.display = "flex";
  }

  #modalEventSet(moreInfoBtn) {

    moreInfoBtn.addEventListener("click", async (e) => {
      const tournamentId = e.target.closest('li').getAttribute('data-game-id');
      const url = `${window.location.protocol}//${window.location.host}/api/game/tournaments/${tournamentId}/`
      await httpRequest("GET", url, null, this.#fetchTournamentDetail.bind(this), (url, res) => {
        console.error(`can't fetch record data: `, res);
      })
    });
    const modal = this.querySelector("#infoModal");
    const closeModalBtn = document.getElementsByClassName("close")[0];
    closeModalBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });
    window.addEventListener("click", function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    });
  }
  
  async #fetchAndRenderTournamentResults() {
    /** @type { string | URL } */
    let url = window.location.href;
    if (this.#username) {
      url = new URL(`/api/game/${this.#username}/tournaments/`, url);
    }
    else {
      url = new URL(`/api/game/me/tournaments/`, url);
    }

    httpRequest("GET", url, null, (res) => {
      const tournamentGroup = this.querySelector('#tournament-group');
      const tournamentTemplate = this.querySelector('#tournament-list-template');
      res.forEach((tournament, index) => {
        const documentFragment = document.importNode(tournamentTemplate.content, true);
        const tournamentElement = documentFragment.querySelector('li');
        const winner = tournamentElement.querySelector('.score-detail');
        const time = tournamentElement.querySelector('.tournament-time');
        const moreInfoBtn = tournamentElement.querySelector('#infoBtn');
    
        this.#modalEventSet(moreInfoBtn);
        winner.textContent = `👑 ${tournament.winner}`;
        time.textContent = `${tournament.time}`;
        tournamentElement.setAttribute('data-game-id', `${tournament.id}`);
        tournamentGroup.appendChild(tournamentElement);
      });
    }, (url, res) => {
      console.error('Error fetching and rendering tournament results:', url, res);
    })
  }

  #fetchProfileInfo() {
    /** @type { string | URL } */
    let url = `${window.location.protocol}//${window.location.host}`;
    if (this.#username) {
      url = new URL(`/api/users/${this.#username}/profile/`, url);
    }
    else {
      url = new URL(`/api/users/me/profile/`, url);
    }

    httpRequest("GET", url, null, this.#initProfileData.bind(this), (res) => {
      console.log('Error fetching Profile data: ', res);
    });
  }

  #initProfileData(data) {
    const profileCardRecord = this.querySelector('.profile-card-record');
    const userAvatar = profileCardRecord.querySelector(".user-avatar");
    const userLevelId = profileCardRecord.querySelector(".user-level");
    const userScore = profileCardRecord.querySelector(".score");
    const stateMessage = profileCardRecord.querySelector(".state-message");

    if (data.status === 'OFFLINE')
    {
      profileCardRecord.querySelector('.status-circle').classList.add('status-offline');
    }
    else
    {
      profileCardRecord.querySelector('.status-circle').classList.remove('status-offline');
    }

    userLevelId.textContent = `Lv ${data.level} ${data.username}`;
    userAvatar.src = `data:image;base64,${data.avatar}`;
    userScore.textContent = `${data.wins} 승 ${data.loses} 패`;
    stateMessage.textContent = `${data.message}`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#username = globalData.record.getUsername();
    
    this.#fetchProfileInfo();
    this.#fetchAndRenderPvpResults();
    this.#fetchAndRenderTournamentResults();
  }
}

