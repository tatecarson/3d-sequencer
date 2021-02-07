import { Vector3 } from "three";

export let params = {
  testParam: 0.00001,
};

export function promisifyLoader(loader, onProgress) {
  function promiseLoader(url) {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, onProgress, reject);
    });
  }
  return {
    originalLoader: loader,
    load: promiseLoader,
  };
}

export function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

export function map(num, in_min, in_max, out_min, out_max) {
  return ((num - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
}

export function getDistance(mesh1, mesh2) {
  var dx = mesh1.position.x - mesh2.position.x;
  var dy = mesh1.position.y - mesh2.position.y;
  var dz = mesh1.position.z - mesh2.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
