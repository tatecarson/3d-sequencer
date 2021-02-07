import anime from "animejs/lib/anime.es.js";
import * as dat from "dat.gui";
import * as Stats from "stats.js";
import {
  AudioListener,
  AudioLoader,
  Clock,
  Color,
  DirectionalLight,
  DirectionalLightHelper,
  FogExp2,
  HemisphereLight,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  PositionalAudio,
  Raycaster,
  Scene,
  SphereGeometry,
  WebGLRenderer,
  BoxGeometry,
  MeshBasicMaterial,
} from "three";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { PositionalAudioHelper } from "three/examples/jsm/helpers/PositionalAudioHelper";
import * as Tone from "tone";

import { lerp, map, params, getDistance } from "./helpers.js";
import { lerpp, makeKalimba } from "./instruments";
import fragmentShader from "./shaders/fragment.glsl";
import vertexShader from "./shaders/vertex.glsl";

//REMOVE this in production
const DEBUG = true; // Set to false in production

if (DEBUG) {
  window.THREE = THREE;
}

let container, scene, camera, renderer, controls, gui;
let material1, material2, material3, material4;
let mesh1, mesh2, mesh3;
let listener;
let time, clock;
let stats;

let raycaster;
let objects = [];
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();

let objectsToRaycast;
let kalimba;
let kalimbaSeq;
let delay;

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
  // initGui();

  if (DEBUG) {
    window.scene = scene;
    window.camera = camera;
    window.controls = controls;
    stats = Stats.default();
    document.body.appendChild(stats.dom);
  }

  kalimba = makeKalimba().instrument;
  kalimba.volume.value = -12;
  delay = makeKalimba().delay;
  kalimbaSeq = makeKalimba().seq;

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
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.y = 100;
  camera.position.x = 10;
}

function createLights() {
  scene.fog = new FogExp2(0x000000, 0.0025);
  const directionalLight = new DirectionalLight(0xffffff);
  directionalLight.position.set(0, 0.5, 1).normalize();

  const directionalLightHelper = new DirectionalLightHelper(
    directionalLight,
    5
  );
  const hemisphereLight = new HemisphereLight(0xddeeff, 0x202020, 3);
  scene.add(directionalLight, hemisphereLight, directionalLightHelper);
}

function createRenderer() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(renderer.domElement);
}

// TODO: add more objects and attach sounds to them
function createGeometries() {
  const sphere = new SphereGeometry(20, 32, 16);

  material1 = new MeshPhongMaterial({
    color: 0xffaa00,
    flatShading: true,
    shininess: 0,
  });
  material2 = new MeshPhongMaterial({
    color: 0xff2200,
    flatShading: true,
    shininess: 0,
  });
  material3 = new MeshPhongMaterial({
    color: 0x6622aa,
    flatShading: true,
    shininess: 0,
  });

  // TODO: add looping sampled drum sounds
  // listener - set to mute so theres no sound until you click play
  listener = new AudioListener();
  listener.setMasterVolume(1);
  camera.add(listener);

  // shape 1 - yellow circle
  mesh1 = new Mesh(sphere, material1);
  mesh1.position.set(-250, 30, 0);
  scene.add(mesh1);
  objects.push(mesh1);
  const audioLoader = new AudioLoader();

  const sound1 = new PositionalAudio(listener);

  audioLoader.load("./sounds/walking-on-glass.mp3", function (buffer) {
    sound1.setBuffer(buffer);
    sound1.setRefDistance(75);
    sound1.setDirectionalCone(180, 230, 0.1);

    const helper1 = new PositionalAudioHelper(sound1, 75);
    sound1.add(helper1);

    sound1.setLoop(true);
    sound1.play();
  });

  mesh1.add(sound1);

  // shape 2
  // red circle
  const sound2 = new PositionalAudio(listener);

  mesh2 = new Mesh(sphere, material2);

  mesh2.position.set(250, 30, 0);
  scene.add(mesh2);
  objects.push(mesh2);

  // Sound is omnidirectional with no direcitonal cone set
  audioLoader.load("./sounds/wind.mp3", function (buffer) {
    sound2.setBuffer(buffer);
    sound2.setRefDistance(75);
    sound2.setLoop(true);
    const helper2 = new PositionalAudioHelper(sound2, 75);
    sound2.add(helper2);
    sound2.play();
  });

  mesh2.add(sound2);

  // shape 3 - purple circle

  mesh3 = new Mesh(sphere, material3);
  mesh2.position.set(250, 30, -250);
  scene.add(mesh3);
  objects.push(mesh3);
  const sound3 = new PositionalAudio(listener);

  audioLoader.load("./sounds/rain-sound-and-rainforest.mp3", function (buffer) {
    sound3.setBuffer(buffer);
    sound3.setRefDistance(50);
    sound3.setDirectionalCone(180, 230, 0.1);
    const helper3 = new PositionalAudioHelper(sound3, 50);
    sound3.add(helper3);
    sound3.setLoop(true);
    sound3.play();
  });

  mesh3.add(sound3);

  const wallGeometry = new BoxGeometry(100, 100, 0.1);
  const wallMaterial = new MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5,
  });

  const wall = new Mesh(wallGeometry, wallMaterial);
  wall.position.set(0, 0.5, -0.5);
  scene.add(wall);
}

function createControls() {
  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
    listener.setMasterVolume(1);
    Tone.Transport.start();
    Tone.start();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
    Tone.Transport.stop();
    listener.setMasterVolume(0);
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

  raycaster = new Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1, 0),
    0,
    10
  );
}

function createGridHelper() {
  const helper = new THREE.GridHelper(1000, 10, 0x444444, 0x444444);
  helper.position.y = 0.1;
  scene.add(helper);
}

function update() {
  time = clock.getDelta();

  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.getObject().position);
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(objects);

    const onObject = intersections.length > 0;

    const delta = time;

    const myLocation = controls.getObject();

    const speedMul = 0.5;
    velocity.x -= velocity.x * 20.0 * delta * speedMul;
    velocity.z -= velocity.z * 10.0 * delta * speedMul;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    // TODO: trigger sound when you jump on top
    if (onObject === true) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
      // console.log("intersecting");
    }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new behavior

    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;

      canJump = true;
    }

    if (getDistance(myLocation, mesh1) < 50) {
      const rateMap = map(getDistance(myLocation, mesh1), 20, 50, 1, 3);
      kalimbaSeq.playbackRate = rateMap;
      delay.delayTime.value = "16n";
      delay.feedback.value = 0.3;
      kalimba.harmonicity.value = 1;

      if (onObject) {
        delay.feedback.value = 0;
        const events = "E5,D#5,E5,B4,G#4,B4,E4,F#4,E4,D#4,E4,B3,G#3,B3,E4,D#4,E4,E4,F#4,E4,G#4,E4,A4,E4,G#4,E4,F#4,E4,E4,E5,D#5,C#5,B4,E5,D#5,C#5,B4,A4,G#4,F#4,E4,E4,F#4,E4,G#4,E4,A4,E4,G#4,E4,F#4,E4,E4,E5,D#5,C#5,B4,E5,D#5,C#5,B4,A4,G#4,F#4,E4,E4,E4,E4,D#4,E4,E4,E4,F#4,E4,D#4,E4,E4,E4,G#4,E4,F#4,E4,G#4,E4,A4,E4,F#4,E4,G#4,E4,E4,E4,D#4,E4,E4,E4,F#4,E4,D#4,E4,E4,E4,G#4,E4,F#4,E4,G#4,E4,A4,E4".split(
          ","
        );
        kalimbaSeq.events = events;
      }
    } else if (getDistance(myLocation, mesh2) < 50) {
      // red circle
      const rateMap = map(getDistance(myLocation, mesh2), 20, 50, 0.5, 1);
      kalimbaSeq.playbackRate = rateMap;
      delay.delayTime.value = "4n";
      delay.feedback.value = 0.5;
      kalimba.harmonicity.value = 5;

      if (onObject) {
        delay.feedback.value = 0;
        const events = "Eb4,A4,Bb4,Eb4,A4,Bb4,C5,A4,Bb4,C5,A4,Bb4,Bb4,A4,G4,F4,Eb4,F4,Bb4,Ab4,G4,F4,Eb4,F4,Eb4,G4,Eb4,A4,Bb4,Eb4,A4,Bb4,C5,A4,Bb4,C5,D5,Bb4,D5,Eb5,D5,C5,Bb4,D5,D5,Eb5,D5,C5,Bb4,D5,Eb5,F5".split(
          ","
        );
        kalimbaSeq.events = events;
      }
    } else if (getDistance(myLocation, mesh3) < 50) {
      const rateMap = map(getDistance(myLocation, mesh3), 20, 50, 0.1, 0.5);
      kalimbaSeq.playbackRate = rateMap;
      delay.delayTime.value = "8n";
      delay.feedback.value = 0.1;
      kalimba.harmonicity.value = 8;

      if (onObject) {
        delay.feedback.value = 0;
        kalimbaSeq.events = ["c4"];
      }
    }
    // console.log(
    //   "🚀 ~ file: index.js ~ line 373 ~ update ~ delay.delayTime",
    //   delay.delayTime
    // );
    // console.log(
    //   "🚀 ~ file: index.js ~ line 436 ~ update ~ kalimbaSeq.playbackRate",
    //   kalimbaSeq.playbackRate
    // );
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize, false);

init();
