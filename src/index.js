import anime from "animejs/lib/anime.es.js";
import * as dat from "dat.gui";
import * as Stats from "stats.js";
import {
  AudioListener,
  Clock,
  Color,
  DirectionalLight,
  DirectionalLightHelper,
  FogExp2,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PositionalAudio,
  Scene,
  ShaderMaterial,
  SphereBufferGeometry,
  WebGLRenderer,
} from "three";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as Tone from "tone";

import { lerp, params } from "./helpers.js";
import fragmentShader from "./shaders/fragment.glsl";
import vertexShader from "./shaders/vertex.glsl";

//REMOVE this in production
const DEBUG = true; // Set to false in production

if (DEBUG) {
  window.THREE = THREE;
}

let container, scene, camera, renderer, controls, gui;
let time, clock;
let stats;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

let objectsToRaycast;

function init() {
  container = document.querySelector(".container");
  scene = new Scene();
  scene.background = new Color("skyblue");
  clock = new Clock(true);
  time = 0;
  objectsToRaycast = [];

  createCamera();
  createLights();
  createRenderer();
  createGeometries();
  createControls();
  createGridHelper();
  initGui();

  if (DEBUG) {
    window.scene = scene;
    window.camera = camera;
    window.controls = controls;
    stats = Stats.default();
    document.body.appendChild(stats.dom);
  }

  renderer.setAnimationLoop(() => {
    stats.begin();
    update();
    renderer.render(scene, camera);
    stats.end();
  });
}

function initGui() {
  gui = new dat.GUI();
  window.gui = gui;
  document.querySelector(".dg").style.zIndex = 99; //fix dat.gui hidden
  gui.add(params, "testParam", -1.000001, 1.000001).onChange(() => {
    let sphere = scene.children.filter((child) => child.name == "sphere");
    if (sphere && sphere.length) {
      sphere = sphere[0];
      anime({
        targets: sphere.position,
        x: params.testParam,
        duration: 500,
        easing: "easeInOutSine",
        update: function () {
          //any custom updates
        },
      });
    }
  });
}

function createCamera() {
  const aspect = container.clientWidth / container.clientHeight;
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, 25, 0);
}

function createLights() {
  scene.fog = new FogExp2(0x000000, 0.0025);
  const directionalLight = new DirectionalLight(0xffffff);
  directionalLight.position.set(0, 0.5, 1).normalize();

  const directionalLightHelper = new DirectionalLightHelper(
    directionalLight,
    5
  );
  // const hemisphereLight = new HemisphereLight(0xddeeff, 0x202020, 3);
  scene.add(directionalLight, directionalLightHelper);
}

function createRenderer() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.physicallyCorrectLights = true;

  container.appendChild(renderer.domElement);
}

// TODO: add more objects and attach sounds to them
function createGeometries() {
  const geometry = new SphereBufferGeometry(1, 30, 30);
  const material = new ShaderMaterial({
    fragmentShader: fragmentShader,
    vertexShader: vertexShader,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "sphere";
  scene.add(mesh);

  const listener = new AudioListener();
  camera.add(listener);
  const sound1 = new PositionalAudio(listener);
  Tone.setContext(sound1.context);
  const oscillator1 = new Tone.Oscillator(440, "sine").start();
  sound1.setNodeSource(oscillator1);
  mesh.add(sound1);
}

function createControls() {
  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
  });

  scene.add(controls.getObject());

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Space":
        if (canJump === true) velocity.y += 350;
        canJump = false;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
}

function createGridHelper() {
  const helper = new THREE.GridHelper(1000, 10, 0x444444, 0x444444);
  helper.position.y = 0.1;
  scene.add(helper);
}

function update() {
  time = clock.getDelta();

  if (controls.isLocked === true) {
    // raycaster.ray.origin.copy( controls.getObject().position );
    // raycaster.ray.origin.y -= 10;

    // const intersections = raycaster.intersectObjects( objects );

    // const onObject = intersections.length > 0;

    const delta = time;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    // if (onObject === true) {
    //   velocity.y = Math.max(0, velocity.y);
    //   canJump = true;
    // }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new behavior

    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;

      canJump = true;
    }
  }
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener("resize", onWindowResize, false);

init();
