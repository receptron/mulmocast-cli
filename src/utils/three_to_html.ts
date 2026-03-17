import nodePath from "node:path";

type MediaSource = { kind: "url"; url: string } | { kind: "path"; path: string };

export type ThreeDslConfig = {
  model: {
    source: MediaSource;
  };
  backgroundColor?: string;
  camera?: {
    fov?: number;
    near?: number;
    far?: number;
    position?: [number, number, number];
    lookAt?: [number, number, number];
  };
  grid?: {
    enabled?: boolean;
    size?: number;
    divisions?: number;
    colorCenter?: number;
    colorGrid?: number;
    y?: number;
  };
  normalize?: {
    targetSize?: number;
    yOffset?: number;
  };
  motion?: {
    xMin?: number;
    xMax?: number;
    moveEnd?: number;
    turnEnd?: number;
    faceRight?: number;
  };
  lighting?: {
    ambientIntensity?: number;
    keyIntensity?: number;
    rimIntensity?: number;
    keyColor?: number;
    rimColor?: number;
    keyPosition?: [number, number, number];
    rimPosition?: [number, number, number];
  };
};

const toFileUrl = (absolutePath: string): string => {
  return `file://${absolutePath}`;
};

const resolveModelUrl = (source: MediaSource, baseDirPath: string): string => {
  if (source.kind === "url") return source.url;
  const resolvedPath = nodePath.resolve(baseDirPath, source.path);
  return toFileUrl(resolvedPath);
};

const esc = (value: string): string => value.replace(/'/g, "\\'");

export const threeDslToHtmlAndScript = (three: ThreeDslConfig, baseDirPath: string): { html: string; script: undefined } => {
  const backgroundColor = three.backgroundColor ?? "#0d1224";
  const modelUrl = resolveModelUrl(three.model.source, baseDirPath);

  const cameraFov = three.camera?.fov ?? 45;
  const cameraNear = three.camera?.near ?? 0.01;
  const cameraFar = three.camera?.far ?? 1000;
  const cameraPos = three.camera?.position ?? [0, 1.2, 3.5];
  const cameraLookAt = three.camera?.lookAt ?? [0, 0.9, 0];

  const gridEnabled = three.grid?.enabled ?? true;
  const gridSize = three.grid?.size ?? 10;
  const gridDivisions = three.grid?.divisions ?? 20;
  const gridColorCenter = three.grid?.colorCenter ?? 0x444466;
  const gridColorGrid = three.grid?.colorGrid ?? 0x222244;
  const gridY = three.grid?.y ?? -0.01;

  const targetSize = three.normalize?.targetSize ?? 1.8;
  const yOffset = three.normalize?.yOffset ?? 0.9;

  const ambientIntensity = three.lighting?.ambientIntensity ?? 1.2;
  const keyIntensity = three.lighting?.keyIntensity ?? 1.4;
  const rimIntensity = three.lighting?.rimIntensity ?? 0.8;
  const keyColor = three.lighting?.keyColor ?? 0xffffff;
  const rimColor = three.lighting?.rimColor ?? 0x88aaff;
  const keyPosition = three.lighting?.keyPosition ?? [3, 5, 2];
  const rimPosition = three.lighting?.rimPosition ?? [-4, 2, -3];

  const xMin = three.motion?.xMin ?? -1.6;
  const xMax = three.motion?.xMax ?? 1.6;
  const moveEnd = three.motion?.moveEnd ?? 0.45;
  const turnEnd = three.motion?.turnEnd ?? 0.55;
  const faceRight = three.motion?.faceRight ?? Math.PI / 2;

  const html = [
    "<script src='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'></script>",
    "<script src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'></script>",
    `<div id='three-container' style='position:fixed;inset:0;overflow:hidden;background:${esc(backgroundColor)}'>`,
    "  <canvas id='c' style='display:block;width:100%;height:100%'></canvas>",
    "</div>",
    "<script>",
    "",
    "  const canvas = document.getElementById('c');",
    "  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });",
    "  renderer.setClearColor(0x0d1224);",
    "  renderer.outputEncoding = THREE.sRGBEncoding;",
    "",
    "  const scene = new THREE.Scene();",
    `  const camera = new THREE.PerspectiveCamera(${cameraFov}, 16 / 9, ${cameraNear}, ${cameraFar});`,
    `  camera.position.set(${cameraPos[0]}, ${cameraPos[1]}, ${cameraPos[2]});`,
    `  camera.lookAt(${cameraLookAt[0]}, ${cameraLookAt[1]}, ${cameraLookAt[2]});`,
    "",
    `  scene.add(new THREE.AmbientLight(0xffffff, ${ambientIntensity}));`,
    `  const key = new THREE.DirectionalLight(${keyColor}, ${keyIntensity});`,
    `  key.position.set(${keyPosition[0]}, ${keyPosition[1]}, ${keyPosition[2]});`,
    "  scene.add(key);",
    `  const rim = new THREE.DirectionalLight(${rimColor}, ${rimIntensity});`,
    `  rim.position.set(${rimPosition[0]}, ${rimPosition[1]}, ${rimPosition[2]});`,
    "  scene.add(rim);",
    "",
    gridEnabled
      ? `  const grid = new THREE.GridHelper(${gridSize}, ${gridDivisions}, ${gridColorCenter}, ${gridColorGrid});\n  grid.position.y = ${gridY};\n  scene.add(grid);`
      : "",
    "",
    "  let moveRoot = null;",
    "  let turnRoot = null;",
    "  let modelOffset = null;",
    `  const modelUrl = '${esc(modelUrl)}';`,
    "  const loader = new THREE.GLTFLoader();",
    "  loader.load(",
    "    modelUrl,",
    "    (gltf) => {",
    "      moveRoot = new THREE.Group();",
    "      turnRoot = new THREE.Group();",
    "      modelOffset = new THREE.Group();",
    "      moveRoot.add(turnRoot);",
    "      turnRoot.add(modelOffset);",
    "      modelOffset.add(gltf.scene);",
    "      scene.add(moveRoot);",
    "",
    "      const box = new THREE.Box3().setFromObject(modelOffset);",
    "      const size = box.getSize(new THREE.Vector3());",
    "      const maxDim = Math.max(size.x, size.y, size.z) || 1;",
    `      const scale = ${targetSize} / maxDim;`,
    "      modelOffset.scale.setScalar(scale);",
    "",
    "      box.setFromObject(modelOffset);",
    "      const centered = box.getCenter(new THREE.Vector3());",
    "      modelOffset.position.sub(centered);",
    `      modelOffset.position.y += ${yOffset};`,
    "    },",
    "    undefined,",
    "    (error) => {",
    "      console.error('GLB load failed:', error);",
    "    }",
    "  );",
    "",
    "  let lastW = 0;",
    "  let lastH = 0;",
    "  const syncSize = () => {",
    "    const w = Math.max(1, Math.floor(window.innerWidth || document.documentElement.clientWidth));",
    "    const h = Math.max(1, Math.floor(window.innerHeight || document.documentElement.clientHeight));",
    "    if (w !== lastW || h !== lastH) {",
    "      renderer.setSize(w, h, true);",
    "      camera.aspect = w / h;",
    "      camera.updateProjectionMatrix();",
    "      lastW = w;",
    "      lastH = h;",
    "    }",
    "  };",
    "",
    "  const lerp = (a, b, u) => a + (b - a) * u;",
    "  const clamp01 = (v) => Math.max(0, Math.min(1, v));",
    `  const xMin = ${xMin};`,
    `  const xMax = ${xMax};`,
    `  const moveEnd = ${moveEnd};`,
    `  const turnEnd = ${turnEnd};`,
    `  const faceRight = ${faceRight};`,
    "  const faceLeft = faceRight + Math.PI;",
    "",
    "  window.render = function render(frame, total) {",
    "    document.body.style.zoom = '1';",
    "    syncSize();",
    "",
    "    const t = frame / Math.max(1, total - 1);",
    "    if (moveRoot && turnRoot) {",
    "      if (t < moveEnd) {",
    "        const u = clamp01(t / moveEnd);",
    "        moveRoot.position.x = lerp(xMin, xMax, u);",
    "        turnRoot.rotation.y = faceRight;",
    "      } else if (t < turnEnd) {",
    "        const u = clamp01((t - moveEnd) / Math.max(1e-6, turnEnd - moveEnd));",
    "        moveRoot.position.x = xMax;",
    "        turnRoot.rotation.y = lerp(faceRight, faceLeft, u);",
    "      } else {",
    "        const u = clamp01((t - turnEnd) / Math.max(1e-6, 1 - turnEnd));",
    "        moveRoot.position.x = lerp(xMax, xMin, u);",
    "        turnRoot.rotation.y = faceLeft;",
    "      }",
    "    }",
    "",
    `    camera.lookAt(${cameraLookAt[0]}, ${cameraLookAt[1]}, ${cameraLookAt[2]});`,
    "    renderer.render(scene, camera);",
    "  };",
    "</script>",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, script: undefined };
};
