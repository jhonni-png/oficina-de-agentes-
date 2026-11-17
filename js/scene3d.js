
/* =====================================================================
   // === INICIO BLOQUE MODELADO 3D DEEPSEEK ===
   ---------------------------------------------------------------------
   OFICINA CORPORATIVA EJECUTIVA (escena base)
   Sala de juntas con ventanales y vista a la ciudad, escritorios
   ejecutivos, agentes de bloques y cubo central que refleja el estado
   global. Puente con los datos: window.updateAgentMonitor3D().
   La decoración vive en decor.js y lounge.js; el arranque, en boot.js.
   ===================================================================== */
(function buildExecutiveOffice3D() {
  'use strict';

  const container = document.getElementById('canvas-3d-container');
  if (!container) return;
  if (typeof THREE === 'undefined') return;

  /* ============ PALETA Y CONSTANTES ============ */
  const PALETTE = {
    brass: 0x8c7f6e, brassLight: 0xbdb2a0, brassDark: 0x5a5148,
    warm: 0xffe9d6, warmDeep: 0xffd9b8,
    cool: 0xb7ad9a, purple: 0x6f8fb5,
    wood: 0x7a6450, woodLight: 0x947a62,
    leather: 0x2e2b28, leatherLight: 0x45403a,
    marble: 0x4a4038,
    navy: 0x2f4258
  };

  const AGENTS = [
    { id: 'planificador', accent: 0x4a6485, angleDeg: -72 },
    { id: 'arquitecto',   accent: 0x8a9a7b, angleDeg: -24 },
    { id: 'constructor',  accent: 0x8a6347, angleDeg:  24 },
    { id: 'auditor',      accent: 0x4f6b57, angleDeg:  72 }
  ];

  const STATUS_HEX = {
    idle:     { hex: 0xb7ad9a, css: '#cdc3b0', label: 'IDLE' },
    thinking: { hex: 0x6f8fb5, css: '#94b0cf', label: 'THINKING' },
    working:  { hex: 0xd4aa4f, css: '#e6c46f', label: 'WORKING' },
    done:     { hex: 0x6f9a7a, css: '#93bb9d', label: 'DONE' },
    error:    { hex: 0xc0584a, css: '#d98476', label: 'ERROR' }
  };

  const ARC_RADIUS = 5.5;

  /* ============ ESCENA ============ */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8a8178);
  scene.fog = new THREE.Fog(0x8a8178, 45, 140);

  const camera = new THREE.PerspectiveCamera(
    44,
    container.clientWidth / container.clientHeight,
    0.1,
    500
  );
  camera.position.set(2, 9, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.65;
  controls.minDistance = 6;
  controls.maxDistance = 32;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.target.set(0, 1.6, -1);
  controls.update();

  /* ============ CIELO ============ */
  const skyGeo = new THREE.SphereGeometry(220, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x4a4f5c) },
      midColor: { value: new THREE.Color(0x8b8580) },
      lowColor: { value: new THREE.Color(0xb5a899) }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor; uniform vec3 midColor; uniform vec3 lowColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 c = mix(lowColor, midColor, smoothstep(-0.3, 0.3, h));
        c = mix(c, topColor, smoothstep(0.3, 0.9, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  /* ============ ESTRELLAS ============ */
  const STAR_COUNT = 3200;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starColors = new Float32Array(STAR_COUNT * 3);
  const starPalette = [
    new THREE.Color(0xc9e4ff), new THREE.Color(0xe8d4ff),
    new THREE.Color(0xffffff), new THREE.Color(0xfff0cc)
  ];
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 85 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const col = starPalette[Math.floor(Math.random() * starPalette.length)];
    starColors[i * 3]     = col.r;
    starColors[i * 3 + 1] = col.g;
    starColors[i * 3 + 2] = col.b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.7, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.85, depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.visible = false;
  scene.add(stars);

  /* ============ LUNAS ============ */
  function makeCelestialBody(colorHex, radius, position) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.88 })
    );
    core.position.copy(position);
    scene.add(core);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.6, 32, 24),
      new THREE.MeshBasicMaterial({
        color: colorHex, transparent: true, opacity: 0.09,
        side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    glow.position.copy(position);
    scene.add(glow);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 2.5, 32, 24),
      new THREE.MeshBasicMaterial({
        color: colorHex, transparent: true, opacity: 0.03,
        side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    halo.position.copy(position);
    scene.add(halo);
    return { core, glow, halo };
  }
  const moonA = makeCelestialBody(0xb48cff, 4.2, new THREE.Vector3(-22, 24, -55));
  const moonB = makeCelestialBody(0x5b9dff, 2.4, new THREE.Vector3(24, 18, -52));
  [moonA, moonB].forEach((m) => { m.core.visible = m.glow.visible = m.halo.visible = false; });

  /* ============ ILUMINACIÓN ============ */
  scene.add(new THREE.AmbientLight(0xffeedd, 0.36));

  const hemi = new THREE.HemisphereLight(0xfff0e0, 0x5a4e44, 0.42);
  hemi.position.set(0, 30, 0);
  scene.add(hemi);

  const keyWarm = new THREE.DirectionalLight(0xffe3c4, 0.7);
  keyWarm.position.set(8, 14, 6);
  keyWarm.castShadow = true;
  keyWarm.shadow.mapSize.set(2048, 2048);
  keyWarm.shadow.camera.near = 1;
  keyWarm.shadow.camera.far = 50;
  keyWarm.shadow.camera.left = -14;
  keyWarm.shadow.camera.right = 14;
  keyWarm.shadow.camera.top = 14;
  keyWarm.shadow.camera.bottom = -14;
  keyWarm.shadow.bias = -0.0006;
  keyWarm.shadow.normalBias = 0.02;
  scene.add(keyWarm);

  const rimCool = new THREE.DirectionalLight(0xffd2b0, 0.28);
  rimCool.position.set(0, 8, -20);
  scene.add(rimCool);

  const rimPurple = new THREE.DirectionalLight(0xffc8a0, 0.15);
  rimPurple.position.set(-14, 6, -6);
  scene.add(rimPurple);

  /* ============ SUELO DE MÁRMOL ============ */
  function makeMarbleTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const ctx = c.getContext('2d');
    // Baldosas en damero de dos tonos, con junta oscura y un filo de luz arriba/izquierda
    const T = 256;
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = (r + k) % 2 === 0 ? '#5d4d40' : '#4a3d32';
        ctx.fillRect(k * T, r * T, T, T);
      }
    }
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = `rgba(30,18,8,${Math.random() * 0.07})`;
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }
    ctx.fillStyle = 'rgba(255,225,190,0.14)';
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++) {
        ctx.fillRect(k * T + 6, r * T + 6, T - 12, 4);
        ctx.fillRect(k * T + 6, r * T + 6, 4, T - 12);
      }
    }
    ctx.strokeStyle = '#1f1813';
    ctx.lineWidth = 10;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * T, 0); ctx.lineTo(i * T, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * T); ctx.lineTo(1024, i * T); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  const marbleTex = makeMarbleTexture();
  const floorGeo = new THREE.CircleGeometry(11.5, 96);
  const floorMat = new THREE.MeshStandardMaterial({
    map: marbleTex, color: 0xffffff,
    roughness: 0.4, metalness: 0.05, envMapIntensity: 0.4
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const subFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(11.5, 8.0, 1.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x6a5d50, roughness: 0.9, metalness: 0.1 })
  );
  subFloor.position.y = -0.7;
  scene.add(subFloor);

  // Anillos dorados
  for (let i = 1; i <= 5; i++) {
    const r = i * 2.2;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.015, r + 0.015, 128),
      new THREE.MeshBasicMaterial({
        color: PALETTE.brass, transparent: true, opacity: 0.12,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.008;
    scene.add(ring);
  }

  // Medallón central
  const medallionOuter = new THREE.Mesh(
    new THREE.RingGeometry(2.35, 2.42, 96),
    new THREE.MeshBasicMaterial({
      color: PALETTE.brassLight, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  medallionOuter.rotation.x = -Math.PI / 2;
  medallionOuter.position.y = 0.009;
  scene.add(medallionOuter);

  const medallionInner = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 2.3, 96),
    new THREE.MeshBasicMaterial({
      color: 0x2f4258, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  medallionInner.rotation.x = -Math.PI / 2;
  medallionInner.position.y = 0.006;
  scene.add(medallionInner);

  /* ============ VENTANAL CURVO TRASERO ============ */
  const WALL_RADIUS = 10.8;
  const WALL_HEIGHT = 7;
  const WALL_ANGLE_START = -Math.PI * 0.62;
  const WALL_ANGLE_LENGTH = Math.PI * 1.24;

  const glassGeo = new THREE.CylinderGeometry(
    WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 96, 1, true,
    WALL_ANGLE_START, WALL_ANGLE_LENGTH
  );
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbdd0e0, roughness: 0.08, metalness: 0.1,
    transparent: true, opacity: 0.14,
    side: THREE.BackSide, envMapIntensity: 0.6
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.y = WALL_HEIGHT / 2;
  scene.add(glass);

  // Montantes verticales de latón
  const brassMountMat = new THREE.MeshStandardMaterial({
    color: 0x2e2b28, roughness: 0.4, metalness: 0.3,
    emissive: 0x000000, emissiveIntensity: 0
  });
  const MULLION_COUNT = 18;
  for (let i = 0; i <= MULLION_COUNT; i++) {
    const angle = WALL_ANGLE_START + (i / MULLION_COUNT) * WALL_ANGLE_LENGTH;
    const mullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, WALL_HEIGHT, 0.06),
      brassMountMat
    );
    mullion.position.set(
      Math.cos(angle) * WALL_RADIUS,
      WALL_HEIGHT / 2,
      Math.sin(angle) * WALL_RADIUS
    );
    mullion.rotation.y = -angle;
    scene.add(mullion);
  }

  // Bandas horizontales
  function createWallBand(y) {
    const pts = [];
    const segs = 96;
    for (let i = 0; i <= segs; i++) {
      const a = WALL_ANGLE_START + (i / segs) * WALL_ANGLE_LENGTH;
      pts.push(new THREE.Vector3(Math.cos(a) * WALL_RADIUS, y, Math.sin(a) * WALL_RADIUS));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 96, 0.05, 6, false);
    return new THREE.Mesh(geo, brassMountMat);
  }
  [0.05, 3.5, WALL_HEIGHT - 0.05].forEach(y => scene.add(createWallBand(y)));

  /* ============ CIUDAD AL FONDO ============ */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.45;
  scene.add(ground);
  const cityMats = [0x77716a, 0x6d737c, 0x857c70].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 }));
  for (let i = 0; i < 130; i++) {
    const a = (i / 130) * Math.PI * 2 + Math.random() * 0.03;
    const r = 42 + Math.random() * 38;
    const h = 8 + Math.random() * 42;
    const w = 3 + Math.random() * 5;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), cityMats[i % 3]);
    b.position.set(Math.cos(a) * r, h / 2 - 1.45, Math.sin(a) * r);
    scene.add(b);
  }

  /* ============ MESA DE JUNTAS CENTRAL ============ */
  const centralTable = new THREE.Group();

  const tableTopMat = new THREE.MeshStandardMaterial({
    color: PALETTE.marble, roughness: 0.15, metalness: 0.7
  });
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 2.2), tableTopMat);
  tableTop.position.y = 0.94;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  centralTable.add(tableTop);

  const tableEdge = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.05, 8, 64),
    new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.25, metalness: 0.95 })
  );
  tableEdge.rotation.x = Math.PI / 2;
  tableEdge.position.y = 0.94;
  tableEdge.visible = false;
  centralTable.add(tableEdge);

  const tableColumn = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.9, 1.4),
    new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.3, metalness: 0.9 })
  );
  tableColumn.position.y = 0.45;
  tableColumn.castShadow = true;
  centralTable.add(tableColumn);

  const tableBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.05, 1.9),
    new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.35, metalness: 0.9 })
  );
  tableBase.position.y = 0.025;
  centralTable.add(tableBase);

  scene.add(centralTable);

  /* ============ LÁMPARA DE CRISTAL HOLOGRÁFICA ============ */
  const chandelier = new THREE.Group();
  chandelier.position.set(0, 4.8, 0);
  scene.add(chandelier);

  const gemGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const gemMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cool, emissive: PALETTE.cool, emissiveIntensity: 1.6,
    roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.85
  });
  const gem = new THREE.Mesh(gemGeo, gemMat);
  chandelier.add(gem);

  const gemWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(gemGeo),
    new THREE.LineBasicMaterial({ color: 0x2e2b28, transparent: true, opacity: 0.9 })
  );
  chandelier.add(gemWire);

  const chandelierCrystals = [];
  for (let i = 0; i < 8; i++) {
    const cGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    const cMat = new THREE.MeshStandardMaterial({
      color: PALETTE.brassLight, emissive: PALETTE.warm, emissiveIntensity: 1.4,
      roughness: 0.15, metalness: 0.85
    });
    const crystal = new THREE.Mesh(cGeo, cMat);
    chandelier.add(crystal);
    chandelierCrystals.push({
      mesh: crystal,
      angle: (i / 8) * Math.PI * 2,
      radius: 1.1 + (i % 3) * 0.25,
      speed: 0.3 + (i % 3) * 0.1,
      yOff: ((i % 4) - 1.5) * 0.18
    });
  }

  // Cables de suspensión
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const cablePts = [
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(Math.cos(ang) * 0.15, 1.0, Math.sin(ang) * 0.15),
      new THREE.Vector3(Math.cos(ang) * 0.28, 2.0, Math.sin(ang) * 0.28)
    ];
    const cableCurve = new THREE.CatmullRomCurve3(cablePts);
    const cableGeo = new THREE.TubeGeometry(cableCurve, 12, 0.012, 4, false);
    const cable = new THREE.Mesh(
      cableGeo,
      new THREE.MeshStandardMaterial({ color: PALETTE.brassDark, roughness: 0.4, metalness: 0.9 })
    );
    chandelier.add(cable);
  }

  const chandelierLight = new THREE.PointLight(PALETTE.warm, 2.0, 8, 2);
  chandelier.add(chandelierLight);

  const gemLight = new THREE.PointLight(PALETTE.cool, 1.5, 6, 2);
  chandelier.add(gemLight);

  /* ============ BIBLIOTECA (izquierda) ============ */
  const bookshelf = new THREE.Group();
  bookshelf.position.set(-8, 0, -4);
  bookshelf.rotation.y = Math.PI * 0.15;
  scene.add(bookshelf);

  const shelfWood = new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.7, metalness: 0.1 });
  const shelfWoodDark = new THREE.MeshStandardMaterial({ color: PALETTE.woodLight, roughness: 0.75, metalness: 0.08 });
  const brassDetail = new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.3, metalness: 0.9 });

  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.5, 2.8), shelfWoodDark);
  backPanel.position.set(-0.5, 2.25, 0);
  backPanel.castShadow = true;
  backPanel.receiveShadow = true;
  bookshelf.add(backPanel);

  for (let i = 0; i < 4; i++) {
    const y = 0.2 + i * 1.1;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 2.8), shelfWood);
    shelf.position.set(0, y, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    bookshelf.add(shelf);

    const detail = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.01, 2.82), brassDetail);
    detail.position.set(0, y, 0);
    bookshelf.add(detail);
  }

  const bookColors = [0x6e3b32, 0xa89a86, 0x2f4258, 0x9a5a45, 0x5f7a5f, 0x8c7f6e, 0x3a3029, 0x4f6a78, 0x5a4a58];
  for (let shelfIdx = 0; shelfIdx < 4; shelfIdx++) {
    const y = 0.235 + shelfIdx * 1.1;
    let z = -1.3;
    const gap = shelfIdx % 2 === 0 ? [0.4, 1.1] : [-1.1, -0.4];
    while (z < 1.3) {
      const bw = 0.06 + Math.random() * 0.1;
      const bh = 0.5 + Math.random() * 0.4;
      if (z + bw > gap[0] && z < gap[1]) { z = gap[1] + 0.02; continue; }
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, bh, bw),
        new THREE.MeshStandardMaterial({
          color: bookColors[Math.floor(Math.random() * bookColors.length)],
          roughness: 0.75, metalness: 0.1
        })
      );
      book.position.set(0.15, y + bh / 2, z);
      book.rotation.z = (Math.random() - 0.5) * 0.05;
      book.castShadow = true;
      bookshelf.add(book);
      z += bw + 0.02 + Math.random() * 0.04;
    }
  }

  /* ============ PLANTAS (derecha) ============ */
  function createPlant(x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.28, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0xb5654a, roughness: 0.4, metalness: 0.1 })
    );
    pot.position.y = 0.25;
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.3, metalness: 0.9 })
    );
    rim.position.y = 0.5;
    group.add(rim);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24),
      new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 1 })
    );
    soil.position.y = 0.51;
    group.add(soil);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 })
    );
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    group.add(trunk);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const leafGroup = new THREE.Group();
      leafGroup.position.y = 1.7;
      leafGroup.rotation.y = angle;

      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.01, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x7d8f6e, roughness: 0.7, metalness: 0.05 })
      );
      leaf.position.set(0.25, 0.1 + Math.random() * 0.15, 0);
      leaf.rotation.z = -0.4 - Math.random() * 0.3;
      leaf.castShadow = true;
      leafGroup.add(leaf);

      const leaflet = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.01, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x5f7a5f, roughness: 0.7 })
      );
      leaflet.position.set(0.18, 0.05, 0.06);
      leaflet.rotation.z = -0.3;
      leafGroup.add(leaflet);

      group.add(leafGroup);
    }
    return group;
  }
  scene.add(createPlant(7.5, -4, 1.2));
  scene.add(createPlant(-7, -6.5, 0.9));

  /* ============ LÁMPARAS COLGANTES (flotantes) ============ */
  const pendantLights = [];
  AGENTS.forEach((cfg) => {
    const rad = THREE.MathUtils.degToRad(cfg.angleDeg);
    const x = Math.sin(rad) * ARC_RADIUS;
    const z = -Math.cos(rad) * ARC_RADIUS + 0.5;

    const pendant = new THREE.Group();
    pendant.position.set(x, 4.2, z);
    pendant.rotation.y = -rad * 0.62;

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.04, 0.15, 12),
      new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.3, metalness: 0.9 })
    );
    cap.position.y = 0.35;
    pendant.add(cap);

    const shade = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.05, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0xd8c4a8, roughness: 0.5, metalness: 0,
        emissive: 0xffd9b0, emissiveIntensity: 0.8
      })
    );
    shade.position.y = 0.1;
    pendant.add(shade);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 12),
      new THREE.MeshBasicMaterial({ color: PALETTE.warm })
    );
    bulb.position.y = 0.05;
    pendant.add(bulb);

    const pLight = new THREE.PointLight(PALETTE.warm, 0.8, 5, 2);
    pLight.position.y = 0;
    pendant.add(pLight);

    scene.add(pendant);
    pendantLights.push({ group: pendant, light: pLight, cfg });
  });

  /* ============ HELPERS CANVASTEXTURE ============ */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    const source = String(text == null ? '' : text);
    const paragraphs = source.split('\n');
    const out = [];
    paragraphs.forEach((p) => {
      const words = p.split(' ');
      let line = '';
      words.forEach((original) => {
        let word = original;
        let guard = 0;
        while (word.length > 0 && ctx.measureText(word).width > maxWidth && guard++ < 500) {
          let i = 1;
          while (i < word.length && ctx.measureText(word.slice(0, i + 1)).width <= maxWidth) i++;
          if (i < 1) i = 1;
          if (line) { out.push(line); line = ''; }
          out.push(word.slice(0, i));
          word = word.slice(i);
        }
        if (word.length === 0) return;
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          out.push(line); line = word;
        } else {
          line = test;
        }
      });
      out.push(line);
    });
    if (out.length === 0) out.push('');
    return out;
  }

  function drawScreen(station) {
    const canvas = station.canvasEl;
    const ctx = station.ctx;
    const W = canvas.width;
    const H = canvas.height;
    const st = STATUS_HEX[station.status] || STATUS_HEX.idle;
    const accentCss = '#' + station.accent.toString(16).padStart(6, '0');

    ctx.fillStyle = '#27231f';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(230,215,190,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

    ctx.fillStyle = accentCss;
    ctx.fillRect(0, 0, W, 56);

    ctx.fillStyle = '#27231f';
    ctx.font = 'bold 28px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(station.id.toUpperCase(), 22, 29);

    ctx.font = 'bold 20px "IBM Plex Mono", ui-monospace, monospace';
    const label = st.label;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(39,35,31,0.35)';
    roundRect(ctx, W - tw - 48, 12, tw + 30, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#27231f';
    ctx.textAlign = 'left';
    ctx.fillText(label, W - tw - 32, 30);

    ctx.fillStyle = 'rgba(212,170,79,0.4)';
    ctx.fillRect(22, 72, W - 44, 2);

    ctx.font = '22px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const bodyText = station.screenText && station.screenText.length
      ? station.screenText
      : '> esperando instrucciones...';

    const lines = wrapText(ctx, bodyText, W - 60);
    const maxLines = 8;
    const startY = 112;
    const lineH = 34;

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      const isLast = (i === Math.min(lines.length, maxLines) - 1);
      const shown = lines[i];
      if (i === 0) {
        ctx.fillStyle = st.css;
        ctx.fillText(shown, 30, startY);
        if (station.cursorOn && !isLast) {
          const w = ctx.measureText(shown).width;
          ctx.fillStyle = st.css;
          ctx.fillRect(30 + w + 4, startY - 11, 13, 22);
        }
      } else {
        ctx.fillStyle = 'rgba(243,238,227,0.8)';
        ctx.fillText(shown, 30, startY + i * lineH);
      }
    }
    if (lines.length > maxLines) {
      ctx.fillStyle = 'rgba(243,238,227,0.4)';
      ctx.font = '18px "IBM Plex Mono", ui-monospace, monospace';
      ctx.fillText('... +' + (lines.length - maxLines) + ' líneas', 30, startY + maxLines * lineH);
    }

    ctx.fillStyle = 'rgba(212,170,79,0.55)';
    ctx.font = '16px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DIRECTORATE SUITE', 26, H - 18);
    ctx.textAlign = 'right';
    ctx.fillText('◆ ' + station.status.toUpperCase(), W - 26, H - 18);

    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

    station.tex.needsUpdate = true;
  }

  /* ============ MATERIALES EJECUTIVOS ============ */
  const deskMaterials = {
    wood:        new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.5, metalness: 0.15 }),
    leather:     new THREE.MeshStandardMaterial({ color: PALETTE.leather, roughness: 0.85, metalness: 0.05 }),
    leatherSm:   new THREE.MeshStandardMaterial({ color: PALETTE.leatherLight, roughness: 0.5, metalness: 0.1 }),
    brass:       new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.3, metalness: 0.9, emissive: 0x2a1a00, emissiveIntensity: 0.1 }),
    brassBright: new THREE.MeshStandardMaterial({ color: PALETTE.brassLight, roughness: 0.2, metalness: 0.95 }),
    metalDark:   new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 }),
    glass:       new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.15, metalness: 0.85 }),
    marble:      new THREE.MeshStandardMaterial({ color: PALETTE.marble, roughness: 0.15, metalness: 0.65 })
  };

  /* ============ SILLA EJECUTIVA ============ */
  function createExecutiveChair() {
    const group = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 0.6, metalness: 0.1 });
    const leatherMat2 = new THREE.MeshStandardMaterial({ color: 0x140d08, roughness: 0.7, metalness: 0.05 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.75 });
    const brassMat = new THREE.MeshStandardMaterial({ color: PALETTE.brass, roughness: 0.3, metalness: 0.9 });

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.35), metalMat);
      arm.position.set(Math.sin(ang) * 0.17, 0.08, Math.cos(ang) * 0.17);
      arm.rotation.y = -ang;
      arm.castShadow = true;
      group.add(arm);
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), metalMat);
      wheel.position.set(Math.sin(ang) * 0.32, 0.05, Math.cos(ang) * 0.32);
      group.add(wheel);
    }

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.35, 12), metalMat);
    post.position.y = 0.28;
    group.add(post);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.55), leatherMat);
    seat.position.y = 0.5;
    seat.castShadow = true;
    group.add(seat);

    const seatPipe = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.01, 0.01), brassMat);
    seatPipe.position.set(0, 0.56, 0.28);
    group.add(seatPipe);

    const back = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.85, 16, 1, true, -Math.PI / 2.5, Math.PI * 2 / 2.5),
      leatherMat2
    );
    back.position.set(0, 0.98, -0.18);
    back.rotation.x = 0.08;
    back.castShadow = true;
    group.add(back);

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.06), leatherMat);
    backPanel.position.set(0, 0.98, -0.25);
    group.add(backPanel);

    for (let i = 0; i < 6; i++) {
      const tx = (i % 3 - 1) * 0.16;
      const ty = 0.8 + Math.floor(i / 3) * 0.28;
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), brassMat);
      button.position.set(tx, ty, -0.12);
      group.add(button);
    }

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.12), leatherMat);
    headrest.position.set(0, 1.45, -0.18);
    group.add(headrest);

    [-0.34, 0.34].forEach((x) => {
      const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.42), leatherMat);
      armrest.position.set(x, 0.72, 0);
      armrest.castShadow = true;
      group.add(armrest);
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), metalMat);
      support.position.set(x, 0.6, 0.1);
      group.add(support);
    });

    return group;
  }

  /* ============ ESCRITORIO EJECUTIVO ============ */
  function createExecutiveDesk() {
    const group = new THREE.Group();

    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 1.5), deskMaterials.wood);
    deskTop.position.y = 0.85;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    group.add(deskTop);

    const inlay = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.005, 0.9), deskMaterials.marble);
    inlay.position.set(0, 0.893, 0.05);
    group.add(inlay);

    const edgeTrim = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.012, 0.03), deskMaterials.brass);
    edgeTrim.position.set(0, 0.892, 0.755);
    group.add(edgeTrim);

    [-1.51, 1.51].forEach((x) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 1.5), deskMaterials.brass);
      side.position.set(x, 0.892, 0);
      group.add(side);
    });

    const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.6, 0.08), deskMaterials.leather);
    frontPanel.position.set(0, 0.52, 0.71);
    frontPanel.castShadow = true;
    group.add(frontPanel);

    for (let i = -1; i <= 1; i += 2) {
      const accent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.085), deskMaterials.brassBright);
      accent.position.set(i * 1.4, 0.52, 0.715);
      group.add(accent);
    }

    [-1.4, 1.4].forEach((x) => {
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 1.4), deskMaterials.wood);
      pedestal.position.set(x, 0.39, 0);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      group.add(pedestal);

      for (let i = 0; i < 2; i++) {
        const drawerLine = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.01, 1.3), deskMaterials.brass);
        drawerLine.position.set(x, 0.35 + i * 0.3, 0);
        group.add(drawerLine);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.15), deskMaterials.brassBright);
        handle.position.set(x + 0.1, 0.35 + i * 0.3, 0);
        group.add(handle);
      }
    });

    return group;
  }

  /* ============ LÁMPARA DE ESCRITORIO ============ */
  function createDeskLamp() {
    const group = new THREE.Group();
    const brassMat = deskMaterials.brass;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 20), brassMat);
    base.position.y = 0.015;
    group.add(base);

    const armPts = [
      new THREE.Vector3(0, 0.03, 0),
      new THREE.Vector3(0.03, 0.15, 0.02),
      new THREE.Vector3(0.08, 0.28, 0.08)
    ];
    const armCurve = new THREE.CatmullRomCurve3(armPts);
    const armGeo = new THREE.TubeGeometry(armCurve, 20, 0.01, 6, false);
    const arm = new THREE.Mesh(armGeo, brassMat);
    group.add(arm);

    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.09, 20, 1, true),
      new THREE.MeshStandardMaterial({
        color: PALETTE.brassLight, roughness: 0.35, metalness: 0.85,
        side: THREE.DoubleSide, emissive: PALETTE.warm, emissiveIntensity: 0.4
      })
    );
    shade.position.set(0.08, 0.28, 0.08);
    shade.rotation.z = -0.4;
    group.add(shade);

    const light = new THREE.PointLight(PALETTE.warm, 0.45, 1.5, 2);
    light.position.set(0.08, 0.24, 0.08);
    group.add(light);

    return { group, light };
  }

  /* ============ AVATAR EJECUTIVO (bloques) ============ */
  function createExecutiveAvatar(cfg) {
    const avatar = new THREE.Group();
    const LOOK = ({
      planificador: { suit: 0x2f4258, skin: 0xe0b894, hair: 0x2a1c12 },
      arquitecto:   { suit: 0x35322f, skin: 0xc68e64, hair: 0x111111 },
      constructor:  { suit: 0x5f4a3a, skin: 0xf0cfae, hair: 0x6b4a2b },
      auditor:      { suit: 0x3f5246, skin: 0x8d5b3a, hair: 0x0c0c0c }
    })[cfg.id] || { suit: 0x2f4258, skin: 0xe0b894, hair: 0x2a1c12 };
    const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, extra || {}));
    const suitMat = mat(LOOK.suit), shirtMat = mat(0xd6d0c4), skinMat = mat(LOOK.skin);
    const hairMat = mat(LOOK.hair, { roughness: 0.9 });
    const tieMat = mat(0x2e2b28);
    const badgeMat = mat(cfg.accent);
    const steelMat = mat(PALETTE.brass, { roughness: 0.4, metalness: 0.5 });
    const box = (w, h, d, m, x, y, z, shadow) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      if (shadow) { o.castShadow = true; o.receiveShadow = true; }
      avatar.add(o);
      return o;
    };

    box(0.66, 0.82, 0.38, suitMat, 0, 1.28, 0, true);          // torso
    box(0.84, 0.16, 0.4, suitMat, 0, 1.66, 0, true);           // hombros
    box(0.2, 0.55, 0.02, shirtMat, 0, 1.36, 0.195);            // camisa
    box(0.07, 0.46, 0.02, tieMat, 0, 1.3, 0.21);               // corbata
    box(0.28, 0.07, 0.04, shirtMat, 0, 1.66, 0.19);            // cuello camisa
    box(0.1, 0.13, 0.02, badgeMat, 0.2, 1.42, 0.2);              // credencial
    box(0.14, 0.1, 0.14, skinMat, 0, 1.76, 0);                 // cuello
    box(0.42, 0.42, 0.4, skinMat, 0, 1.98, 0, true);           // cabeza
    box(0.44, 0.12, 0.42, hairMat, 0, 2.2, -0.01);             // pelo (tapa)
    box(0.44, 0.3, 0.1, hairMat, 0, 2.04, -0.16);              // pelo (nuca)

    const visor = box(0.36, 0.08, 0.04, new THREE.MeshStandardMaterial({
      color: 0xffe9d6, emissive: 0xffe9d6, emissiveIntensity: 0.9,
      roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.9
    }), 0, 1.99, 0.21);
    box(0.4, 0.012, 0.05, steelMat, 0, 2.04, 0.21);
    box(0.4, 0.012, 0.05, steelMat, 0, 1.94, 0.21);
    box(0.05, 0.08, 0.08, steelMat, 0.23, 1.98, 0.04);         // auricular

    const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armL = new THREE.Mesh(armGeo, suitMat);
    armL.position.set(-0.42, 1.42, 0.1); armL.rotation.x = -0.55; armL.rotation.z = 0.12; armL.castShadow = true;
    avatar.add(armL);
    const armR = new THREE.Mesh(armGeo, suitMat);
    armR.position.set(0.42, 1.42, 0.1); armR.rotation.x = -0.55; armR.rotation.z = -0.12; armR.castShadow = true;
    avatar.add(armR);

    const handL = box(0.12, 0.12, 0.12, skinMat, -0.4, 1.2, 0.3);
    const handR = box(0.12, 0.12, 0.12, skinMat, 0.4, 1.2, 0.3);

    return { group: avatar, armL, armR, visor, handL, handR };
  }

  /* ============ ESTACIÓN DE AGENTE ============ */
  const stations = {};

  function createAgentStation(cfg) {
    const rad = THREE.MathUtils.degToRad(cfg.angleDeg);
    const gx = Math.sin(rad) * ARC_RADIUS;
    const gz = -Math.cos(rad) * ARC_RADIUS + 0.5;

    const root = new THREE.Group();
    root.position.set(gx, 0, gz);
    root.rotation.y = -rad * 0.62;
    scene.add(root);

    // === Despacho ===
    root.add(createExecutiveDesk());

    // === Silla (detrás del avatar) ===
    const chair = createExecutiveChair();
    chair.position.set(0, 0, -1.6);
    chair.rotation.y = Math.PI;
    root.add(chair);

    // === Avatar ===
    const avatarObj = createExecutiveAvatar(cfg);
    avatarObj.group.position.set(0, 0, -1.1);
    root.add(avatarObj.group);

    // === Lámpara ===
    const lampObj = createDeskLamp();
    lampObj.group.position.set(-1.15, 0.89, 0.35);
    root.add(lampObj.group);

    // === Monitor ===
    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(0.15, 0.9, 0.15);
    monitorGroup.rotation.x = -0.06;
    root.add(monitorGroup);

    const monBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.035, 26), deskMaterials.brass);
    monBase.position.y = 0.02;
    monBase.castShadow = true;
    monitorGroup.add(monBase);

    const monNeck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.06), deskMaterials.metalDark);
    monNeck.position.y = 0.23;
    monitorGroup.add(monNeck);

    const monFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.9, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.35, metalness: 0.8 })
    );
    monFrame.position.y = 0.82;
    monFrame.castShadow = true;
    monitorGroup.add(monFrame);

    const frameBorderGeo = new THREE.BoxGeometry(1.58, 0.04, 0.07);
    const frameTop = new THREE.Mesh(frameBorderGeo, deskMaterials.brass);
    frameTop.position.set(0, 1.27, 0);
    monitorGroup.add(frameTop);
    const frameBottom = new THREE.Mesh(frameBorderGeo, deskMaterials.brass);
    frameBottom.position.set(0, 0.37, 0);
    monitorGroup.add(frameBottom);

    const canvasEl = document.createElement('canvas');
    canvasEl.width = 640;
    canvasEl.height = 384;
    const ctx = canvasEl.getContext('2d');

    const tex = new THREE.CanvasTexture(canvasEl);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.82), screenMat);
    screenMesh.position.set(0, 0.82, 0.031);
    monitorGroup.add(screenMesh);

    // === Accesorios de escritorio ===
    const papers = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.03, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xd8ccb2, roughness: 0.9 })
    );
    papers.position.set(1.0, 0.91, 0.3);
    papers.rotation.y = 0.15;
    root.add(papers);

    // Café
    const cupGroup = new THREE.Group();
    cupGroup.position.set(1.15, 0.89, -0.2);
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 })
    );
    cup.position.y = 0.05;
    cupGroup.add(cup);
    const coffee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.043, 0.043, 0.005, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a1205, roughness: 0.3 })
    );
    coffee.position.y = 0.095;
    cupGroup.add(coffee);
    const cupHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.008, 6, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 })
    );
    cupHandle.rotation.z = -Math.PI / 2;
    cupHandle.position.set(0.055, 0.05, 0);
    cupGroup.add(cupHandle);
    root.add(cupGroup);

    // Portalápices
    const penHolder = new THREE.Group();
    penHolder.position.set(-0.75, 0.89, -0.35);
    const phBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16), deskMaterials.brass);
    phBase.position.y = 0.06;
    penHolder.add(phBase);
    for (let i = 0; i < 3; i++) {
      const pen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.15, 6),
        new THREE.MeshStandardMaterial({
          color: [0x0a0a0a, 0x2a1a10, 0xd4af37][i],
          roughness: 0.4, metalness: 0.6
        })
      );
      pen.position.set((Math.random() - 0.5) * 0.02, 0.14, (Math.random() - 0.5) * 0.02);
      pen.rotation.x = (Math.random() - 0.5) * 0.2;
      pen.rotation.z = (Math.random() - 0.5) * 0.2;
      penHolder.add(pen);
    }
    root.add(penHolder);

    // Placa con nombre
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 64;
    const nctx = nameCanvas.getContext('2d');
    nctx.fillStyle = '#d4af37';
    nctx.fillRect(0, 0, 256, 64);
    nctx.fillStyle = '#1a0f00';
    nctx.font = 'bold 22px "IBM Plex Mono", monospace';
    nctx.textAlign = 'center';
    nctx.textBaseline = 'middle';
    nctx.fillText(cfg.id.toUpperCase(), 128, 32);
    const nameTex = new THREE.CanvasTexture(nameCanvas);
    if (THREE.sRGBEncoding !== undefined) nameTex.encoding = THREE.sRGBEncoding;
    const nameplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.04),
      new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.4, metalness: 0.7 })
    );
    nameplate.position.set(0, 0.94, 0.62);
    nameplate.rotation.x = -0.15;
    root.add(nameplate);

    // === Luz de estado ===
    const stateLightMat = new THREE.MeshStandardMaterial({
      color: STATUS_HEX.idle.hex, emissive: STATUS_HEX.idle.hex,
      emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.3
    });
    const stateBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), stateLightMat);
    stateBulb.position.set(-1.25, 1.0, -0.3);
    root.add(stateBulb);

    const stateBulbBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.02, 16), deskMaterials.brass
    );
    stateBulbBase.position.set(-1.25, 0.91, -0.3);
    root.add(stateBulbBase);

    const stateLight = new THREE.PointLight(STATUS_HEX.idle.hex, 0.9, 4, 2);
    stateLight.position.set(-1.25, 1.1, -0.3);
    root.add(stateLight);

    // === Anillo de estado en el suelo ===
    const ringMat = new THREE.MeshBasicMaterial({
      color: STATUS_HEX.idle.hex, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false
    });
    const stateRing = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.22, 4, 1, Math.PI / 4), ringMat);
    stateRing.rotation.x = -Math.PI / 2;
    stateRing.position.y = 0.012;
    root.add(stateRing);

    // === Alfombra ===
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x4a423b, roughness: 0.9, metalness: 0.05 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.004;
    rug.receiveShadow = true;
    root.add(rug);

    const rugBorder = new THREE.Mesh(
      new THREE.RingGeometry(1.82, 1.87, 4, 1, Math.PI / 4),
      new THREE.MeshBasicMaterial({
        color: PALETTE.brass, transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.y = 0.006;
    root.add(rugBorder);

    // === Registro ===
    const station = {
      id: cfg.id,
      accent: cfg.accent,
      root,
      avatarGroup: avatarObj.group,
      armL: avatarObj.armL,
      armR: avatarObj.armR,
      handL: avatarObj.handL,
      handR: avatarObj.handR,
      visor: avatarObj.visor,
      canvasEl, ctx, tex, screenMesh,
      stateLight, stateBulb, stateLightMat,
      stateRing, stateRingMat: ringMat,
      lampLight: lampObj.light,
      status: 'idle',
      screenText: '',
      phase: Math.random() * Math.PI * 2,
      cursorOn: true
    };

    stations[cfg.id] = station;
    drawScreen(station);
    return station;
  }

  AGENTS.forEach((cfg) => createAgentStation(cfg));

  /* ============ COLOR DE LA GEMA SEGÚN ESTADO AGREGADO ============ */
  function refreshGemColor() {
    const statuses = AGENT_IDS.map((id) => {
      const s = window.agentState && window.agentState[id];
      return s ? s.status : 'idle';
    });
    let hex;
    if (statuses.includes('error')) hex = 0xc0584a;
    else if (statuses.every((s) => s === 'done')) hex = 0x6f9a7a;
    else if (statuses.some((s) => s === 'working')) hex = 0xd4aa4f;
    else if (statuses.some((s) => s === 'thinking')) hex = 0x6f8fb5;
    else hex = 0xb7ad9a;

    gemMat.color.setHex(hex);
    gemMat.emissive.setHex(hex);
    gemLight.color.setHex(hex);
  }

  /* ============ FUNCIÓN PUENTE ============ */
  window.updateAgentMonitor3D = function (agentId, status, screenText) {
    const id = String(agentId || '').toLowerCase();
    const s = stations[id];
    if (!s) return;

    const stKey = STATUS_HEX[status] ? status : 'idle';
    const hex = STATUS_HEX[stKey].hex;

    s.status = stKey;
    s.screenText = screenText == null ? '' : String(screenText);

    s.stateLight.color.setHex(hex);
    s.stateLight.intensity = stKey === 'idle' ? 0.6 : 1.4;
    s.stateLightMat.color.setHex(hex);
    s.stateLightMat.emissive.setHex(hex);
    s.stateBulb.material.color.setHex(hex);
    s.stateBulb.material.emissive.setHex(hex);
    s.stateRingMat.color.setHex(hex);

    drawScreen(s);
    refreshGemColor();
  };

  // Alias de compatibilidad para cualquier código que aún use el nombre anterior.
  window.updateAgent3D = window.updateAgentMonitor3D;

  /* ============ SINCRONIZACIÓN INICIAL ============ */
  AGENTS.forEach((cfg) => {
    const s = window.agentState && window.agentState[cfg.id];
    window.updateAgentMonitor3D(cfg.id, s ? s.status : 'idle', s ? s.screenText : '');
  });

  /* ============ ANIMACIÓN ============ */
  const clock = new THREE.Clock();
  let cursorAcc = 0;
  let gemAcc = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    cursorAcc += dt;
    if (cursorAcc > 0.55) {
      cursorAcc = 0;
      for (const id in stations) {
        const s = stations[id];
        if (s.status === 'working' || s.status === 'thinking' || s.status === 'error') {
          s.cursorOn = !s.cursorOn;
          drawScreen(s);
        }
      }
    }

    gemAcc += dt;
    if (gemAcc > 0.4) { gemAcc = 0; refreshGemColor(); }

    // Estrellas
    stars.rotation.y += dt * 0.005;

    // Lunas
    if (moonA) {
      moonA.core.material.opacity = 0.85 + Math.sin(t * 0.4) * 0.05;
      moonA.glow.material.opacity = 0.085 + Math.sin(t * 0.4 + 1) * 0.015;
      moonA.halo.material.opacity = 0.028 + Math.sin(t * 0.3) * 0.008;
    }
    if (moonB) {
      moonB.core.material.opacity = 0.82 + Math.sin(t * 0.55 + 2) * 0.05;
      moonB.glow.material.opacity = 0.08 + Math.sin(t * 0.55 + 3) * 0.015;
    }

    // Gema central
    gem.rotation.y += dt * 0.4;
    gem.rotation.x += dt * 0.15;
    gem.position.y = Math.sin(t * 1.2) * 0.1;
    gemMat.emissiveIntensity = 1.4 + Math.sin(t * 1.8) * 0.4;
    gemWire.rotation.copy(gem.rotation);
    gemWire.position.copy(gem.position);

    // Cristales orbitantes
    for (const c of chandelierCrystals) {
      c.angle += dt * c.speed;
      c.mesh.position.set(
        Math.cos(c.angle) * c.radius,
        c.yOff + Math.sin(t * 0.9 + c.angle) * 0.1,
        Math.sin(c.angle) * c.radius
      );
      c.mesh.rotation.x += dt * 1.5;
      c.mesh.rotation.y += dt * 1.2;
    }

    chandelierLight.intensity = 1.8 + Math.sin(t * 1.5) * 0.3;
    gemLight.intensity = 1.2 + Math.sin(t * 2.1) * 0.3;

    // Lámparas colgantes
    for (const p of pendantLights) {
      p.light.intensity = 0.7 + Math.sin(t * 2 + p.cfg.angleDeg) * 0.15;
    }

    // Estaciones
    for (const id in stations) {
      const s = stations[id];

      let bobAmp = 0.015, bobSpeed = 1.2;
      if (s.status === 'working')       { bobAmp = 0.05;  bobSpeed = 4.6; }
      else if (s.status === 'thinking') { bobAmp = 0.03;  bobSpeed = 2.2; }
      else if (s.status === 'error')    { bobAmp = 0.04;  bobSpeed = 12.0; }
      else if (s.status === 'done')     { bobAmp = 0.025; bobSpeed = 1.8; }

      s.avatarGroup.position.y = Math.sin(t * bobSpeed + s.phase) * bobAmp;
      s.avatarGroup.rotation.y = Math.sin(t * 0.5 + s.phase) * 0.04;

      if (s.status === 'working') {
        const typing = Math.sin(t * 15 + s.phase) * 0.22;
        s.armL.rotation.x = -0.55 + typing;
        s.armR.rotation.x = -0.55 - typing;
        if (s.handL) s.handL.position.z = 0.3 + typing * 0.15;
        if (s.handR) s.handR.position.z = 0.3 - typing * 0.15;
      } else {
        s.armL.rotation.x += (-0.55 - s.armL.rotation.x) * 0.08;
        s.armR.rotation.x += (-0.55 - s.armR.rotation.x) * 0.08;
      }

      const baseI = s.status === 'idle' ? 0.5 : 1.3;
      s.stateLight.intensity = baseI + Math.sin(t * 3 + s.phase) * 0.35;
      s.stateLightMat.emissiveIntensity = 1.3 + Math.sin(t * 3 + s.phase) * 0.5;

      const ringPulse = 0.25 + Math.sin(t * 2.4 + s.phase) * 0.12;
      s.stateRingMat.opacity = s.status === 'idle' ? 0.2 : ringPulse;
      const ringScale = 1 + (s.status === 'idle' ? 0 : Math.sin(t * 2 + s.phase) * 0.02);
      s.stateRing.scale.set(ringScale, ringScale, 1);

      const visorBase =
        s.status === 'working' ? 1.8 :
        s.status === 'thinking' ? 1.3 :
        s.status === 'error' ? 2.0 :
        s.status === 'done' ? 1.6 : 0.95;
      s.visor.material.emissiveIntensity = visorBase + Math.sin(t * 3.5 + s.phase) * 0.25;

      if (s.lampLight) s.lampLight.intensity = 0.4 + Math.sin(t * 1.8 + s.phase) * 0.08;
    }

    // Ganchos de la computadora central (js/computer.js)
    if (typeof window.updateComputerCamAnim === 'function') window.updateComputerCamAnim(dt);
    if (typeof window.updateComputerStatus === 'function') {
      window.updateComputerStatus(AGENT_IDS.map((id) => (window.agentState[id] || {}).status || 'idle'));
    }

    controls.update();
    renderer.render(scene, camera);
  }

  /* ============ RESPONSIVE ============ */
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(onResize).observe(container);
  }

  /* ============ PUENTE PARA decor.js, lounge.js Y boot.js ============
     Esos archivos se cargan después de este y necesitan unos cuantos objetos
     que viven dentro de esta función. */
  window.OfficeCtx = {
    scene, renderer, camera, controls, centralTable, animate, createPlant, roundRect,
    STATUS_HEX, PALETTE,
    shelf: { bookshelf, shelfWood, brassDetail, bookColors }
  };
})();
/* =====================================================================
   // === FIN BLOQUE MODELADO 3D DEEPSEEK ===
   ===================================================================== */
