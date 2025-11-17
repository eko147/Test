import globalData from "@/data/global";
import View from "@/lib/view";
import { route } from "@/router";
import httpRequest from "@/utils/httpRequest";

const TYPE_EDIT = "TYPE_EDIT"
const TYPE_ADD = "TYPE_ADD"
const TYPE_DELETE = "TYPE_DELETE"

export default class FriendView extends View {

  constructor({data}) {
    super();
    this.data = data
  }

  async _modalBtnHandler(e) {
    let url;
    const profileCardModal = e.target.closest('#profileCardModal')

    const type = profileCardModal.getAttribute('data-user-type');
    const user = profileCardModal.getAttribute('data-user');
    e.preventDefault();
    if (type === TYPE_DELETE)
    {
      url = `${window.location.protocol}//${window.location.host}/api/users/me/friends/${user}/`;
      await httpRequest('DELETE', url, null, () => {
        this._fetchFriendList();
        profileCardModal.style.display = 'none';
      });
    }
    else if (type === TYPE_ADD)
    {
      url = `${window.location.protocol}//${window.location.host}/api/users/me/friends/`;
      const body = JSON.stringify({"to_user": `${user}`})
      await httpRequest('POST', url, body, () => {
        this._fetchFriendList();
        profileCardModal.style.display = 'none';
      }, (res) => (console.log('failed to add: ', res)));
    }
    else
    {
      profileCardModal.style.display = 'none';
      route({
        path: "/edit",
      })
    }
  }

  _modalBtnEventSet() {
    const addFriendBtn = this.querySelector('.btn-add-friend');

    addFriendBtn.addEventListener('click', this._modalBtnHandler.bind(this));
  }

  _modalBtnSetter(type)
  {
    const addFriendBtn = this.querySelector('.btn-add-friend');

    addFriendBtn.classList.remove('btn-del-friend');
    if (type === TYPE_EDIT)
    {
      addFriendBtn.textContent = '정보변경';
    }
    else if (type === TYPE_ADD)
    {
      addFriendBtn.textContent = '친구추가';
    }
    else
    {
      addFriendBtn.classList.add('btn-del-friend');
      addFriendBtn.textContent = '친구삭제';
    }
  }

  async _fetchFriendList() {
    const friendGroup = this.querySelector('ul');
    const url = `${window.location.protocol}//${window.location.host}/api/users/me/friends/`;
    
    httpRequest('GET', url, null, (res) => {
      friendGroup.classList.remove('justify-content-center', 'align-items-center');
      while (friendGroup.lastChild.tagName !== 'TEMPLATE')
      {
        friendGroup.removeChild(friendGroup.lastChild)
      }
      if (res.length === 0)
      {
        const noFriends = document.createElement('p');
        noFriends.textContent = "친구를 검색하여 추가해보세요🌱"
        friendGroup.classList.add('justify-content-center', 'align-items-center');
        friendGroup.appendChild(noFriends);
        return ;
      }
      else
      {
        for (const friend of res) {
          const listTemplate = document.getElementById('list-item-template');

          const documentFragment = document.importNode(listTemplate.content, true);
          const friendElement = documentFragment.querySelector('li');
          friendElement.querySelector('img').src = `data:image;base64,${friend.avatar}`;
          if (friend.status === 'OFFLINE')
          {
            friendElement.querySelector('.status-circle-sm').classList.add('status-offline');
          }
          else
          {
            friendElement.querySelector('.status-circle-sm').classList.remove('status-offline');
          }
          friendElement.querySelector('.user-level').textContent = `Lv ${friend.level}`;
          friendElement.querySelector('.user-name').textContent = `${friend.username}`;
          friendElement.setAttribute('data-user', `${friend.username}`);
          friendElement.setAttribute('data-user-type', `${TYPE_DELETE}`);
          friendGroup.appendChild(friendElement);
        }
      }
    })
  }

  _fillModalData(data) {
    const profileCardModal = document.getElementById('profileCardModal');
    const userAvatar = profileCardModal.querySelector('.user-avatar');
    const userLevelId = profileCardModal.querySelector('.user-level-id');
    const userScore = profileCardModal.querySelector('.score');
    const stateMessage = profileCardModal.querySelector('.state-message');

    
    profileCardModal.setAttribute('data-user', `${data.username}`); {
    if (data.is_me === true)
      profileCardModal.setAttribute('data-user-type', `${TYPE_EDIT}`);
    else if (data.is_friend === true)
      profileCardModal.setAttribute('data-user-type', `${TYPE_DELETE}`);
    else
      profileCardModal.setAttribute('data-user-type', `${TYPE_ADD}`);
    }

    if (data.status === "OFFLINE")
      profileCardModal.querySelector('.status-circle').classList.add('status-offline')
    else
      profileCardModal.querySelector('.status-circle').classList.remove('status-offline')

    userLevelId.textContent = `Lv ${data.level} ${data.username}`;
    userAvatar.src = `data:image;base64,${data.avatar}`;
    userScore.textContent = `${data.wins} 승 ${data.loses} 패`;
    stateMessage.textContent = `${data.message}`;
    
  }

  async _friendListModalEventHandler(e) {
    if (e.target === e.currentTarget)
      return ;
    const clickedList = e.target.closest('li');
    if (!clickedList)
      return ;
    const user = clickedList.getAttribute('data-user');
    const profileCardModal = document.getElementById('profileCardModal');
    const url = `${window.location.protocol}//${window.location.host}/api/users/${user}/profile/`;

    globalData.record.setUsername(user);
    
    await httpRequest('GET', url, null, (res) => {
      this._fillModalData(res);
      this._modalBtnSetter(TYPE_DELETE);

      profileCardModal.style.display = 'flex';
    })
  }

  _friendModalToggler() {
    const friendGroup = this.querySelector('ul');
    friendGroup.addEventListener('click', this._friendListModalEventHandler.bind(this));
  }

  _fillModalWithUserData() {
    const profileCardModalBtn = document.getElementById('profileCardModalBtn');
    const profileCardModal = document.getElementById('profileCardModal');

    profileCardModalBtn.addEventListener('click', async () => {
      const url = `${window.location.protocol}//${window.location.host}/api/users/me/profile/`;

      await httpRequest('GET', url, null, (res) => {
        this._fillModalData(res);
        profileCardModal.setAttribute('data-user-type', TYPE_EDIT);
        this._modalBtnSetter(TYPE_EDIT);
      });
    });
  }
    
  async _searchFriend() {
    const friendNameInput = this.querySelector('#search-friend');
    const profileCardModal = document.getElementById('profileCardModal');
    function is_alnum(str) { return /^[a-zA-Z0-9]+$/.test(str); }
    
    friendNameInput.addEventListener('keydown', async (e) => {
      const username = e.target.value;
      const warningMessage = this.querySelector('.warning-message');
      if (e.key !== 'Enter')
        return ;
      if (!is_alnum(username))
      {
        warningMessage.textContent = `valid error❗️`;
        warningMessage.style.display = 'flex';
        setTimeout(() => {
          warningMessage.style.display = 'none';
        }, 2000);
        return ;
      }
      const url = `${window.location.protocol}//${window.location.host}/api/users/?search=${username}`;

      await httpRequest('GET', url, null, (res) => {
        this._fillModalData(res);
        if (res.is_me === true)
        {
          this._modalBtnSetter(TYPE_EDIT);
        }
        else if (res.is_friend === true)
        {
          this._modalBtnSetter(TYPE_DELETE);
        }
        else
        {
          this._modalBtnSetter(TYPE_ADD)
        }
        profileCardModal.style.display = 'flex';
      }, () => {
        warningMessage.textContent = `'${username}' does not exist.`;
        warningMessage.style.display = 'flex';

        setTimeout(() => {
          warningMessage.style.display = 'none';
        }, 2000);
      })
    });
  }

    connectedCallback() {
      super.connectedCallback();
      
      this._modalBtnEventSet();
      this._friendModalToggler();
      this._fetchFriendList();
      this._fillModalWithUserData();
      this._searchFriend();
      this.querySelector("#record-link").addEventListener("click",  () => {

        /** @type{ HTMLElement } */
        const modal = this.querySelector("#profileCardModal");
        globalData.record.setUsername(modal.dataset.user)
      })
    }
}
