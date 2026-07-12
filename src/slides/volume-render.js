import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let initialized = false;
let renderer;
let camera;
let scene;
let controls;
let model;
let mesh;
let materials;
let currentShaderMode = 'lit';
let animationFrameId;

function getContainer() {
  return document.querySelector('#volume-container');
}

function getShaderButtons() {
  return document.querySelectorAll('[data-shader-mode]');
}

function setShaderMode(mode) {
  currentShaderMode = mode;

  if (mesh && materials?.[mode]) {
    mesh.material = materials[mode];
  }

  getShaderButtons().forEach(button => {
    button.classList.toggle('is-active', button.dataset.shaderMode === mode);
  });
}

function bindShaderButtons() {
  getShaderButtons().forEach(button => {
    button.addEventListener('click', () => {
      setShaderMode(button.dataset.shaderMode);
    });
  });
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

function createOrenNayarMaterial() {
  const roughness = 0.82;
  const sigma2 = roughness * roughness;

  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(0x46b3ff) },
      ambientColor: { value: new THREE.Color(0x16365f) },
      skyColor: { value: new THREE.Color(0x9ee8ff) },
      groundColor: { value: new THREE.Color(0x10213a) },
      rimColor: { value: new THREE.Color(0x5ee4c1) },
      lightColor: { value: new THREE.Color(0xffffff) },
      lightDirection: { value: new THREE.Vector3(3, 4, 5).normalize() },
      lightIntensity: { value: 1.85 },
      ambientStrength: { value: 0.72 },
      hemiStrength: { value: 0.46 },
      rimStrength: { value: 0.18 },
      orenA: { value: 1 - 0.5 * (sigma2 / (sigma2 + 0.33)) },
      orenB: { value: 0.45 * (sigma2 / (sigma2 + 0.09)) }
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 ambientColor;
      uniform vec3 skyColor;
      uniform vec3 groundColor;
      uniform vec3 rimColor;
      uniform vec3 lightColor;
      uniform vec3 lightDirection;
      uniform float lightIntensity;
      uniform float ambientStrength;
      uniform float hemiStrength;
      uniform float rimStrength;
      uniform float orenA;
      uniform float orenB;

      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 l = normalize(lightDirection);
        vec3 v = normalize(cameraPosition - vWorldPosition);

        float nDotL = max(dot(n, l), 0.0);
        float nDotV = max(dot(n, v), 0.0);

        // Optimized Oren-Nayar diffuse approximation.
        // Avoids acos/sin/tan by using the qualitative s/t form.
        float s = dot(l, v) - nDotL * nDotV;
        float t = mix(1.0, max(nDotL, nDotV), step(0.0, s));
        float diffuse = nDotL * (orenA + orenB * s / max(t, 0.001));

        float hemiMix = n.y * 0.5 + 0.5;
        vec3 hemiAmbient = mix(groundColor, skyColor, hemiMix) * hemiStrength;
        vec3 ambient = ambientColor * ambientStrength + hemiAmbient;
        vec3 lit = lightColor * lightIntensity * max(diffuse, 0.0);

        float rim = pow(1.0 - nDotV, 2.4) * rimStrength;
        vec3 color = baseColor * (ambient + lit) + rimColor * rim;
        color = color / (color + vec3(1.0));
        color = pow(color, vec3(1.0 / 2.2));

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
}

export function initVolumeSlide() {
  if (initialized) {
    resizeVolumeSlide();
    return;
  }

  const container = getContainer();
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e18);

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 1.15, 4.2);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
  directionalLight.position.set(3, 4, 5);
  scene.add(directionalLight);

  model = new THREE.Group();

  const geometry = new THREE.TorusKnotGeometry(0.72, 0.2, 180, 24);
  materials = {
    lit: createOrenNayarMaterial(),
    wireframe: new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      wireframe: true
    }),
    normal: new THREE.MeshNormalMaterial()
  };

  mesh = new THREE.Mesh(geometry, materials[currentShaderMode]);
  model.add(mesh);

  const axes = createGradientAxes(1.35);
  model.add(axes);

  scene.add(model);

  const grid = new THREE.GridHelper(4, 24, 0x556677, 0x223344);
  grid.position.y = -1.25;
  scene.add(grid);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.autoRotate = false;
  controls.update();

  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  bindShaderButtons();
  setShaderMode(currentShaderMode);

  initialized = true;
  resizeVolumeSlide();
  animate();
}

export function resizeVolumeSlide() {
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

export function disposeVolumeSlide() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  controls?.dispose();
  renderer?.dispose();
  renderer?.domElement.remove();
  Object.values(materials ?? {}).forEach(material => material.dispose());
  mesh?.geometry.dispose();

  initialized = false;
  renderer = undefined;
  camera = undefined;
  scene = undefined;
  controls = undefined;
  model = undefined;
  mesh = undefined;
  materials = undefined;
  animationFrameId = undefined;
}
