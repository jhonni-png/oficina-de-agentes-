/* =====================================================================
   COMPUTADORA CENTRAL (js/computer.js)
   Añade un portátil sobre la mesa de juntas con:
     - pantalla CanvasTexture que muestra el log de los agentes
     - clic (raycasting) para enfocar la cámara y abrir el panel de chat
     - integración con window.pushCentralLog (definido aquí) para que
       core.js / bridge.js escriban también en esta terminal
   Se carga DESPUÉS de scene3d.js y ANTES de ui.js. Usa window.OfficeCtx.
   ===================================================================== */
(function buildCentralComputer() {
  'use strict';

  const ctx = window.OfficeCtx;
  if (!ctx || typeof THREE === 'undefined') return;
  const { scene, renderer, camera, controls, centralTable, PALETTE } = ctx;
  if (!centralTable) return;

  /* ---------- Canvas y textura de la pantalla ---------- */
  const centralCanvas = document.createElement('canvas');
  centralCanvas.width = 512;
  centralCanvas.height = 384;
  const centralCtx = centralCanvas.getContext('2d');
  const centralTex = new THREE.CanvasTexture(centralCanvas);
  if (THREE.sRGBEncoding !== undefined) centralTex.encoding = THREE.sRGBEncoding;
  centralTex.minFilter = THREE.LinearFilter;
  centralTex.magFilter = THREE.LinearFilter;
  centralTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  /* ---------- Materiales locales (evita depender de deskMaterials) ---------- */
  const chasisMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 });
  const hingeMat = new THREE.MeshStandardMaterial({ color: PALETTE ? PALETTE.brass : 0x8c7f6e, roughness: 0.3, metalness: 0.9 });
  const screenMat = new THREE.MeshBasicMaterial({ map: centralTex, toneMapped: false, side: THREE.DoubleSide });

  /* ---------- Modelo del portátil ---------- */
  const laptop = new THREE.Group();
  laptop.name = 'central-laptop';
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.25), chasisMat);
  base.position.y = 0.01;
  base.castShadow = true;
  base.receiveShadow = true;
  laptop.add(base);

  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.33, 12), hingeMat);
  hinge.position.set(0, 0.03, -0.115);
  hinge.rotation.x = Math.PI / 2;
  laptop.add(hinge);

  const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.015), screenMat);
  screenMesh.position.set(0, 0.14, -0.115);
  screenMesh.rotation.x = -0.25;
  screenMesh.castShadow = true;
  screenMesh.receiveShadow = true;
  laptop.add(screenMesh);

  laptop.scale.setScalar(2.0);
  laptop.position.set(0, 1.0, 0.15);
  laptop.userData.isCentralComputer = true;
  base.userData.isCentralComputer = true;
  screenMesh.userData.isCentralComputer = true;
  centralTable.add(laptop);

  /* ---------- Estado de la terminal ---------- */
  const COLORS = { info: '#8ff0a4', warn: '#f0d060', err: '#f07060', ok: '#70d0f0', dim: '#7a7164' };
  const centralComputer = {
    group: laptop, screenMesh, canvasEl: centralCanvas, ctx: centralCtx, tex: centralTex,
    lines: [], maxLines: 24, dirty: true, status: 'idle'
  };
  window.centralComputer = centralComputer;

  /* ---------- Dibujo de la pantalla 3D ---------- */
  function drawCentralScreen() {
    const cc = window.centralComputer;
    if (!cc || !cc.dirty) return;
    const { canvasEl, ctx, tex, lines, maxLines, status } = cc;
    const W = canvasEl.width, H = canvasEl.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(143,240,164,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, 36);
    ctx.fillStyle = '#2f4258'; ctx.fillRect(0, 0, 4, 36);
    ctx.font = 'bold 16px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = '#8ff0a4'; ctx.fillText('◆ CENTRAL TERMINAL', 16, 20);

    const statusLabels = { idle: 'IDLE', thinking: 'THINKING', working: 'WORKING', done: 'DONE', error: 'ERROR' };
    const statusColors = { idle: '#b7ad9a', thinking: '#6f8fb5', working: '#d4aa4f', done: '#6f9a7a', error: '#c0584a' };
    const sLabel = statusLabels[status] || 'IDLE';
    ctx.font = 'bold 13px "IBM Plex Mono", ui-monospace, monospace';
    const tw = ctx.measureText(sLabel).width;
    ctx.fillStyle = 'rgba(26,26,26,0.7)'; ctx.fillRect(W - tw - 28, 8, tw + 20, 20);
    ctx.fillStyle = statusColors[status] || '#b7ad9a'; ctx.fillText(sLabel, W - tw - 18, 20);

    ctx.fillStyle = 'rgba(143,240,164,0.2)'; ctx.fillRect(12, 42, W - 24, 1);
    ctx.font = '14px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const startIdx = Math.max(0, lines.length - maxLines);
    const lineH = 20, startY = 52;
    for (let i = 0; i < Math.min(maxLines, lines.length - startIdx); i++) {
      const entry = lines[startIdx + i];
      const y = startY + i * lineH;
      if (y + lineH > H - 10) break;
      ctx.fillStyle = COLORS.dim; ctx.fillText(entry.time, 12, y);
      ctx.fillStyle = COLORS[entry.level] || COLORS.info; ctx.fillText(entry.text, 90, y);
    }
    if (status === 'idle') {
      ctx.fillStyle = 'rgba(143,240,164,0.4)';
      ctx.font = '13px "IBM Plex Mono", ui-monospace, monospace';
      ctx.fillText('> clic para abrir el chat de tareas', 12, H - 22);
    }
    tex.needsUpdate = true;
    cc.dirty = false;
  }
  window.drawCentralScreen = drawCentralScreen;

  /* ---------- API de logs: escribe en pantalla 3D + panel HTML ---------- */
  window.pushCentralLog = function (text, level = 'info') {
    const cc = window.centralComputer;
    const time = new Date().toLocaleTimeString('es-CO', { hour12: false });
    const safeText = String(text);
    if (cc) {
      cc.lines.push({ text: safeText, level, time });
      if (cc.lines.length > cc.maxLines + 50) cc.lines = cc.lines.slice(-cc.maxLines);
      cc.dirty = true;
    }
    const out = document.getElementById('computer-output');
    if (out) {
      const ln = document.createElement('div'); ln.className = 'ln';
      const ts = document.createElement('span'); ts.className = 'ts'; ts.textContent = time;
      const msg = document.createElement('span');
      msg.className = 'lvl-' + (['info','warn','err','ok','dim'].includes(level) ? level : 'info');
      msg.textContent = safeText;
      ln.append(ts, msg); out.appendChild(ln);
      while (out.children.length > 300) out.removeChild(out.firstChild);
      out.scrollTop = out.scrollHeight;
    }
  };

  /* ---------- Enfocar cámara ---------- */
  let camAnim = null;
  window.focusComputerCamera = function () {
    camAnim = {
      fromPos: camera.position.clone(), fromTgt: controls.target.clone(),
      toPos: new THREE.Vector3(0, 3.6, 4.6), toTgt: new THREE.Vector3(0, 1.15, 0), t: 0
    };
  };
  window.updateComputerCamAnim = function (dt) {
    if (!camAnim) return;
    camAnim.t = Math.min(1, camAnim.t + dt * 1.6);
    const k = camAnim.t < 0.5 ? 2 * camAnim.t * camAnim.t : 1 - Math.pow(-2 * camAnim.t + 2, 2) / 2;
    camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, k);
    controls.target.lerpVectors(camAnim.fromTgt, camAnim.toTgt, k);
    if (camAnim.t >= 1) camAnim = null;
  };

  /* ---------- Clic con raycasting ---------- */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.intersectObject(laptop, true).length > 0) {
      window.focusComputerCamera();
      if (typeof window.openComputer === 'function') window.openComputer();
    }
  });

  /* ---------- Actualizar estado global desde los 4 agentes ---------- */
  window.updateComputerStatus = function (statuses) {
    let st = 'idle';
    if (statuses.includes('error')) st = 'error';
    else if (statuses.length && statuses.every((s) => s === 'done')) st = 'done';
    else if (statuses.includes('working')) st = 'working';
    else if (statuses.includes('thinking')) st = 'thinking';
    window.centralComputer.status = st;
  };

  /* ---------- Gancho en el bucle de animación existente ---------- */
  const origAnimate = ctx.animate;
  // boot.js llama a ctx.animate(); envolvemos para dibujar la pantalla y animar cámara.
  ctx.animate = function () {
    window.__computerLoopActive = true;
    return origAnimate.apply(this, arguments);
  };
  // Bucle propio para la terminal (independiente del animate de scene3d)
  (function loop() {
    requestAnimationFrame(loop);
    drawCentralScreen();
  })();

  window.pushCentralLog('Sistema listo. Clic en esta computadora para delegar tareas.', 'info');
  window.pushCentralLog('Agentes: planificador → arquitecto → constructor → auditor', 'dim');
})();
