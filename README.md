# Oficina Digital 3D

Una oficina corporativa en 3D donde cuatro agentes de IA (**Planificador**, **Arquitecto**, **Constructor** y **Auditor**) trabajan en sus escritorios. Cada monitor refleja en tiempo real lo que hace el agente: el estado y el texto llegan desde **Supabase Realtime** y los orquesta **n8n**.

Es un sitio estático (HTML + CSS + JavaScript puro), sin paso de compilación.

## Stack

| Capa | Tecnología |
|---|---|
| Escena 3D | [Three.js](https://threejs.org/) r147 + OrbitControls (CDN) |
| Datos en tiempo real | [Supabase](https://supabase.com/) (PostgreSQL + Realtime) |
| Orquestación | [n8n](https://n8n.io/) (webhook de misión) |
| Alojamiento | GitHub + [Vercel](https://vercel.com/) (sitio estático) |

## Estructura

```
oficina-de-agentes-/
├── index.html          # Estructura de la página (HUD, panel de logs, modal)
├── css/
│   └── styles.css      # Estilos de la interfaz y variables de color
├── js/                 # Se cargan en este orden desde index.html
│   ├── core.js         # Constantes, configuración, logs y barra de agentes
│   ├── scene3d.js      # Escena 3D (oficina, escritorios, avatares, animación)
│   ├── supabase.js     # Conexión y suscripción a Realtime
│   ├── mission.js      # Envío de la misión al webhook de n8n
│   └── ui.js           # Modo Demo, configuración, logs y arranque
├── sql/
│   └── schema.sql      # Tabla agent_states, RLS y Realtime (referencia)
├── docs/
│   └── arquitectura.md # Flujo de datos, capas y seguridad
├── vercel.json         # Cabeceras de seguridad para el despliegue
├── LICENSE             # MIT
├── .gitignore
└── README.md
```

La explicación del flujo completo (navegador → n8n → Supabase → monitores 3D) está en [`docs/arquitectura.md`](docs/arquitectura.md). La red de agentes en n8n expuesta vía MCP vive en el repositorio complementario [**claude_agents-**](https://github.com/jhonni-png/claude_agents-).

Los scripts son clásicos (no módulos) y comparten el ámbito global, por eso el **orden importa**. `scene3d.js` expone `window.updateAgentMonitor3D(agentId, status, screenText)`, que es el puente entre los datos y los monitores.

## Ejecutar en local

Abre la carpeta en VS Code y usa la extensión **Live Server** (clic derecho en `index.html` → *Open with Live Server*). También sirve cualquier servidor estático:

```bash
python3 -m http.server 5500
# luego abre http://localhost:5500
```

## Configuración

Pulsa **Configuración** en la página y completa:

| Campo | Qué es |
|---|---|
| `SUPABASE_URL` | URL de tu proyecto, `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Clave **publishable** (`sb_publishable_...`) |
| `N8N_WEBHOOK_URL` | *Production URL* del webhook de n8n |

Los valores se guardan solo en el `localStorage` de **ese navegador y ese dominio**, así que hay que repetirlos en cada URL (por ejemplo, otra vez en la URL de Vercel).

> **Seguridad:** la clave publishable es apta para el navegador porque la tabla tiene RLS. **Nunca** pongas una `service_role` / *Secret key* en este código, en GitHub ni en variables públicas de Vercel.

## Base de datos

Ejecuta `sql/schema.sql` en el *SQL Editor* de Supabase si aún no tienes la tabla. Queda así:

- `agent_states(agent_id, status, screen_text, updated_at)`
- Estados válidos: `idle`, `thinking`, `working`, `done`, `error`
- Navegador público: **solo lectura**. Backend (n8n): inserción y actualización con credencial privada.

## Probar Realtime

Con la página abierta y conectada, ejecuta en el *SQL Editor*:

```sql
update public.agent_states
set status = 'working', screen_text = 'Prueba de sincronización en tiempo real'
where agent_id = 'planificador';
```

El monitor del Planificador debe cambiar sin recargar. Para restaurarlo:

```sql
update public.agent_states
set status = 'idle', screen_text = 'Esperando instrucciones...'
where agent_id = 'planificador';
```

También puedes usar **Modo Demo**, que simula estados sin tocar Supabase ni gastar tokens.

## Estados

| Estado | Color | Significado |
|---|---|---|
| `idle` | Arena | En espera |
| `thinking` | Azul pastel | Pensando |
| `working` | Mostaza | Trabajando |
| `done` | Verde salvia | Terminado |
| `error` | Terracota | Error |

## Despliegue

1. Sube el repositorio a GitHub (`index.html` debe quedar en la raíz).
2. En [Vercel](https://vercel.com/dashboard) importa el repositorio y despliega como proyecto estático (*Framework Preset*: **Other**, sin comando de build).
3. Abre la URL `.vercel.app`, pulsa **Configuración** y vuelve a pegar tus valores.

## Conectar n8n

1. Crea un workflow con un nodo **Webhook** (método `POST`) y copia la *Production URL*, no la de pruebas.
2. El cuerpo que envía la página es `{ "mission": "...", "source": "ai-agent-3d-office", "timestamp": "..." }`.
3. El flujo debe actualizar `public.agent_states` desde el backend con la credencial privada.
4. Pega la URL en **Configuración**.

> Una URL de webhook pública puede ser invocada por cualquiera. Antes de exponer el sitio, protégela con autenticación validada en servidor o con un proxy (por ejemplo, una función de Vercel que guarde los secretos como variables privadas).

## Personalizar el aspecto

- **Colores de la interfaz:** variables CSS al inicio de `css/styles.css`.
- **Colores de la escena y estados:** `PALETTE` y `STATUS_HEX` al inicio de `js/scene3d.js`.
- **Agentes:** lista `AGENTS` en `js/scene3d.js` y `AGENT_IDS` en `js/core.js`.

## Lista de aceptación

- [ ] La página carga el modelo 3D sin errores en la consola
- [ ] Supabase conecta y carga los cuatro agentes
- [ ] Un cambio SQL se refleja en el monitor en tiempo real
- [ ] La página publicada en Vercel carga correctamente
- [ ] n8n recibe una misión manual y actualiza `agent_states`
- [ ] Una misión completa actualiza los monitores de los agentes

## Licencia

Distribuido bajo licencia [MIT](LICENSE).
