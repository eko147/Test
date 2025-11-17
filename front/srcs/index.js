import init from "@/init";
import { anchorToLink, route, NAVIGATE_DRIRECTION } from "@/router";
import { DEBUG, STATE } from "@/data/global";
import { isAvailableAddress, isNavigatableAddress } from "@/views/config";

document.addEventListener("DOMContentLoaded", async () => {
  init();
  anchorToLink(document);
  const hash = window.location.hash;
  if (hash === "#debug" || hash === "#DEBUG")
    DEBUG.setDebug(true);

  let path = window.location.pathname;
  const history = window.history.state?.history;
  const index = window.history.state?.index;


  if (!DEBUG.isDebug() && handleLogin())
    return ;

  if (!DEBUG.isDebug() && 
    (!history || index == undefined)) {
    path = isAvailableAddress(path) ? path:  "/";
    if (!window.localStorage.getItem('access') || window.localStorage.getItem('access') == 'undefined') {
      path = '/login'
    }
    if (!history || index == undefined) {
      window.history.replaceState({
        history: [ path ],
        index: 0,
      }, "42 Pong", path);
    }
  }
  route({
    path,
    direction: NAVIGATE_DRIRECTION.forward
  });
})

window.addEventListener("popstate", 
  (event) => {

    const index = window.history.state?.index;
    /** @type { string[] } */
    const history = window.history.state?.history;
    if (!history || index == undefined)
      return;
    event.preventDefault();
    let path = history[index];

    if (!isNavigatableAddress(path))
      return ;

    if (STATE.isPlayingGame()) {
      STATE.requestCancelGame().then(
        (cancel) => {
          if (!cancel)
            return ;
          route({
            path: "/",
            direction: NAVIGATE_DRIRECTION.backward,
          })
          window.location.assign("/");
        })
    }
    else {
      route({
        path,
        direction: NAVIGATE_DRIRECTION.backward,
      })
    }
  }
)

function handleLogin() {
  const url = window.location.href;
  const isLogIn = (window.localStorage.getItem("username") ||
    window.localStorage.getItem("access"));

  if (isLogIn) 
    return false;

  if (!url.includes("code")) {
    route({
      path: "/login"
    });
    window.history.replaceState({
      history: [ "/" ],
      index: 0,
    }, "42 Pong", "/");
    return true;
  }

  const code = new URL(url).searchParams.get("code");

  const callbackUrl = new URL("/api/42/callback/?code=" + code,
    window.location.origin);

  try {
    fetch(callbackUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
    })
      .then(res => res.json())
      .then(json =>  {
        if (json["username"]) {
          window.localStorage.setItem("username", json["username"]);
          route({
            path: "/auth"
          });
          window.history.replaceState({
            history: [ "/" ],
            index: 0,
          }, "42 Pong", "/");
        }
      })
    document.getElementById("app").innerHTML = loading;  
  } catch (err) {
    if (DEBUG.isDebug())
      console.error(err);
  }
  return true;
}

const loading = `
<div class="loading-wrap">
  <div class="loading-spinner my-5"></div>
  <p id="loadingMessage" class="mt-5 loading-message">접속 중...</p>`;
