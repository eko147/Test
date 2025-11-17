
import View from "@/lib/view";
import { route } from "@/router";
import httpRequest from "@/utils/httpRequest";
import { XSSCheck } from "@/utils/xssCheck_util";

export default class EditView extends View {
  constructor({data}) {
    super();
    this.data = data
  }

  async _imgUploadEventSet() {
    const editProfileImg = this.querySelector('.edit-profile-img');
    const profileImg = editProfileImg.querySelector('.img-profile');
    const imgWrapper = editProfileImg.querySelector('.img-wrapper');
    const imgInput = editProfileImg.querySelector('input');
    const imgContainer = editProfileImg.querySelector('.test');
    
    const url = `${window.location.protocol}//${window.location.host}/api/users/me/profile/`

    await httpRequest('GET', url, null, (data) => {
      profileImg.src = `data:image;base64,${data.avatar}`;
    })

    imgContainer.addEventListener('mouseenter', e => {
      imgWrapper.style.display = 'block';
    }, false);
  
    imgContainer.addEventListener('mouseleave', e => {
      imgWrapper.style.display = 'none';
    }, false);
  
    imgInput.addEventListener('input', e => {
      if (imgInput.files && imgInput.files[0]) {
        if (imgInput.files[0].size > 2 * 1024 * 1024)
          alert('업로드 제한을 초과하였습니다.')
        else
          profileImg.src = URL.createObjectURL(file.files[0]);
      }
      else
      {
        alert('사진 업로드 취소가 감지되었습니다. 다시 등록해주세요.');
      }
    });
  }

  _editBtnEvent() {
    const btnSave = this.querySelector('.btn-save');
    const btnCancel = this.querySelector('.btn-cancel');
    const messageInput = this.querySelector('.edit-user-message-input')
    const imgInput = this.querySelector('.edit-user-img-input')
    
    btnSave.addEventListener('click', async () => {
      const reader = new FileReader();
      const file = imgInput.files[0];
      const url = `${window.location.protocol}//${window.location.host}/api/users/me/profile/`;
      const messageInputValue = messageInput.value;

      XSSCheck(messageInputValue);
      if (!file)
      {
        const body = JSON.stringify({
          "message" : `${messageInputValue}`
        });
        await httpRequest('PATCH', url, body, () => {
          alert(`profile is successfully edited!`);
          route({
            path: 'home'
          })
        })
        return ;
      }

      reader.addEventListener('load', async (e) => {
        const fileData = btoa(e.target.result);

        const body = JSON.stringify({
          "avatar": `${fileData}`,
          "message" : `${messageInputValue}`
        });
        await httpRequest('PATCH', url, body, () => {
          alert(`profile is successfully edited!`);
          route({
            path: 'home'
          })
        }, () => {
          alert('파일 업로드를 실패하였습니다. 다시 시도해주세요.');
        })
      });

      reader.readAsBinaryString(file);
    });

    btnCancel.addEventListener('click', () => {
      route({
        path: 'home'
      })
    });
  }
    
  _textInputEventSet() {
    const textInput = this.querySelector('.edit-user-message-input');
    const letterCounter = this.querySelector('.letter-count');

    textInput.addEventListener('input', (e) => {
      letterCounter.textContent = e.target.value.length;

    })
  }

  connectedCallback() {
    super.connectedCallback();
    
    this._imgUploadEventSet();
    this._textInputEventSet();
    this._editBtnEvent();
  }
}

