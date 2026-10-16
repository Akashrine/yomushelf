// Three.js shelf for the landing hero. Loaded on demand by ShelfHero, never
// on the first paint : the static shelf stays the LCP element.
//
// Books stand face out on a shelf, slide in one by one, then turn spine out
// and pack together as the hero scrolls away ("les jaquettes se rangent").
// The pointer tilts the camera a little. Nothing renders while the canvas is
// off screen or the tab is hidden.

import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  WebGLRenderer,
  type Texture,
} from "three";

export type ShelfCover = { title: string; cover_url: string };

const BOOK_W = 0.66;
const BOOK_H = 1;
const BOOK_D = 0.13;
const FACE_GAP = 0.1; // between books shown face out
const MAX_BOOKS = 7;
const ROW_ANGLE = -0.55; // the row is seen three-quarters, near end on the right
const SPINE_GAP = 0.02; // between books shown spine out
const SPINE_COLORS = ["#2a1414", "#1d1a2e", "#14231c", "#2b2116", "#1a2230", "#2a1622"];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function spineTexture(color: string, accent: string): Texture {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, 32, 256);
  g.fillStyle = accent;
  g.fillRect(0, 22, 32, 6);
  g.fillRect(0, 228, 32, 4);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function mountShelf(
  canvas: HTMLCanvasElement,
  covers: ShelfCover[],
  { onReady }: { onReady?: () => void } = {}
): () => void {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);

  scene.add(new AmbientLight(new Color("#f0ebe8"), 0.55));
  const key = new DirectionalLight(new Color("#ffe2c4"), 1.6);
  key.position.set(2.5, 3, 4);
  scene.add(key);
  const rim = new PointLight(new Color("#c0392b"), 6, 12);
  rim.position.set(-3, 1.2, 1.5);
  scene.add(rim);

  // shelf plank and back board
  const wood = new MeshStandardMaterial({ color: "#2e2020", roughness: 0.85 });
  const shown = covers.slice(0, MAX_BOOKS);
  const count = shown.length;
  const row = new Group();
  row.rotation.y = ROW_ANGLE;
  row.position.x = -0.3; // the near end looks bigger : pull the row back to the centre
  scene.add(row);
  const faceWidth = count * BOOK_W + (count - 1) * FACE_GAP;
  const plank = new Mesh(new BoxGeometry(faceWidth + 0.8, 0.07, 0.62), wood);
  plank.position.set(0, -BOOK_H / 2 - 0.035, 0);
  row.add(plank);

  const loader = new TextureLoader();
  loader.setCrossOrigin("anonymous");
  const books: { mesh: Group; faceX: number; spineX: number; delay: number }[] = [];
  const disposables: { dispose: () => void }[] = [plank.geometry, wood];
  const bookGeometry = new BoxGeometry(BOOK_W, BOOK_H, BOOK_D);
  disposables.push(bookGeometry);
  const pages = new MeshStandardMaterial({ color: "#efe6d8", roughness: 0.95 });
  disposables.push(pages);

  const spineWidth = count * BOOK_D + (count - 1) * SPINE_GAP;
  let pending = count;
  shown.forEach((cover, i) => {
    const color = SPINE_COLORS[i % SPINE_COLORS.length];
    const spine = spineTexture(color, i % 2 ? "#f8c04a" : "#c0392b");
    const spineMat = new MeshStandardMaterial({ map: spine, roughness: 0.7 });
    const backMat = new MeshStandardMaterial({ color, roughness: 0.8 });
    const frontMat = new MeshStandardMaterial({ color, roughness: 0.55 });
    disposables.push(spine, spineMat, backMat, frontMat);
    loader.load(
      cover.cover_url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        frontMat.map = tex;
        frontMat.color.set("#ffffff");
        frontMat.needsUpdate = true;
        disposables.push(tex);
        if (--pending === 0) onReady?.();
      },
      undefined,
      () => {
        if (--pending === 0) onReady?.();
      }
    );
    // box faces : +x, -x, +y, -y, +z (front cover), -z (back)
    const mesh = new Mesh(bookGeometry, [pages, spineMat, pages, pages, frontMat, backMat]);
    const group = new Group();
    group.add(mesh);
    row.add(group);
    books.push({
      mesh: group,
      faceX: -faceWidth / 2 + BOOK_W / 2 + i * (BOOK_W + FACE_GAP),
      spineX: -spineWidth / 2 + BOOK_D / 2 + i * (BOOK_D + SPINE_GAP),
      delay: i * 0.09,
    });
  });

  // camera distance that fits the face-out row in the canvas width
  let width = 1;
  let height = 1;
  function resize() {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // the angled row looks about as wide as its projection on the x axis
    const seenWidth = faceWidth * Math.cos(ROW_ANGLE) * 1.02 + 0.3;
    const fitWidth = seenWidth / 2 / Math.tan(((camera.fov / 2) * Math.PI) / 180) / camera.aspect;
    const fitHeight = (BOOK_H + 0.9) / 2 / Math.tan(((camera.fov / 2) * Math.PI) / 180);
    camera.position.z = Math.max(fitWidth, fitHeight);
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  // inputs : pointer tilt and how far the hero has scrolled away
  let pointerX = 0;
  let pointerY = 0;
  let tiltX = 0;
  let tiltY = 0;
  const onPointer = (e: PointerEvent) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const scrollProgress = () => {
    const r = canvas.getBoundingClientRect();
    return clamp01((-r.top + r.height * 0.15) / (r.height * 0.9));
  };

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) loop();
  });
  io.observe(canvas);

  const start = performance.now();
  let frame = 0;
  function loop() {
    cancelAnimationFrame(frame);
    if (!visible || document.hidden) return;
    frame = requestAnimationFrame(loop);
    const t = (performance.now() - start) / 1000;
    const shelved = easeInOutCubic(scrollProgress());

    for (const b of books) {
      const enter = easeOutCubic(clamp01((t - 0.15 - b.delay) / 0.7));
      const x = b.faceX + (b.spineX - b.faceX) * shelved;
      b.mesh.position.set(x + (1 - enter) * 3.2, Math.sin(t * 1.1 + b.delay * 9) * 0.012 * (1 - shelved), (1 - enter) * 0.4);
      // face out (0) → spine out (-90°) ; a slight lean while face out
      b.mesh.rotation.y = -Math.PI / 2 * shelved + (1 - shelved) * -0.08;
      b.mesh.rotation.z = (1 - enter) * -0.25;
    }

    tiltX += (pointerX - tiltX) * 0.05;
    tiltY += (pointerY - tiltY) * 0.05;
    camera.position.x = tiltX * 0.35;
    camera.position.y = 0.15 - tiltY * 0.18;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  const onVisibility = () => !document.hidden && loop();
  document.addEventListener("visibilitychange", onVisibility);
  loop();

  return () => {
    cancelAnimationFrame(frame);
    io.disconnect();
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", onVisibility);
    for (const d of disposables) d.dispose();
    renderer.dispose();
  };
}
