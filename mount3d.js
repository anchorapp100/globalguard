/* NoteCase P600 wall mount — interactive exploded view.
   Three.js (importmap → jsdelivr), own binary-STL parser, OrbitControls.
   Scrub 0 = mounted, 1 = exploded. Autoplay ping-pongs with pauses. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.getElementById('m3d');
if (host) {
  const canvas = host.querySelector('canvas');
  const slider = document.getElementById('m3d-scrub');
  const playBtn = document.getElementById('m3d-play');
  const spinBtn = document.getElementById('m3d-spin');
  const resetBtn = document.getElementById('m3d-reset');
  const stateLbl = document.getElementById('m3d-state');
  const loadLbl = document.getElementById('m3d-loading');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- renderer / scene / camera ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 6000);
  const HOME = new THREE.Vector3(250, 120, 520);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 220;
  controls.maxDistance = 1100;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.autoRotateSpeed = 1.1;
  controls.target.set(0, 0, 10);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xe6eef8, 0x0b0f14, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(200, 280, 360);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 1400 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb4ff, 0.45);
  fill.position.set(-300, 60, 160);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd9a0, 0.35);
  rim.position.set(0, -200, -300);
  scene.add(rim);

  // ---------- wall backdrop (the mount's back face sits at z = -2.4) ----------
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1200),
    new THREE.MeshStandardMaterial({ color: 0x18202a, roughness: 0.96, metalness: 0 })
  );
  wall.position.z = -0.05;
  wall.receiveShadow = true;
  scene.add(wall);

  // ---------- binary STL → BufferGeometry (flat normals, as printed) ----------
  function parseSTL(buf) {
    const dv = new DataView(buf);
    const n = dv.getUint32(80, true);
    const pos = new Float32Array(n * 9), nor = new Float32Array(n * 9);
    let o = 84;
    for (let i = 0; i < n; i++) {
      const nx = dv.getFloat32(o, true), ny = dv.getFloat32(o + 4, true), nz = dv.getFloat32(o + 8, true);
      o += 12;
      for (let k = 0; k < 3; k++) {
        const j = i * 9 + k * 3;
        pos[j] = dv.getFloat32(o, true); pos[j + 1] = dv.getFloat32(o + 4, true); pos[j + 2] = dv.getFloat32(o + 8, true);
        nor[j] = nx; nor[j + 1] = ny; nor[j + 2] = nz;
        o += 12;
      }
      o += 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return g;
  }
  async function loadPart(url, color) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url + ' ' + r.status);
    const m = new THREE.Mesh(parseSTL(await r.arrayBuffer()),
      new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.04 }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // ---------- the tablet: 243.1 × 171.4 × 7.9 mm, r = 11 mm, back on the pocket floor (z = -0.2) ----------
  function roundedRect(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  const tablet = new THREE.Group();
  // extrude runs 0..depth and the bevel grows 0.7 mm beyond each end → depth 6.5 gives a 7.9 mm slab
  const BEV = 0.7;
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(243.1 - 2 * BEV, 171.4 - 2 * BEV, 11 - BEV), { depth: 7.9 - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 3, curveSegments: 14 }),
    new THREE.MeshPhysicalMaterial({ color: 0x0c1015, roughness: 0.3, metalness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 })
  );
  // NoteCase v3 frame: wall at z = 0, back plate 0..2.6 (the tablet lies on it),
  // tablet 2.85..10.75 (0.25 mm seating slack), lip 11.0..13.0
  const Z_TAB = 2.6 + 0.25, T_FRONT = Z_TAB + 7.9;
  body.position.z = Z_TAB + BEV; // extrude+bevel puts the back face on the ledge
  body.castShadow = true; body.receiveShadow = true;
  tablet.add(body);
  const tex = new THREE.TextureLoader().load('images/tablet-1.jpg', () => { needRender = true; });
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(217.6, 136), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = T_FRONT + 0.12;
  tablet.add(screen);
  const homeBtn = new THREE.Mesh(new THREE.BoxGeometry(14, 5.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.5 }));
  homeBtn.position.set(0, -80, T_FRONT + 0.3);
  tablet.add(homeBtn);
  const camDot = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.3, metalness: 0.6 }));
  camDot.position.set(0, 79, T_FRONT + 0.3);
  tablet.add(camDot);
  scene.add(tablet);

  // ---------- explode / autoplay ----------
  let left = null, right = null, t = 1, playing = false, phase = 0, phaseT = 0, needRender = true;
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function setExplode(v, fromSlider) {
    t = Math.max(0, Math.min(1, v));
    if (left) left.position.x = -92 * t;
    if (right) right.position.x = 92 * t;
    tablet.position.z = 76 * t;
    if (!fromSlider) slider.value = Math.round(t * 1000);
    stateLbl.textContent = t < 0.03 ? 'Mounted — tablet clamped between the two halves' : t > 0.97 ? 'Exploded — left half · tablet · right half' : 'Assembling…';
    needRender = true;
  }
  // phases: 0 hold exploded, 1 implode, 2 hold mounted, 3 explode
  const DUR = [1.3, 2.4, 1.8, 2.4];
  function tick(dt) {
    if (!playing) return;
    phaseT += dt;
    if (phase === 1) setExplode(1 - ease(Math.min(1, phaseT / DUR[1])));
    else if (phase === 3) setExplode(ease(Math.min(1, phaseT / DUR[3])));
    if (phaseT >= DUR[phase]) { phaseT = 0; phase = (phase + 1) % 4; }
  }
  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? '⏸ Pause' : '▶ Autoplay';
    playBtn.classList.toggle('play', on);
    if (on) { phase = t > 0.5 ? 0 : 2; phaseT = 0; }
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  slider.addEventListener('input', () => { setPlaying(false); setExplode(slider.valueAsNumber / 1000, true); });
  spinBtn.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    spinBtn.classList.toggle('play', controls.autoRotate);
    spinBtn.textContent = controls.autoRotate ? '⟳ Spinning' : '⟳ Spin';
  });
  resetBtn.addEventListener('click', () => {
    camera.position.copy(HOME); controls.target.set(0, 0, 10); controls.update(); needRender = true;
  });
  canvas.addEventListener('pointerdown', () => { needRender = true; }, { passive: true });

  // ---------- sizing ----------
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needRender = true;
  }
  new ResizeObserver(resize).observe(host);
  resize();

  // ---------- load ----------
  Promise.all([
    loadPart('models/Note101_P600_WallMount_LEFT.stl', 0xd4d9df),
    loadPart('models/Note101_P600_WallMount_RIGHT.stl', 0xc6ccd4),
  ]).then(([l, r]) => {
    left = l; right = r;
    scene.add(left, right);
    loadLbl.hidden = true;
    setExplode(1);
    if (!reduced) setTimeout(() => { if (!playing) setPlaying(true); }, 1800);
  }).catch(err => {
    loadLbl.textContent = 'Model failed to load (' + err.message + ')';
  });

  // ---------- loop: renders only when something moves, and only while the viewer is on screen ----------
  let last = performance.now(), visible = true, rafId = 0;
  function loop(now) {
    rafId = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tick(dt);
    const moved = controls.update();
    if (needRender || moved || controls.autoRotate || playing) { renderer.render(scene, camera); needRender = false; }
    if (visible) rafId = requestAnimationFrame(loop);
  }
  function wake() { if (visible && !rafId) { last = performance.now(); rafId = requestAnimationFrame(loop); } }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { needRender = true; wake(); }
  }, { threshold: 0.05 }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  wake();
  window.__m3d = { renderer, scene, camera, setExplode, isPlaying: () => playing, parts: () => [left, right] };
}
