/* =====================================================================
   DECORACIÓN DE LA OFICINA
   Muro del fondo cálido con ventana, cortinas, mural, cuadro de gatos,
   plantas y la estantería bien surtida (libros, globo, jarrón, trofeo, gato
   de adorno). Se carga después de scene3d.js y usa window.OfficeCtx.
   ===================================================================== */
(function buildOfficeDecor() {
  'use strict';

  const ctx = window.OfficeCtx;
  if (!ctx) return;
  const { scene, renderer, createPlant } = ctx;
  const { bookshelf, shelfWood, brassDetail, bookColors } = ctx.shelf;

  const M = (color, rough, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough == null ? 0.8 : rough, metalness: 0.05 }, extra || {}));
  const mk = (geo, mat, x, y, z, p) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true; o.receiveShadow = true;
    (p || scene).add(o);
    return o;
  };
  const B = (w, h, d, mat, x, y, z, p) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z, p);
  const CY = (rt, rb, h, mat, x, y, z, p) => mk(new THREE.CylinderGeometry(rt, rb, h, 20), mat, x, y, z, p);
  const SP = (r, mat, x, y, z, p) => mk(new THREE.SphereGeometry(r, 16, 12), mat, x, y, z, p);

  function paintTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  function artPanel(tex, w, h, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    scene.add(g);
    B(w + 0.24, h + 0.24, 0.08, M(0x2b1d14, 0.6), 0, 0, 0, g);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.85, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3
    }));
    p.position.z = 0.045;
    g.add(p);
  }

  /* --- Pared de fondo en tono cálido, con ventana --- */
  const wallMat = M(0x4a4540, 0.9), trimMat = M(0x25221f, 0.6), WZ = -9.4;
  B(5.4, 6.6, 0.3, wallMat, -3.8, 3.3, WZ);
  B(5.0, 6.6, 0.3, wallMat, 4.0, 3.3, WZ);
  B(2.6, 1.5, 0.3, wallMat, 0.2, 0.75, WZ);
  B(2.6, 1.6, 0.3, wallMat, 0.2, 5.8, WZ);
  B(13, 0.3, 0.1, trimMat, 0, 0.15, WZ + 0.2);
  B(13, 0.22, 0.12, trimMat, 0, 6.5, WZ + 0.2);
  B(13, 1.1, 0.04, M(0x37302a, 0.7), 0, 0.85, WZ + 0.16);
  B(2.8, 0.08, 0.4, trimMat, 0.2, 1.54, WZ + 0.1);
  B(0.06, 3.5, 0.06, trimMat, 0.2, 3.25, WZ + 0.05);
  B(2.6, 0.06, 0.06, trimMat, 0.2, 3.25, WZ + 0.05);

  /* --- Cortinas --- */
  function curtain(cx, w, topY, h, color) {
    const n = 7, pw = w / n, cm = M(color, 0.95);
    for (let i = 0; i < n; i++) B(pw * 0.95, h, 0.07, cm, cx - w / 2 + pw * (i + 0.5), topY - h / 2, WZ + 0.4 + (i % 2) * 0.06);
  }
  const rod = CY(0.03, 0.03, 3.9, brassDetail, 0.2, 5.15, WZ + 0.4);
  rod.rotation.z = Math.PI / 2;
  curtain(-1.15, 1.1, 5.05, 4.5, 0xb3a794);
  curtain(1.55, 1.1, 5.05, 4.5, 0xb3a794);

  /* --- Mural con vida --- */
  const muralTex = paintTex(1024, 560, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#4f5568'); sky.addColorStop(0.5, '#b9715a'); sky.addColorStop(1, '#d9b99a');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eadcc8'; g.beginPath(); g.arc(720, 250, 110, 0, 7); g.fill();
    g.strokeStyle = 'rgba(234,220,200,.55)'; g.lineWidth = 6;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath(); g.moveTo(720 + Math.cos(a) * 130, 250 + Math.sin(a) * 130); g.lineTo(720 + Math.cos(a) * 190, 250 + Math.sin(a) * 190); g.stroke();
    }
    g.fillStyle = '#4a2c40';
    [[40, 120], [100, 190], [170, 140], [240, 230], [320, 160], [880, 170], [950, 110]].forEach(([x, bh]) => g.fillRect(x, 400 - bh, 60, bh + 120));
    [['#3f5a50', 400, 60], ['#a8977f', 450, 50], ['#8f4f40', 500, 40]].forEach(([c, y, a], i) => {
      g.fillStyle = c; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 90 + i * 2) * a * 0.5);
      g.lineTo(w, h); g.fill();
    });
    for (let i = 0; i < 24; i++) {
      const x = 25 + i * 42, y = 470 + ((i * 7) % 5) * 12;
      g.strokeStyle = '#2f6b5e'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, h); g.lineTo(x, y); g.stroke();
      g.fillStyle = ['#d9b99a', '#b9715a', '#9fb5a6', '#eee6da'][i % 4]; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill();
      g.fillStyle = '#e07a2f'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    }
    g.strokeStyle = '#3a2230'; g.lineWidth = 4;
    [[200, 150], [260, 120], [310, 170]].forEach(([x, y]) => { g.beginPath(); g.arc(x - 12, y, 12, Math.PI, 0); g.arc(x + 12, y, 12, Math.PI, 0); g.stroke(); });
    g.fillStyle = '#fff3dc'; g.textAlign = 'center'; g.font = 'bold 54px "Space Grotesk", sans-serif';
    g.fillText('VIVE · CREA · COLABORA', w / 2, 80);
  });
  artPanel(muralTex, 4.0, 2.2, -4.1, 3.7, WZ + 0.18);

  /* --- Cuadro grande de gatos --- */
  const catsTex = paintTex(768, 640, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#9fb0a2'); bg.addColorStop(1, '#7f9385');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const cat = (x, y, s, fur, ear) => {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = fur;
      g.beginPath(); g.ellipse(0, 100, 72, 85, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(0, 0, 62, 0, 7); g.fill();
      [-1, 1].forEach((k) => {
        g.fillStyle = fur; g.beginPath(); g.moveTo(k * 18, -52); g.lineTo(k * 64, -110); g.lineTo(k * 60, -20); g.fill();
        g.fillStyle = ear; g.beginPath(); g.moveTo(k * 30, -50); g.lineTo(k * 54, -88); g.lineTo(k * 52, -30); g.fill();
        g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(k * 26, -8, 11, 14, 0, 0, 7); g.fill();
        g.fillStyle = '#2b1d14'; g.beginPath(); g.ellipse(k * 26, -8, 4, 11, 0, 0, 7); g.fill();
        g.strokeStyle = '#2b1d14'; g.lineWidth = 3;
        [0, 1].forEach((j) => { g.beginPath(); g.moveTo(k * 34, 18 + j * 9); g.lineTo(k * 88, 6 + j * 26); g.stroke(); });
      });
      g.fillStyle = ear; g.beginPath(); g.moveTo(-9, 12); g.lineTo(9, 12); g.lineTo(0, 24); g.fill();
      g.restore();
    };
    cat(160, 330, 1.0, '#b9715a', '#f2b39a');
    cat(384, 350, 1.15, '#8d8a92', '#d9a8a0');
    cat(608, 330, 1.0, '#2e2622', '#c98a7a');
    g.fillStyle = '#3b2a1f'; g.textAlign = 'center';
    g.font = 'bold 76px "Space Grotesk", sans-serif'; g.fillText('¡TÚ PUEDES!', w / 2, 95);
    g.font = '600 32px "Space Grotesk", sans-serif'; g.fillText('Trabaja con ganas, descansa como un gato', w / 2, 598);
  });
  artPanel(catsTex, 3.0, 2.5, 4.4, 3.6, WZ + 0.18);

  scene.add(createPlant(5.9, -8.4, 1.1));
  scene.add(createPlant(-6.0, -8.4, 1.0));

  /* --- Estantería: más libros y decoración --- */
  const sy = (i) => 0.23 + i * 1.1;
  CY(0.14, 0.16, 0.04, brassDetail, 0.15, sy(0) + 0.02, 0.75, bookshelf);
  SP(0.24, M(0x3f6f8a, 0.5), 0.15, sy(0) + 0.3, 0.75, bookshelf);
  const ring = mk(new THREE.TorusGeometry(0.27, 0.012, 6, 32), brassDetail, 0.15, sy(0) + 0.3, 0.75, bookshelf);
  ring.rotation.y = Math.PI / 2;
  CY(0.1, 0.13, 0.3, M(0xb5654a, 0.5), 0.15, sy(1) + 0.15, -0.75, bookshelf);
  for (let i = 0; i < 5; i++) {
    const br = CY(0.008, 0.008, 0.5, M(0x4f6b57), 0.15 + (i - 2) * 0.03, sy(1) + 0.52, -0.75 + (i - 2) * 0.04, bookshelf);
    br.rotation.z = (i - 2) * 0.12;
    SP(0.06, M(0x6f9a7a, 0.7), 0.15 + (i - 2) * 0.08, sy(1) + 0.78, -0.75 + (i - 2) * 0.05, bookshelf);
  }
  CY(0.12, 0.14, 0.05, M(0x2b1d14), 0.15, sy(2) + 0.025, 0.75, bookshelf);
  CY(0.03, 0.03, 0.25, brassDetail, 0.15, sy(2) + 0.17, 0.75, bookshelf);
  CY(0.13, 0.05, 0.2, brassDetail, 0.15, sy(2) + 0.4, 0.75, bookshelf);
  const tail = mk(new THREE.TorusGeometry(0.1, 0.02, 6, 16, Math.PI * 1.2), M(0x2b2420), 0.08, sy(3) + 0.15, -0.9, bookshelf);
  tail.rotation.y = Math.PI / 2;
  const cb = SP(0.13, M(0x2b2420, 0.8), 0.15, sy(3) + 0.16, -0.75, bookshelf);
  cb.scale.set(1, 1.2, 0.9);
  SP(0.09, M(0x2b2420, 0.8), 0.17, sy(3) + 0.4, -0.75, bookshelf);
  [-1, 1].forEach((k) => {
    mk(new THREE.ConeGeometry(0.035, 0.09, 4), M(0x2b2420), 0.17, sy(3) + 0.5, -0.75 + k * 0.055, bookshelf);
    SP(0.015, M(0xffd23f, 0.3, { emissive: 0xffd23f, emissiveIntensity: 0.6 }), 0.255, sy(3) + 0.42, -0.75 + k * 0.035, bookshelf);
  });

  /* --- Estantería: segundo lado (cara trasera) con más libros --- */
  for (let i = 0; i < 4; i++) {
    const yb = 0.2 + i * 1.1;
    B(0.9, 0.06, 2.8, shelfWood, -1.0, yb, 0, bookshelf);
    B(0.92, 0.01, 2.82, brassDetail, -1.0, yb, 0, bookshelf);
    const gapB = i % 2 === 0 ? [-1.1, -0.4] : [0.4, 1.1];
    let zb = -1.3;
    while (zb < 1.3) {
      const bw = 0.06 + Math.random() * 0.1;
      const bh = 0.5 + Math.random() * 0.4;
      if (zb + bw > gapB[0] && zb < gapB[1]) { zb = gapB[1] + 0.02; continue; }
      const bk = B(0.5, bh, bw, M(bookColors[Math.floor(Math.random() * bookColors.length)], 0.75), -1.15, yb + 0.035 + bh / 2, zb, bookshelf);
      bk.rotation.z = (Math.random() - 0.5) * 0.05;
      zb += bw + 0.02 + Math.random() * 0.04;
    }
    const gz = (gapB[0] + gapB[1]) / 2, ys = yb + 0.03;
    if (i === 0) { [0, 1, 2].forEach((k) => B(0.45 - k * 0.04, 0.07, 0.32, M(bookColors[k + 2], 0.75), -1.1, ys + 0.035 + k * 0.07, gz, bookshelf)); }
    if (i === 1) { CY(0.1, 0.08, 0.2, M(0xa4654c, 0.6), -1.1, ys + 0.1, gz, bookshelf); [0, 1, 2, 3].forEach((k) => SP(0.09, M(0x5f7a5f, 0.8), -1.1 + (k - 1.5) * 0.05, ys + 0.3 + (k % 2) * 0.08, gz + (k - 1.5) * 0.05, bookshelf)); }
    if (i === 2) { CY(0.06, 0.07, 0.14, brassDetail, -1.1, ys + 0.07, gz, bookshelf); SP(0.02, M(0xffe9d6, 0.3, { emissive: 0xffd9b0, emissiveIntensity: 1 }), -1.1, ys + 0.2, gz, bookshelf); }
    if (i === 3) { const fp = B(0.04, 0.42, 0.32, M(0x2b1d14, 0.6), -1.3, ys + 0.21, gz, bookshelf); fp.rotation.z = 0.12; }
  }

  /* Lo que necesita lounge.js */
  ctx.helpers = { M, mk, B, CY, SP, paintTex, wallMat };
})();
