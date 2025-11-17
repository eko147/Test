import View from "@/lib/view";
import httpRequest from "@/utils/httpRequest";

export default class AuthView extends View {

  constructor({data}) {
    super({data});
  }

  _otpInputControl() {
    const otpInput = this.querySelector('input');
    
    otpInput.addEventListener('keydown', (e) => {
      if (['e', 'E', '+', '-', 'ArrowUp', 'ArrowDown'].includes(e.key))
      {
        e.preventDefault();
      }
    });
    otpInput.addEventListener('keypress', (e) => {
      if (e.target.value.length >= 6)
      {
        e.preventDefault();
      }
    });
  }

  _failToAuthHandler(url, res) {
    const otpInput = this.querySelector('#tfa');
    const submitBtn = this.querySelector('#btn-tfa');
    const errorPassage = this.querySelector('#otp-error');
    
    errorPassage.style.display = 'flex';
    otpInput.classList.add(`vibration`);
    setTimeout(() => {
      otpInput.classList.remove("vibration");
      errorPassage.style.display = 'none';
      submitBtn.removeAttribute('disabled');
    }, 700);
  }

  _setJWT(data) {
    window.localStorage.removeItem('username');
    window.localStorage.setItem('access', data.access);
    window.localStorage.setItem('refresh', data.refresh);

    document.getElementById('move-to-home').click();
  }

  _submitBtnControl() {
    const otpInput = this.querySelector('#tfa');
    const submitBtn = this.querySelector('#btn-tfa');
    const url = `${window.location.protocol}//${window.location.host}/api/validate-otp/`
    
    submitBtn.addEventListener('click', async (e) => {
      const body = JSON.stringify({
        otp: otpInput.value,
        username: window.localStorage.getItem('username')
      });
      submitBtn.setAttribute('disabled', '');
      if (otpInput.value.length < 6)
      {
        this._failToAuthHandler();
        return ;
      }

      await httpRequest('POST', url, body, this._setJWT.bind(this), this._failToAuthHandler.bind(this));
    })
  }


  connectedCallback() {
    super.connectedCallback();
    this._otpInputControl();
    this._submitBtnControl();
  }
}
