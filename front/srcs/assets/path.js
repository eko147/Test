const path = {
  scene: "assets/models/scene/game_scene.glb",
  boombox: "assets/models/boombox/scene.gltf",
  leaf: "assets/models/leaf/leaf.gltf",
  board: "assets/models/board/board.glb",
  laurel_wreath: "assets/models/laurel_wreath/scene.gltf",
  bgms: [
    { name: "Absolutely Cool", path: "assets/sound/bgm/bgm0.mp3", },
    { name: "Stay Chill", path: "assets/sound/bgm/bgm1.mp3", },
    { name: "Guitar Electro Sport Trailer", path: "assets/sound/bgm/bgm2.mp3", },
    { name: "Summer Adventures", path: "assets/sound/bgm/bgm3.mp3", },
    { name: "Good night", path: "assets/sound/bgm/bgm4.mp3", },
  ],
  hitSound: "assets/sound/hit.mp3",
  winSound: "assets/sound/win.mp3",
  tournamentWin: "assets/sound/tournament_win.mp3",
  lostSound: "assets/sound/lost.mp3",
  buffSound: "assets/sound/buff.mp3",
  deBuffSound: "assets/sound/debuff.mp3",
  getTexture: {
    color: (name) => `assets/textures/${name}/diff.jpg`,
    normal: (name) => `assets/textures/${name}/nor.jpg`,
    arm: (name) => `assets/textures/${name}/arm.jpg`,
  },
};

export default path;
