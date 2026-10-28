const stage = document.getElementById('heroStage');
const canvas = document.getElementById('heroCanvas');

if (stage && canvas) {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mountHeroScene(stage, canvas, motionQuery).catch(() => {
    stage.classList.add('is-fallback');
  });
}

async function mountHeroScene(stage, canvas, motionQuery) {
  if (!webglAvailable()) throw new Error('webgl');

  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
  camera.position.set(0.15, 0.2, 11.2);

  scene.environment = makeEnvironment(THREE, renderer);

  scene.add(new THREE.AmbientLight(0x9dbfff, 0.32));
  scene.add(new THREE.HemisphereLight(0xd7e7ff, 0x071018, 0.7));

  const key = new THREE.DirectionalLight(0xf4f8ff, 2.5);
  key.position.set(4.6, 7.2, 5.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x4d94ff, 1.7);
  fill.position.set(-5.5, 1.6, 3.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x7eb6ff, 2.5);
  rim.position.set(-2.2, 4.4, -6);
  scene.add(rim);

  const core = new THREE.PointLight(0x4c9fff, 16, 8, 2);
  core.position.set(0, 0.2, 0.6);
  scene.add(core);

  const porcelain = new THREE.MeshPhysicalMaterial({
    color: 0xf4f8ff,
    roughness: 0.24,
    metalness: 0.04,
    clearcoat: 0.86,
    clearcoatRoughness: 0.16,
    emissive: 0x12315f,
    emissiveIntensity: 0.2,
    envMapIntensity: 1.15
  });
  const cobalt = new THREE.MeshPhysicalMaterial({
    color: 0x1769ff,
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 0.8,
    clearcoatRoughness: 0.18,
    emissive: 0x0c3fbf,
    emissiveIntensity: 0.46,
    envMapIntensity: 1.2
  });
  const ice = new THREE.MeshPhysicalMaterial({
    color: 0xc5dcff,
    roughness: 0.2,
    metalness: 0.06,
    clearcoat: 0.74,
    clearcoatRoughness: 0.2,
    emissive: 0x16386f,
    emissiveIntensity: 0.18,
    envMapIntensity: 1.1
  });

  const world = new THREE.Group();
  world.scale.setScalar(1.02);
  world.position.y = 0.12;
  scene.add(world);

  const tilt = new THREE.Group();
  tilt.rotation.x = 0.22;
  tilt.rotation.z = -0.06;
  const spin = new THREE.Group();
  spin.rotation.y = 0.62;
  tilt.add(spin);
  world.add(tilt);

  buildHelix(THREE, spin, porcelain, cobalt, ice);
  const floats = buildFloats(THREE, world, porcelain, cobalt, ice);
  const ecg = buildEcg(THREE, world);
  buildGround(THREE, world);

  const pointer = { x: 0, y: 0 };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    stage.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
    });
    stage.addEventListener('pointerleave', () => {
      pointer.x = 0;
      pointer.y = 0;
    });
  }

  let visible = true;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncLoop();
  }, { threshold: 0.08 });
  observer.observe(stage);

  const onResize = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (width < 2 || height < 2) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const cap = width < 760 ? 1.5 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(stage);
  onResize();

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    stage.classList.remove('is-ready');
    stage.classList.add('is-fallback');
  }, { once: true });

  document.addEventListener('visibilitychange', syncLoop);
  motionQuery.addEventListener?.('change', syncLoop);

  function reduced() {
    return motionQuery.matches;
  }

  function renderFrame(now) {
    const t = reduced() ? 1.15 : (now || 0) * 0.001;
    spin.rotation.y = 0.62 + t * 0.16;
    spin.position.y = Math.sin(t * 0.55) * 0.045;
    updateFloats(floats, t, reduced());
    updateEcg(ecg, t, reduced());
    if (!reduced()) {
      key.position.x = 4.6 + Math.sin(t * 0.23) * 0.35;
      camera.position.x += (0.15 + pointer.x * 0.42 - camera.position.x) * 0.045;
      camera.position.y += (0.2 - pointer.y * 0.26 - camera.position.y) * 0.045;
    }
    camera.lookAt(0, -0.15, 0);
    renderer.render(scene, camera);
  }

  function syncLoop() {
    const play = visible && !document.hidden && !reduced() && !stage.classList.contains('is-fallback');
    renderer.setAnimationLoop(play ? renderFrame : null);
    if (!play && !stage.classList.contains('is-fallback')) renderFrame(0);
  }

  renderFrame(0);
  stage.classList.add('is-ready');
  syncLoop();
}

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl')));
  } catch {
    return false;
  }
}

function makeEnvironment(THREE, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x07111f);
  envScene.add(new THREE.HemisphereLight(0xb7d4ff, 0x0a1830, 0.75));
  const envKey = new THREE.DirectionalLight(0xd6e6ff, 1.7);
  envKey.position.set(3, 5, 2);
  envScene.add(envKey);
  const texture = pmrem.fromScene(envScene, 0.03).texture;
  pmrem.dispose();
  return texture;
}

function buildHelix(THREE, parent, porcelain, cobalt, ice) {
  const turns = 2.15;
  const radius = 0.98;
  const height = 3.85;
  const samples = 90;
  const pairs = 16;

  const point = (t, phase) => {
    const angle = t * turns * Math.PI * 2 + phase;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      (t - 0.5) * height,
      Math.sin(angle) * radius
    );
  };

  const curveFor = (phase) => {
    const pts = [];
    for (let i = 0; i <= samples; i += 1) pts.push(point(i / samples, phase));
    return new THREE.CatmullRomCurve3(pts);
  };

  [0, Math.PI].forEach((phase, index) => {
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curveFor(phase), 160, 0.058, 14, false),
      index === 0 ? cobalt : ice
    );
    tube.castShadow = true;
    tube.receiveShadow = true;
    parent.add(tube);
  });

  const sphereGeo = new THREE.SphereGeometry(0.092, 20, 14);
  const spheres = new THREE.InstancedMesh(sphereGeo, porcelain, pairs * 2);
  spheres.castShadow = true;
  spheres.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pairs * 2 * 3), 3);
  const rungGeo = new THREE.CylinderGeometry(0.016, 0.016, 1, 8);
  const rungs = new THREE.InstancedMesh(rungGeo, ice, pairs);
  rungs.castShadow = true;

  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const mid = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const white = new THREE.Color(0xf7fbff);
  const blue = new THREE.Color(0x3e86ff);

  for (let i = 0; i < pairs; i += 1) {
    const t = (i + 0.5) / pairs;
    const a = point(t, 0);
    const b = point(t, Math.PI);
    dummy.position.copy(a);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    spheres.setMatrixAt(i * 2, dummy.matrix);
    dummy.position.copy(b);
    dummy.updateMatrix();
    spheres.setMatrixAt(i * 2 + 1, dummy.matrix);
    const color = i % 4 === 0 ? blue : white;
    spheres.setColorAt(i * 2, color);
    spheres.setColorAt(i * 2 + 1, i % 4 === 2 ? blue : white);

    dir.subVectors(b, a);
    const length = dir.length();
    mid.addVectors(a, b).multiplyScalar(0.5);
    dir.multiplyScalar(1 / length);
    quat.setFromUnitVectors(up, dir);
    scale.set(1, length, 1);
    matrix.compose(mid, quat, scale);
    rungs.setMatrixAt(i, matrix);
  }

  spheres.instanceMatrix.needsUpdate = true;
  if (spheres.instanceColor) spheres.instanceColor.needsUpdate = true;
  rungs.instanceMatrix.needsUpdate = true;
  parent.add(spheres, rungs);
}

function buildFloats(THREE, scene, porcelain, cobalt, ice) {
  const cross = new THREE.Group();
  const armA = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 14), cobalt);
  const armB = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 14), cobalt);
  armB.rotation.z = Math.PI / 2;
  armA.castShadow = armB.castShadow = true;
  cross.add(armA, armB);

  const pill = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.46, 6, 18), porcelain);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), cobalt);
  cap.position.y = 0.23;
  shell.castShadow = cap.castShadow = true;
  pill.add(shell, cap);
  pill.rotation.z = 0.9;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.028, 16, 56), cobalt);
  ring.castShadow = true;
  ring.rotation.x = 0.85;

  scene.add(cross, pill, ring);
  return [
    { mesh: cross, base: [-1.55, 1.22, 1.45], amp: 0.08, speed: 0.62, phase: 0.2, spin: 0.18, face: true },
    { mesh: pill, base: [1.85, 0.42, 1.6], amp: 0.1, speed: 0.5, phase: 1.3, spin: 0.22 },
    { mesh: ring, base: [-1.25, -0.72, 1.35], amp: 0.07, speed: 0.56, phase: 2.1, spin: 0.16 }
  ];
}

function buildEcg(THREE, scene) {
  const samples = 150;
  const make = (color, opacity) => {
    const positions = new Float32Array(samples * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const indices = [];
    for (let i = 0; i < samples - 1; i += 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, positions, samples };
  };

  const glow = make(0x7eb6ff, 0.5);
  const line = make(0x4c9fff, 1);
  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x8ec5ff })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xb9d8ff, transparent: true, opacity: 0.62 })
  );
  scene.add(halo, pulse);
  return { glow, line, pulse, halo };
}

function buildGround(THREE, scene) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 48),
    new THREE.MeshBasicMaterial({
      map: contactTexture(THREE),
      transparent: true,
      depthWrite: false
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -2.3;
  disc.scale.set(1, 1, 0.7);

  const platform = new THREE.Mesh(
    new THREE.TorusGeometry(1.62, 0.007, 8, 90),
    new THREE.MeshBasicMaterial({ color: 0x1769ff, transparent: true, opacity: 0.28 })
  );
  platform.rotation.x = Math.PI / 2;
  platform.position.y = -2.28;
  platform.scale.set(1, 1, 0.7);
  scene.add(disc, platform);
}

function contactTexture(THREE) {
  const size = 256;
  const drawing = document.createElement('canvas');
  drawing.width = size;
  drawing.height = size;
  const ctx = drawing.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 16, 128, 128, 122);
  gradient.addColorStop(0, 'rgba(90, 160, 255, 0.42)');
  gradient.addColorStop(0.48, 'rgba(49, 133, 255, 0.16)');
  gradient.addColorStop(1, 'rgba(23, 105, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(drawing);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateFloats(floats, t, reduced) {
  const time = reduced ? 0.4 : t;
  floats.forEach((item) => {
    const wave = Math.sin(time * item.speed + item.phase);
    item.mesh.position.set(
      item.base[0] + wave * 0.05,
      item.base[1] + wave * item.amp,
      item.base[2] + Math.cos(time * item.speed * 0.7 + item.phase) * 0.04
    );
    if (item.face) item.mesh.rotation.y = 0.42 + Math.sin(time * 0.45) * 0.2;
    else if (!reduced) item.mesh.rotation.y = time * item.spin;
  });
}

function updateEcg(ecg, t, reduced) {
  const phase = reduced ? 0.22 : t * 0.42;
  writeRibbon(ecg.glow, phase, 0.055, 1.28);
  writeRibbon(ecg.line, phase, 0.018, 1.36);
  const head = ecgPoint(0.72, phase);
  ecg.pulse.position.set(head.x, head.y, 1.4);
  ecg.halo.position.copy(ecg.pulse.position);
}

function writeRibbon(ribbon, phase, halfWidth, z) {
  const { positions, samples, mesh } = ribbon;
  let previousX = 0;
  let previousY = 0;
  for (let i = 0; i < samples; i += 1) {
    const u = i / (samples - 1);
    const current = ecgPoint(u, phase);
    let dx = 1;
    let dy = 0;
    if (i < samples - 1) {
      const next = ecgPoint((i + 1) / (samples - 1), phase);
      dx = next.x - current.x;
      dy = next.y - current.y;
    } else {
      dx = current.x - previousX;
      dy = current.y - previousY;
    }
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const offset = i * 6;
    positions[offset] = current.x + nx * halfWidth;
    positions[offset + 1] = current.y + ny * halfWidth;
    positions[offset + 2] = z;
    positions[offset + 3] = current.x - nx * halfWidth;
    positions[offset + 4] = current.y - ny * halfWidth;
    positions[offset + 5] = z;
    previousX = current.x;
    previousY = current.y;
  }
  mesh.geometry.attributes.position.needsUpdate = true;
}

function ecgPoint(u, phase) {
  const window = Math.sin(Math.PI * u);
  const x = -2.15 + u * 4.3;
  const y = -1.35 + ecgWave(u * 2 - phase) * 0.62 * window;
  return { x, y };
}

function ecgWave(progress) {
  const x = ((progress % 1) + 1) % 1;
  const bell = (center, width, amount) => (
    amount * Math.exp(-((x - center) * (x - center)) / (2 * width * width))
  );
  return bell(0.18, 0.018, 0.16)
    + bell(0.33, 0.01, -0.2)
    + bell(0.38, 0.008, 1)
    + bell(0.43, 0.011, -0.34)
    + bell(0.58, 0.028, 0.24);
}
