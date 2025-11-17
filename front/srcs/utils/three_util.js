/** @typedef ShaderLoadContext
 *  @property { Promise<boolean> } isLoaded
 *  @property { (loaded: boolean) => void } resolve
 *  @property {{
 *    [key in string]: string
 *  }} path
 *  @property { boolean } loadStarted
 *  @property {{
 *    [key in string]: string
 *  }} loadedShader
 *}} */ 
import { DEBUG } from "@/data/global";
import * as THREE from "three";

export function resizeTexture({texture, x, y}) {
  texture.repeat.x = x;
  texture.repeat.y = y;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; 
  texture.minFilter = THREE.NearestMipMapLinearFilter;
}

/** @param { ShaderLoadContext } context */
export function loadShaders(context) {
  if (context.loadStarted)
    return;
  context.loadStarted = true;
  const promises = Object.entries(context.path).map(([key, path]) => 
    fetch(path)
    .then(res => res.text())
    .then(loadedShader => {
      context.loadedShader[key] = loadedShader 
      return true;
    })
  );
  Promise.all(promises)
    .then(_ => context.resolve(true) )
    .catch(err => {
      context.resolve(false);
      if (DEBUG.isDebug())
      console.error("Fail to load shader ", context, err);
    });
}

/** @param {{ [key in string]: string }} path
  * @returns { ShaderLoadContext } */ 
export function createLoadShaderContext(path) {
  const rv = {
    path,
    loadStarted: false,
    loadedShader: {},
  };
  rv.isLoaded = new Promise(resolve => 
    rv.resolve = resolve
  );
  // @ts-ignore
  return rv;
}

export const Types = {};
