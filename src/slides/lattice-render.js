import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let initialized = false;
let renderer;
let camera;
let scene;
let controls;
let model;
let materials;
let currentShaderMode = 'lit';
let animationFrameId;
let initPromise;

function getContainer() {
  return document.querySelector('#lattice-container');
}

function getShaderButtons() {
  return document.querySelectorAll('[data-lattice-shader-mode]');
}

function getCssColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function oklchToLinearRgb(lPercent, chroma, hueDegrees) {
  const l = lPercent / 100;
  const hue = THREE.MathUtils.degToRad(hueDegrees);
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.2914855480 * b;

  const lCube = lPrime ** 3;
  const mCube = mPrime ** 3;
  const sCube = sPrime ** 3;

  return [
    THREE.MathUtils.clamp(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube, 0, 1),
    THREE.MathUtils.clamp(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube, 0, 1),
    THREE.MathUtils.clamp(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.7076147010 * sCube, 0, 1)
  ];
}

function createGradientAxes(size = 1) {
  const axisColors = {
    x: [[62, 0.23, 25], [78, 0.17, 55]],
    y: [[66, 0.20, 145], [82, 0.15, 125]],
    z: [[60, 0.22, 265], [77, 0.16, 235]]
  };

  const vertices = [
    0, 0, 0, size, 0, 0,
    0, 0, 0, 0, size, 0,
    0, 0, 0, 0, 0, size
  ];

  const colors = [
    ...oklchToLinearRgb(...axisColors.x[0]), ...oklchToLinearRgb(...axisColors.x[1]),
    ...oklchToLinearRgb(...axisColors.y[0]), ...oklchToLinearRgb(...axisColors.y[1]),
    ...oklchToLinearRgb(...axisColors.z[0]), ...oklchToLinearRgb(...axisColors.z[1])
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false })
  );
}

function createMaterials() {
  const strutColor = 0xff4fd8;
  const nodeColor = 0xffd84d;

  return {
    lit: new THREE.MeshStandardMaterial({
      color: strutColor,
      emissive: 0x220018,
      metalness: 0.12,
      roughness: 0.46
    }),
    wireframe: new THREE.MeshBasicMaterial({
      color: strutColor,
      wireframe: true
    }),
    normal: new THREE.MeshNormalMaterial(),
    edge: new THREE.LineBasicMaterial({
      color: 0x9fb6c8,
      transparent: true,
      opacity: 0.48
    }),
    graph: new THREE.LineBasicMaterial({
      color: 0x8aa5b8,
      transparent: true,
      opacity: 0.28
    }),
    cellBox: new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.52
    }),
    node: new THREE.MeshBasicMaterial({
      color: nodeColor,
      wireframe: true,
      transparent: true,
      opacity: 1,
      depthTest: false
    })
  };
}

function setShaderMode(mode) {
  currentShaderMode = mode;

  if (model && materials?.[mode]) {
    model.traverse(object => {
      if (!object.isMesh || object.userData?.role === 'node') return;
      object.material = materials[mode];
    });
  }

  getShaderButtons().forEach(button => {
    button.classList.toggle('is-active', button.dataset.latticeShaderMode === mode);
  });
}

function bindShaderButtons() {
  getShaderButtons().forEach(button => {
    button.addEventListener('click', () => {
      setShaderMode(button.dataset.latticeShaderMode);
    });
  });
}

function createCylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 24, 1);
  const cylinder = new THREE.Mesh(geometry, material);

  cylinder.position.copy(start).add(end).multiplyScalar(0.5);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;

  return cylinder;
}

function isInCentralCell(point) {
  return Math.abs(point.x) <= 0.5 && Math.abs(point.y) <= 0.5 && Math.abs(point.z) <= 0.5;
}

function createUnitCellBox(size = 1) {
  const half = size / 2;
  const corners = [
    [-half, -half, -half], [half, -half, -half], [half, half, -half], [-half, half, -half],
    [-half, -half, half], [half, -half, half], [half, half, half], [-half, half, half]
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  const vertices = [];
  edges.forEach(([a, b]) => vertices.push(...corners[a].toArray(), ...corners[b].toArray()));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return new THREE.LineSegments(geometry, materials.cellBox);
}

function createNodeSphere(position, radius = 0.036) {
  const geometry = new THREE.SphereGeometry(radius, 12, 8);
  const sphere = new THREE.Mesh(geometry, materials.node);
  sphere.userData.role = 'node';
  sphere.position.copy(position);
  sphere.renderOrder = 10;
  return sphere;
}

function createTiledGraphModel(data) {
  const group = new THREE.Group();
  const struts = data.struts ?? [];
  const stride = data.strut_stride ?? 6;
  const allVertices = [];
  const nodeKeys = new Set();

  for (let index = 0; index <= struts.length - stride; index += stride) {
    const start = new THREE.Vector3(struts[index], struts[index + 1], struts[index + 2]);
    const end = new THREE.Vector3(struts[index + 3], struts[index + 4], struts[index + 5]);
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    allVertices.push(start.x, start.y, start.z, end.x, end.y, end.z);

    if (isInCentralCell(midpoint)) {
      group.add(createCylinderBetween(start, end, 0.014, materials.lit));
      [start, end].forEach(point => {
        if (!isInCentralCell(point)) return;
        nodeKeys.add(point.toArray().map(value => value.toFixed(4)).join(','));
      });
    }
  }

  const graphGeometry = new THREE.BufferGeometry();
  graphGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
  group.add(new THREE.LineSegments(graphGeometry, materials.graph));

  nodeKeys.forEach(key => {
    const point = new THREE.Vector3(...key.split(',').map(Number));
    group.add(createNodeSphere(point));
  });

  group.add(createUnitCellBox(1));
  return group;
}

async function loadTiledGraph() {
  const response = await fetch('./assets/data/bc.tiled.json');
  if (!response.ok) throw new Error(`Failed to load bc.tiled.json: ${response.status}`);
  return response.json();
}

export async function initLatticeSlide() {
  if (initialized) {
    resizeLatticeSlide();
    return;
  }
  if (initPromise) return initPromise;

  initPromise = initLatticeSlideInternal().finally(() => {
    initPromise = undefined;
  });
  return initPromise;
}

async function initLatticeSlideInternal() {
  const container = getContainer();
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e18);

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(2.8, 2.1, 3.4);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(3, 4, 5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x5ee4c1, 0.55);
  fillLight.position.set(-4, 2, -3);
  scene.add(fillLight);

  materials = createMaterials();
  const tiledGraph = await loadTiledGraph();
  model = createTiledGraphModel(tiledGraph);
  model.add(createGradientAxes(1.45));
  scene.add(model);

  const grid = new THREE.GridHelper(4, 24, 0x556677, 0x223344);
  grid.position.y = -1.25;
  scene.add(grid);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.7;
  controls.update();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  bindShaderButtons();
  setShaderMode(currentShaderMode);

  initialized = true;
  resizeLatticeSlide();
  animate();
}

export function resizeLatticeSlide() {
  const container = getContainer();
  if (!container || !renderer || !camera) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width === 0 || height === 0) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  controls?.update();
}

export function disposeLatticeSlide() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  controls?.dispose();
  renderer?.dispose();
  renderer?.domElement.remove();

  model?.traverse(object => {
    if (object.geometry) object.geometry.dispose();
  });
  Object.values(materials ?? {}).forEach(material => material.dispose());

  initialized = false;
  renderer = undefined;
  camera = undefined;
  scene = undefined;
  controls = undefined;
  model = undefined;
  materials = undefined;
  animationFrameId = undefined;
}
