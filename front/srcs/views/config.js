import MapSelector from "@/views/components/map_selector";
import GameView from "@/views/game/game_view";
import LoginView from "@/views/login/login_view";
import HomeView from "@/views/home/home_view";
import FriendView from "@/views/friend/friend_view";
import ModeView from "@/views/mode/mode_view";
import RecordView from "@/views/record/record_view";
import TournamentView from "@/views/tournament/tournament_view";
import TournamentPanel from "@/views/components/tournament_panel";
import MatchView from "@/views/match/match_view";
import EditView from "@/views/edit/edit_view";
import AuthView from "@/views/auth/auth_view";
import NavBar from "@/views/components/nav_bar";
import ProfileCard from "@/views/components/profile_card";
import UserLabel from "@/views/components/user_label";
import ColorPicker from "@/views/components/color_picker.js";
import GraphView from "@/views/dash_board/graph_view";
import ResultModal from "@/views/components/result_modal";

/**
 * fileName for view class MUST contain '_' or '-' (Web components requirement)
*/

export default {
  "default_dir": "/srcs/views/",
  "filePath": {
    "components": [
      {
        "className": "NavBar",
        "fileName": "nav_bar.html"
      },
      {
        "className": "ProfileCard",
        "fileName": "profile_card.html"
      },
      {
        "className": "MapSelector",
        "fileName": "map_selector.html"
      },
      {
        "className": "UserLabel",
        "fileName": "user_label.html"
      },
      {
        "className": "TournamentPanel",
        "fileName": "tournament_panel.html"
      },
      {
        "className": "ColorPicker",
        "fileName": "color_picker.html"
      },
      {
        "className": "ResultModal",
        "fileName": "result_modal.html"
      },
    ],
    "home": [ 
      {
        "className": "HomeView",
        "fileName": "home_view.html"
      }
    ],
    "login": [ 
      {
        "className": "LoginView",
        "fileName": "login_view.html"
      }
    ] ,
    "game": [ 
      {
        "className": "GameView",
        "fileName": "game_view.html"
      }
    ],
    "friend": [ 
      {
        "className": "FriendView",
        "fileName": "friend_view.html"
      }
    ],
    "mode": [ 
      {
        "className": "ModeView",
        "fileName": "mode_view.html"
      }
    ],
    "record": [ 
      {
        "className": "RecordView",
        "fileName": "record_view.html"
      }
    ],
    "tournament": [ 
      {
        "className": "TournamentView",
        "fileName": "tournament_view.html"
      }
    ],
    "match": [ 
      {
        "className": "MatchView",
        "fileName": "match_view.html"
      }
    ],
    "edit": [ 
      {
        "className": "EditView",
        "fileName": "edit_view.html"
      }
    ],
    "dash_board": [
      {
        "className": "GraphView",
        "fileName": "graph_view.html"
      }
    ],
    "auth": [
      {
        "className": "AuthView",
        "fileName": "auth_view.html"
      }
    ],
  }
}

export const viewConstructors = {
  GameView,
  HomeView,
  LoginView,
  FriendView,
  ModeView,
  RecordView,
  TournamentView,
  EditView,
  MatchView,
  AuthView,
  NavBar,
  ProfileCard,
  MapSelector,
  UserLabel,
  TournamentPanel,
  ColorPicker,
  GraphView,
  ResultModal
};

export const routes = [
  { path: "/", view: HomeView},
  { path: "/login", view: LoginView},
  { path: "/friend", view: FriendView},
  { path: "/record", view: RecordView},
  { path: "/game", view: GameView },
  { path: "/mode", view: ModeView },
  { path: "/match", view: MatchView },
  { path: "/tournament", view: TournamentView },
  { path: "/edit", view: EditView },
  { path: "/auth", view: AuthView },
];

/** @param { string } path 
 *  @returns { boolean }
 */
export function isAvailableAddress(path) {
  if (path.length == 0) {
    return true;
  }
  let _path = path[0] == "/" ? path.substring(1): path;
  const availableAddress = [ "login" ];
  return (availableAddress.findIndex(addr => _path.includes(addr)) != -1);
}

/** @param { string } path 
 *  @returns { boolean }
 */
export function isNavigatableAddress(path) {
  if (path.length == 0) {
    return true;
  }
  let _path = path[0] == "/" ? path.substring(1): path;
  const notAvailableAddress = [ "game" ];

  return (notAvailableAddress.indexOf(_path) == -1);
}
