import globalData from "@/data/global";
import View from "@/lib/view";
import { NAVIGATE_DRIRECTION, route } from "@/router";
import httpRequest, { showLogoutModal } from "@/utils/httpRequest";

export default class NavBar extends View {
  
  constructor() {
    super();
  }

  _modalToggler() {
    const profileCardModalBtn = this.querySelector('#profileCardModalBtn');
    const profileCardModal = this.querySelector('#profileCardModal');
    const modalCloseBtn = this.querySelector('.btn-close');
    const editBtn = profileCardModal.querySelector('.btn-to-edit');
    
    profileCardModalBtn.addEventListener('click', () => {
      editBtn.textContent = '정보변경';
      profileCardModal.style.display = 'flex';
      globalData.record.setUsername(null);
    });
    editBtn.addEventListener('click', (e) => {
      if (!editBtn.closest('friend-view'))
      {
        e.preventDefault();
        route({
          path: "/edit",
        })
      }
    })
    modalCloseBtn.addEventListener('click', () => {
      profileCardModal.style.display = 'none';
    });
    profileCardModal.addEventListener('click', e => {
      if (e.target === e.currentTarget)
        profileCardModal.style.display = 'none';
    });
  }

  _initModalData (data) {
    const profileCardModal = this.querySelector('#profileCardModal');
    const userAvatar = profileCardModal.querySelector('.user-avatar');
    const userLevelId = profileCardModal.querySelector('.user-level-id');
    const userScore = profileCardModal.querySelector('.score');
    const stateMessage = profileCardModal.querySelector('.state-message');
    if (!userLevelId)
    {
      return;
    }
    userLevelId.textContent = `Lv ${data.level} ${data.username}`
    userAvatar.src = `data:image;base64,${data.avatar}`;
    userScore.textContent = `${data.wins} 승 ${data.loses} 패`;
    stateMessage.textContent = `${data.message}`;
  }

  _initNavbarData(data) {
    const userLevelId = this.querySelector('.user-level-id');
    const userImg = this.querySelector('#profileCardModalBtn');
    if (!userLevelId)
    {
      return;
    }
    userLevelId.textContent = `Lv ${data.level} ${data.username}`;
    userImg.src = `data:image;base64,${data.avatar}`;
    this._initModalData(data);
  }

  async _fetchInfo() {
    const url = `${window.location.protocol}//${window.location.host}/api/users/me/profile/`;

    await httpRequest('GET', url, null, this._initNavbarData.bind(this));
  }
    
  _logoutEvent() {
    const url = `${window.location.protocol}//${window.location.host}/api/logout/`;
    const logoutBtn = this.querySelector('#logout');
    const body = JSON.stringify({
      refresh: `${localStorage.getItem('refresh')}`
    })
    logoutBtn.addEventListener('click', () => {
      httpRequest('POST', url, body, () => {
        showLogoutModal();
      }, () => {
      })
      localStorage.clear();
    })
  }

  connectedCallback() {
    super.connectedCallback();
    
    this._fetchInfo();
    this._logoutEvent();
    this._modalToggler();

    const username = this.querySelector('.user-level-id');
    
    username.addEventListener('click', () => {
      this.querySelector('#profileCardModalBtn').click();
    });
    username.style.cursor = 'pointer';
  }
}
