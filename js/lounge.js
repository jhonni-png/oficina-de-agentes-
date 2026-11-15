/* =====================================================================
   SALA DE DESCANSO (aparte de la oficina)
   Sillón y butaca con mesa de centro, mini nevera, alfombra de carreras,
   mesa de billar para cuando los agentes no están en misión y un baño
   escondido en la esquina. Se carga después de decor.js.
   ===================================================================== */
(function buildLounge() {
  'use strict';

  const ctx = window.OfficeCtx;
  if (!ctx || !ctx.helpers) return;
  const { scene, createPlant, roundRect } = ctx;
  const { M, B, CY, SP, paintTex, wallMat } = ctx.helpers;
  const brassDetail = ctx.shelf.brassDetail;

  /* --- Sillón / sofá --- */
  function makeSofa(w, color) {
    const g = new THREE.Group(), s = M(color, 0.85), c = M(0xa4654c, 0.9);
    B(w, 0.4, 0.95, s, 0, 0.28, 0, g);
    B(w, 0.75, 0.22, s, 0, 0.85, -0.36, g);
    [-1, 1].forEach((k) => B(0.24, 0.62, 0.95, s, k * (w / 2 - 0.12), 0.55, 0, g));
    const n = w > 2 ? 2 : 1, cw = (w - 0.5) / n;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * cw;
      B(cw - 0.04, 0.16, 0.68, c, x, 0.56, 0.08, g);
      B(cw - 0.04, 0.5, 0.14, c, x, 0.9, -0.2, g);
    }
    return g;
  }

  /* --- Sala de descanso aparte (con baño escondido en la esquina) --- */
  const lounge = new THREE.Group();
  scene.add(lounge);
  const LH = 2.8, LT = 0.15, LR = 10.9, LZ = 3.7, LX = 3.0;
  const a0 = Math.atan2(LX, Math.sqrt(LR * LR - LX * LX));
  const a1 = Math.atan2(Math.sqrt(LR * LR - LZ * LZ), LZ);
  const nx = LR * Math.sin(a1), wz = LR * Math.cos(a0);

  /* Piso en forma de sector, dentro del círculo de la oficina */
  const fs = new THREE.Shape();
  fs.moveTo(LX, -LZ);
  fs.lineTo(nx, -LZ);
  for (let k = 1; k <= 24; k++) { const a = a1 + (a0 - a1) * k / 24; fs.lineTo(LR * Math.sin(a), -LR * Math.cos(a)); }
  fs.closePath();
  const lfloor = new THREE.Mesh(new THREE.ShapeGeometry(fs), M(0x4f4136, 0.9));
  lfloor.rotation.x = -Math.PI / 2;
  lfloor.position.y = 0.02;
  lfloor.receiveShadow = true;
  lounge.add(lfloor);

  /* Muro curvo bajo siguiendo el borde, y muros rectos con puerta */
  const arcWall = new THREE.Mesh(new THREE.CylinderGeometry(LR, LR, 0.9, 48, 1, true, a0, a1 - a0), M(0x4a4540, 0.9, { side: THREE.DoubleSide }));
  arcWall.position.y = 0.45;
  lounge.add(arcWall);
  B(nx - LX, LH, LT, wallMat, (nx + LX) / 2, LH / 2, LZ, lounge);
  B(LT, LH, 6.6 - LZ, wallMat, LX, LH / 2, (LZ + 6.6) / 2, lounge);
  B(LT, LH, wz - 8.2, wallMat, LX, LH / 2, (8.2 + wz) / 2, lounge);
  B(LT, 0.6, 1.6, wallMat, LX, 2.5, 7.4, lounge);
  /* Baño escondido en la esquina norte */
  B(LT, LH, 1.8, wallMat, 9.4, LH / 2, 4.6, lounge);
  B(2.0, LH, LT, wallMat, 8.4, LH / 2, 5.5, lounge);
  B(LT, LH, 0.8, wallMat, 7.4, LH / 2, 4.1, lounge);
  B(LT, LH, 0.2, wallMat, 7.4, LH / 2, 5.4, lounge);
  B(LT, 0.6, 0.8, wallMat, 7.4, 2.5, 4.9, lounge);
  const lg = new THREE.PointLight(0xffe0c0, 1.0, 10, 2);
  lg.position.set(6.0, 2.6, 6.3);
  lounge.add(lg);

  const rugTex = paintTex(1024, 640, (g, w, h) => {
    // Pista de asfalto con bandera a cuadros arriba y abajo y un deportivo verde
    g.fillStyle = '#34343a'; g.fillRect(0, 0, w, h);
    const sq = 24;
    for (let x = 0; x < w; x += sq) {
      for (let r = 0; r < 2; r++) {
        g.fillStyle = ((x / sq + r) % 2 === 0) ? '#eadcc8' : '#1b1b1f';
        g.fillRect(x, r * sq, sq, sq);
        g.fillRect(x, h - (r + 1) * sq, sq, sq);
      }
    }
    g.fillStyle = '#d4aa4f';
    for (let x = 30; x < w; x += 120) { g.fillRect(x, 84, 70, 10); g.fillRect(x, h - 96, 70, 10); }
    g.lineWidth = 6; g.strokeStyle = 'rgba(216,204,178,.5)';
    [330, 370, 410].forEach((y) => { g.beginPath(); g.moveTo(80, y); g.lineTo(230, y); g.stroke(); });
    g.fillStyle = '#2f6b5e'; roundRect(g, 260, 300, 520, 130, 40); g.fill();
    g.beginPath(); g.moveTo(410, 300); g.lineTo(470, 220); g.lineTo(620, 220); g.lineTo(690, 300); g.closePath(); g.fill();
    g.fillStyle = '#bfe3f2';
    g.beginPath(); g.moveTo(440, 295); g.lineTo(485, 235); g.lineTo(560, 235); g.lineTo(560, 295); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(575, 295); g.lineTo(575, 235); g.lineTo(612, 235); g.lineTo(660, 295); g.closePath(); g.fill();
    g.fillStyle = '#eadcc8'; g.fillRect(284, 308, 476, 12);
    [[360, 440], [690, 440]].forEach(([x, y]) => {
      g.fillStyle = '#16161a'; g.beginPath(); g.arc(x, y, 58, 0, 7); g.fill();
      g.fillStyle = '#d4aa4f'; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill();
    });
    g.fillStyle = '#eadcc8'; g.textAlign = 'center'; g.font = 'bold 60px sans-serif'; g.fillText('07', 700, 378);
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(772, 340, 14, 0, 7); g.fill();
    g.fillStyle = '#d8ccb2'; g.font = 'bold 54px sans-serif'; g.fillText('¡A TODA VELOCIDAD!', w / 2, 160);
  });
  const rug2 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, metalness: 0 }));
  rug2.rotation.x = -Math.PI / 2;
  rug2.position.set(5.3, 0.035, 5.8);
  rug2.receiveShadow = true;
  lounge.add(rug2);

  const sofa = makeSofa(2.6, 0x4f5a4c);
  sofa.position.set(5.3, 0.02, 4.3);
  lounge.add(sofa);
  const armchair = makeSofa(1.1, 0x4f5a4c);
  armchair.position.set(3.55, 0.02, 5.8);
  armchair.rotation.y = Math.PI / 2;
  lounge.add(armchair);

  const ctm = M(0x4a3224, 0.5);
  B(1.2, 0.05, 0.65, ctm, 5.3, 0.42, 5.8, lounge);
  [[-0.52, -0.26], [0.52, -0.26], [-0.52, 0.26], [0.52, 0.26]].forEach(([x, z]) => B(0.06, 0.4, 0.06, ctm, 5.3 + x, 0.2, 5.8 + z, lounge));
  CY(0.04, 0.035, 0.08, M(0xd8ccb2, 0.4), 5.5, 0.49, 5.9, lounge);

  B(0.7, 1.2, 0.65, M(0x3c3f42, 0.4), 3.55, 0.62, 4.15, lounge);
  B(0.72, 0.012, 0.66, M(0x2b1d14), 3.55, 0.9, 4.15, lounge);
  B(0.03, 0.28, 0.03, brassDetail, 3.83, 1.05, 4.49, lounge);
  B(0.03, 0.4, 0.03, brassDetail, 3.83, 0.55, 4.49, lounge);
  lounge.add(createPlant(3.5, 9.1, 0.8));

  /* Mesa de billar (girada, ajustada al sector) */
  const pt = new THREE.Group();
  pt.position.set(5.2, 0.02, 8.05);
  pt.rotation.y = Math.PI / 2;
  pt.scale.setScalar(0.85);
  lounge.add(pt);
  const pw = M(0x3b2417, 0.5);
  B(2.5, 0.28, 1.4, pw, 0, 0.74, 0, pt);
  B(2.1, 0.03, 1.0, M(0x2f5a48, 0.95), 0, 0.895, 0, pt);
  [-0.6, 0.6].forEach((z) => B(2.5, 0.1, 0.2, pw, 0, 0.93, z, pt));
  [-1.15, 1.15].forEach((x) => B(0.2, 0.1, 1.0, pw, x, 0.93, 0, pt));
  [[-1.05, -0.55], [1.05, -0.55], [-1.05, 0.55], [1.05, 0.55]].forEach(([x, z]) => B(0.18, 0.6, 0.18, pw, x, 0.3, z, pt));
  [[-1.05, -0.5], [1.05, -0.5], [-1.05, 0.5], [1.05, 0.5], [0, -0.5], [0, 0.5]].forEach(([x, z]) => CY(0.07, 0.07, 0.02, M(0x0a0805), x, 0.915, z, pt));
  const bc = [0xd4aa4f, 0x2f4258, 0xc0584a, 0x6b4a8a, 0xe07a2f, 0x4f6b57, 0x8a2f2f, 0x111111, 0xd4aa4f, 0x2f4258];
  let bi = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) SP(0.04, M(bc[bi++ % bc.length], 0.3), 0.45 + r * 0.075, 0.95, (c - r / 2) * 0.085, pt);
  SP(0.04, M(0xf0e6d0, 0.3), -0.55, 0.95, 0, pt);
  const cue = CY(0.012, 0.018, 1.5, M(0xc89a5a, 0.5), 0.1, 0.99, 0.62, pt);
  cue.rotation.z = Math.PI / 2;
  B(0.45, 0.12, 1.8, M(0x2f5a48, 0.5, { emissive: 0x2f5a48, emissiveIntensity: 0.5 }), 5.2, 2.2, 8.05, lounge);

  /* Baño */
  const pc = M(0xcfc4b0, 0.35);
  CY(0.2, 0.16, 0.4, pc, 8.95, 0.22, 4.95, lounge);
  CY(0.21, 0.21, 0.04, M(0x8a6347, 0.5), 8.95, 0.44, 4.95, lounge);
  B(0.2, 0.5, 0.42, pc, 9.2, 0.7, 4.95, lounge);
  B(0.8, 0.8, 0.5, M(0x4a3224, 0.6), 8.0, 0.42, 4.05, lounge);
  B(0.84, 0.04, 0.54, M(0x6b5442, 0.4), 8.0, 0.84, 4.05, lounge);
  CY(0.18, 0.14, 0.06, pc, 8.0, 0.88, 4.05, lounge);
  CY(0.012, 0.012, 0.18, brassDetail, 8.0, 0.98, 3.95, lounge);
  B(0.7, 0.9, 0.03, M(0x9fb0b8, 0.1, { metalness: 0.5 }), 8.0, 1.65, 3.8, lounge);
  const wcTex = paintTex(256, 128, (g, w, h) => {
    g.fillStyle = '#2b1d14'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e3cf9a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#e3cf9a'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('WC', w / 2, h / 2 + 4);
  });
  const wcSign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: wcTex, roughness: 0.6 }));
  wcSign.rotation.y = -Math.PI / 2;
  wcSign.position.set(7.32, 2.5, 4.9);
  lounge.add(wcSign);
})();
