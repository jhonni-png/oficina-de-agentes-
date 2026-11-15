/* =====================================================================
   ARRANQUE
   Último script de la escena: ajusta los materiales de TODO lo que ya está
   en la escena (incluida la decoración) y arranca el bucle de animación.
   ===================================================================== */
(function bootOffice() {
  'use strict';

  const ctx = window.OfficeCtx;
  if (!ctx) return;

  /* Aspecto mate corporativo */
  ctx.scene.traverse((o) => {
    const m = o.material;
    if (m && !Array.isArray(m) && m.metalness !== undefined) {
      m.metalness = Math.min(m.metalness, 0.25);
      if (m.roughness !== undefined) m.roughness = Math.max(m.roughness, 0.35);
    }
  });

  ctx.animate();
  if (typeof log === 'function') {
    log('✦ Oficina lista: sala de juntas, escritorios, sala de descanso y vista a la ciudad.', 'ok');
  }
})();
