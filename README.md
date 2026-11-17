# 🏢 La Oficina de Agentes

Una oficina en 3D donde cuatro agentes de IA (**Planificador**, **Arquitecto**, **Constructor** y **Auditor**) se sientan en sus escritorios a trabajar. Cada monitor muestra en vivo lo que está haciendo su agente: el estado y el texto llegan por **Supabase Realtime** y los orquesta **n8n**.

Y ojo: esto no es una oficina-cárcel sin alma. Tiene mural, gatos motivacionales, cortinas, una estantería que sí parece usada y hasta una sala de descanso con billar para cuando nadie está en misión. 🎱

Es un sitio estático (HTML + CSS + JavaScript puro), sin build ni nada raro.

> **🖥️ Centro de comando local (novedad):** hay una **computadora central** en la mesa de juntas. Haz clic en ella (o en el aviso 🖥️) para abrir un terminal desde el que delegas tareas. Un **puente local** (`bridge/mission-server.mjs`) recibe la misión y lanza el comando `/oficina` de OpenCode, que ejecuta el pipeline real de los 4 agentes con modelos gratuitos. Supabase/n8n siguen funcionando como alternativa en la nube.

## 👀 El tour de la oficina

| Qué hay | Detalle | Dónde vive |
|---|---|---|
| 🌅 **Mural con vida** | Atardecer con ciudad, sol, pájaros y campo de flores. Dice «VIVE · CREA · COLABORA» pa' que nadie se olvide | `js/decor.js` |
| 🐱 **Cuadro de gatos** | Tres gatos grandotes con su «¡TÚ PUEDES!». Motivación laboral nivel experto | `js/decor.js` |
| 📚 **Estantería surtida** | Libros por los dos lados, pilas acostadas, globo, jarrón con plantita, trofeo, vela, un marco con foto y un gatito negro de adorno | `js/decor.js` |
| 🪟 **Cortinas** | Cortinas con pliegues a los lados de la ventana del fondo | `js/decor.js` |
| 🖥️ **Computadora central** | Portátil 2× sobre la mesa de juntas: clic para enfocar y abrir el terminal de tareas | `js/computer.js` |
| 🎨 **Tonos oscuros y cálidos** | Muros café-grisáceo, piso oscuro y mesa central en tono madera. Casi nada de blanco quemando la vista | `js/scene3d.js`, `js/decor.js` |
| 💡 **Luz cálida** | Luces en tono durazno en el techo y los escritorios, nada de luz de hospital | `js/scene3d.js` |
| 🛋️ **Sala de descanso** | Un cuarto aparte, con su propia entrada, pa' no mezclar el relax con la oficina | `js/lounge.js` |
| 🛋️ **Sillón y butaca** | Con su mesa de centro, porque si hay mesa de centro tiene que haber sillón | `js/lounge.js` |
| 🧊 **Mini nevera** | Pegada a la pared de la sala de descanso | `js/lounge.js` |
| 🏎️ **Alfombra de carreras** | Pista de asfalto con bandera a cuadros y un deportivo verde, bajo la mesa de centro | `js/lounge.js` |
| 🎱 **Mesa de billar** | Con las bolas en triángulo y el taco listo, pa' cuando no hay misión | `js/lounge.js` |
| 🚽 **Baño escondido** | En una esquinita de la sala de descanso, con su letrero WC | `js/lounge.js` |

> La sala de descanso queda en la esquina delantera derecha de la oficina. Arrastra con el mouse pa' rotar la vista, usa la rueda pa' acercarte y clic derecho pa' moverte.

## 🧰 Stack

| Capa | Tecnología |
|---|---|
| Escena 3D | [Three.js](https://threejs.org/) r147 + OrbitControls (CDN) |
| Datos en tiempo real | [Supabase](https://supabase.com/) (PostgreSQL + Realtime) |
| Orquestación | [n8n](https://n8n.io/) (webhook de misión) |
| Alojamiento | GitHub + [Vercel](https://vercel.com/) (sitio estático) |

## 🗂️ Estructura

```
oficina-de-agentes-/
├── index.html          # Estructura de la página (HUD, panel de logs, modal)
├── css/
│   └── styles.css      # Estilos de la interfaz y variables de color
├── js/                 # Se cargan en este orden desde index.html
│   ├── core.js         # Constantes, configuración, logs y barra de agentes
│   ├── scene3d.js      # Escena base: luces, suelo, escritorios, avatares, monitores
│   ├── decor.js        # Mural, gatos, cortinas, plantas y estantería
│   ├── lounge.js       # Sala de descanso: sillón, nevera, billar, baño
│   ├── boot.js         # Ajuste de materiales y arranque de la animación
│   ├── supabase.js     # Conexión y suscripción a Realtime
│   ├── mission.js      # Envío de la misión (n8n o puente local) + /oficina
│   ├── ui.js           # Modo Demo, configuración, logs y arranque
│   ├── computer.js     # Computadora central 3D + panel de terminal (clic)
│   └── bridge.js       # Polling del puente local + eventos del panel
├── bridge/
│   └── mission-server.mjs  # Puente HTTP -> OpenCode (127.0.0.1:8787)
├── scripts/
│   ├── start.ps1       # Arranque local en Windows
│   └── start.sh        # Arranque local en macOS/Linux
├── .opencode/
│   ├── commands/oficina.md # Comando /oficina de OpenCode
│   ├── agents/             # director + los 4 agentes
│   └── opencode.jsonc      # Modelos gratuitos (Groq/OpenRouter/Gemini/NIM)
├── state/              # Estado en vivo del puente (generado, ignorado)
├── sql/
│   └── schema.sql      # Tabla agent_states, RLS y Realtime (referencia)
├── docs/
│   └── arquitectura.md # Flujo de datos, capas y seguridad
├── vercel.json         # Cabeceras de seguridad para el despliegue
├── LICENSE             # MIT
├── .gitignore
└── README.md
```

Los scripts son clásicos (no módulos), así que **el orden importa**: `boot.js` tiene que ir después de `decor.js` y `lounge.js` porque ajusta los materiales de todo lo que ya esté en la escena. La explicación completa del flujo (navegador → n8n → Supabase → monitores 3D) está en [`docs/arquitectura.md`](docs/arquitectura.md).

La red de agentes en n8n expuesta vía MCP vive en el repo hermano [**claude_agents-**](https://github.com/jhonni-png/claude_agents-).

## 🖥️ Centro de comando local (computadora de la mesa)

Además del flujo n8n/Supabase, puedes ejecutar los agentes tú mismo en tu máquina con OpenCode:

```powershell
# Windows
.\scripts\start.ps1
```

```bash
# macOS / Linux
chmod +x scripts/start.sh && ./scripts/start.sh
```

El script carga las claves en memoria (entrada oculto), instala el comando `/oficina` en OpenCode, arranca el puente en `127.0.0.1:8787` y abre la oficina. Luego:

1. Haz clic en la **computadora de la mesa** (o en el aviso 🖥️). Se enfoca la cámara y se abre el terminal.
2. Escribe la tarea (p. ej. `crea una API REST en Node`). El prefijo `/oficina` se añade solo.
3. `js/mission.js` hace `POST /mission` al puente; este lanza `opencode run /oficina <tarea>`.
4. `js/bridge.js` consulta `/state` cada 1.5 s y pinta el estado de cada agente en su monitor 3D.

También puedes escribir `/oficina <tarea>` directamente en el chat de OpenCode. Los 4 agentes (modelos 100 % gratuitos) trabajan en cadena y dejan sus artefactos en `.opencode/pipeline/<slug>/`. **No hay claves en archivos**: solo variables de entorno.

> Si el puente no está activo, la oficina sigue funcionando en **Modo Demo** o con tu flujo n8n/Supabase de siempre.

## 🚀 Ejecutar en local

Abre la carpeta en VS Code y usa **Live Server** (clic derecho en `index.html` → *Open with Live Server*). También sirve cualquier servidor estático:

```bash
python3 -m http.server 5500
# luego abre http://localhost:5500
```

Si solo quieres curiosear, pulsa **Modo Demo**: los agentes cambian de estado solitos, sin Supabase y sin gastar tokens.

## ⚙️ Configuración

Pulsa **Configuración** en la página y llena:

| Campo | Qué es |
|---|---|
| `SUPABASE_URL` | URL de tu proyecto, `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Clave **publishable** (`sb_publishable_...`) |
| `N8N_WEBHOOK_URL` | *Production URL* del webhook de n8n |

Los valores se guardan solo en el `localStorage` de **ese navegador y ese dominio**, así que toca repetirlos en cada URL (por ejemplo, otra vez en la URL de Vercel).

> **Ojo con la seguridad:** la clave publishable es apta pal navegador porque la tabla tiene RLS. **Nunca** pongas una `service_role` / *Secret key* en este código, en GitHub ni en variables públicas de Vercel.

## 🗄️ Base de datos

Corre `sql/schema.sql` en el *SQL Editor* de Supabase si aún no tienes la tabla. Queda así:

- `agent_states(agent_id, status, screen_text, updated_at)`
- Estados válidos: `idle`, `thinking`, `working`, `done`, `error`
- Navegador público: **solo lectura**. Backend (n8n): inserción y actualización con credencial privada.

## 🔄 Probar Realtime

Con la página abierta y conectada, ejecuta en el *SQL Editor*:

```sql
update public.agent_states
set status = 'working', screen_text = 'Prueba de sincronización en tiempo real'
where agent_id = 'planificador';
```

El monitor del Planificador debería cambiar sin recargar. Pa' dejarlo como estaba:

```sql
update public.agent_states
set status = 'idle', screen_text = 'Esperando instrucciones...'
where agent_id = 'planificador';
```

## 🚦 Estados

| Estado | Color | Qué significa |
|---|---|---|
| `idle` | Arena | En espera (¿billar?) |
| `thinking` | Azul pastel | Pensando |
| `working` | Mostaza | Trabajando duro |
| `done` | Verde salvia | Terminó |
| `error` | Terracota | Se dañó algo |

## 🌐 Despliegue

1. Sube el repo a GitHub (`index.html` tiene que quedar en la raíz).
2. En [Vercel](https://vercel.com/dashboard) importa el repo y despliega como proyecto estático (*Framework Preset*: **Other**, sin comando de build).
3. Abre la URL `.vercel.app`, pulsa **Configuración** y vuelve a pegar tus valores.

## 🔌 Conectar n8n

1. Crea un workflow con un nodo **Webhook** (método `POST`) y copia la *Production URL*, no la de pruebas.
2. El cuerpo que envía la página es `{ "mission": "...", "source": "ai-agent-3d-office", "timestamp": "..." }`.
3. El flujo debe actualizar `public.agent_states` desde el backend con la credencial privada.
4. Pega la URL en **Configuración**.

> Una URL de webhook pública la puede invocar cualquiera. Antes de exponer el sitio, protégela con autenticación validada en servidor o con un proxy (por ejemplo, una función de Vercel que guarde los secretos como variables privadas).

## 🎨 Cambiar el look (o mover los muebles)

- **Mural y cuadro de gatos:** se pintan con canvas en `js/decor.js` (`muralTex` y `catsTex`). Cambia los textos, los colores o el dibujo.
- **Estantería:** en `js/decor.js`, al final de la sección de la estantería. Cada objeto es una línea, así que agregar uno más es copiar y pegar.
- **Sala de descanso:** en `js/lounge.js`. El sillón, la nevera, el billar y el baño tienen sus coordenadas a la vista, mueve lo que quieras.
- **Alfombra de carreras:** `rugTex` en `js/lounge.js`.
- **Colores de la escena y de los estados:** `PALETTE` y `STATUS_HEX` al inicio de `js/scene3d.js`.
- **Luces:** sección *Iluminación* de `js/scene3d.js`. Más cálida o más fría a gusto.
- **Colores de la interfaz:** variables CSS al inicio de `css/styles.css`.
- **Agentes:** lista `AGENTS` en `js/scene3d.js` y `AGENT_IDS` en `js/core.js`.

## ✅ Lista de aceptación

- [ ] La página carga el modelo 3D sin errores en la consola
- [ ] Se ve la sala de descanso con sillón, nevera, billar y baño
- [ ] Supabase conecta y carga los cuatro agentes
- [ ] Un cambio SQL se refleja en el monitor en tiempo real
- [ ] La página publicada en Vercel carga bien
- [ ] n8n recibe una misión manual y actualiza `agent_states`
- [ ] Una misión completa actualiza los monitores de los agentes

## 📄 Licencia

Distribuido bajo licencia [MIT](LICENSE).
