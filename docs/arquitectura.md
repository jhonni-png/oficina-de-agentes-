# Arquitectura

La Oficina de Agentes es la **capa visual** de un sistema de cuatro agentes de IA: **Planificador**, **Arquitecto**, **Constructor** y **Auditor**. La página no ejecuta a los agentes; muestra su estado en tiempo real y envía la misión que los pone en marcha.

## Flujo de datos

```
┌───────────────┐  1. misión (POST)   ┌─────────┐
│  Navegador    │ ──────────────────► │   n8n   │
│  (este repo)  │                     │ webhook │
└───────▲───────┘                     └────┬────┘
        │                                  │ 2. orquesta a los agentes
        │ 4. Realtime                      │    y escribe su estado
        │    (postgres_changes)            ▼
        │                           ┌─────────────┐
        └─────────────────────────  │  Supabase   │
                                    │ agent_states│
                                    └─────────────┘
```

1. El usuario escribe una misión y pulsa **Ejecutar Misión**. `js/mission.js` hace `POST` al webhook de n8n con `{ mission, source, timestamp }`.
2. n8n coordina a los agentes y, con una credencial privada, actualiza `public.agent_states` (`status` y `screen_text`).
3. Supabase registra el cambio en la tabla.
4. `js/supabase.js` está suscrito al canal `agent_states_changes` y llama a `window.updateAgentMonitor3D(agentId, status, screenText)`, que actualiza el monitor del escritorio correspondiente en la escena 3D.

## Responsabilidades por capa

| Capa | Archivo(s) | Responsabilidad |
|---|---|---|
| Interfaz | `index.html`, `css/styles.css`, `js/ui.js` | HUD, logs, configuración y Modo Demo |
| Núcleo | `js/core.js` | Constantes, configuración en `localStorage`, logs y barra de agentes |
| Escena 3D | `js/scene3d.js` | Escena base: luces, suelo, ventanales, mesa central, escritorios, avatares, animación y monitores |
| Decoración | `js/decor.js` | Muro del fondo, cortinas, mural, cuadro de gatos, plantas y estantería |
| Sala de descanso | `js/lounge.js` | Sillón, mesa de centro, mini nevera, alfombra de carreras, billar y baño |
| Arranque | `js/boot.js` | Ajuste de materiales de toda la escena y arranque de la animación |
| Datos | `js/supabase.js`, `sql/schema.sql` | Lectura inicial y suscripción a Realtime |
| Misión | `js/mission.js` | Envío de la misión al webhook de n8n |

### Cómo se reparte la escena 3D

Los scripts son clásicos (no módulos) y se cargan en este orden: `core` → `scene3d` → `decor` → `lounge` → `boot` → `supabase` → `mission` → `ui`.

`scene3d.js` construye la escena base y, al terminar, publica en `window.OfficeCtx` lo que los demás archivos necesitan (`scene`, `renderer`, `animate`, `createPlant`, `roundRect` y la estantería). `decor.js` añade su parte y deja sus ayudantes de modelado en `OfficeCtx.helpers` para que `lounge.js` los reutilice. `boot.js` va al final porque el ajuste de materiales tiene que recorrer todo lo que ya esté en la escena.

## Flujo local (computadora central + OpenCode)

El puente local (`bridge/mission-server.mjs`) sirve la propia oficina y expone `/state`, `/last` y `/mission`. La API exige un token (cabecera `X-Oficina-Token`) y el puente rechaza `Host`/`Origin` no locales, admite una sola misión a la vez y la corta pasado un tiempo máximo. El detalle de seguridad está en el README.

Además del flujo en la nube, la oficina puede ejecutar los agentes en la propia máquina:

```
┌─────────────┐  /oficina <tarea>   ┌──────────────────┐  POST /mission  ┌───────────────┐
│ Computadora │ ──────────────────► │ mission.js       │ ──────────────► │ bridge/       │
│ central 3D  │  (js/computer.js)   │ (js/bridge.js)   │                 │ mission-server│
└──────▲──────┘                     └──────────────────┘                 └───────┬───────┘
       │                                                                        │ opencode run /oficina
       │ /state (polling 1.5s)                                                  ▼
       │                                                              ┌──────────────────┐
       └──────────────────────────────────────────────────────────────  │ pipeline OpenCode│
                                                                       │ 4 agentes gratuitos│
                                                                       └──────────────────┘
```

- `js/computer.js` crea el portátil en `centralTable`, expone `window.pushCentralLog` y usa raycasting para abrir el panel al hacer clic. Se apoya en `OfficeCtx` (que ahora expone también `camera`, `controls`, `centralTable`, `PALETTE` y `STATUS_HEX`).
- `js/mission.js` detecta `/oficina` y envía a n8n **o** al puente local (`127.0.0.1:8787/mission`).
- `bridge/mission-server.mjs` lanza `opencode run /oficina <tarea>` y deriva el estado de cada agente de los artefactos en `.opencode/pipeline/<slug>/`, sirviéndolo en `GET /state`.
- `js/bridge.js` hace polling de `/state` y llama a `handleAgentUpdate`. Supabase queda como respaldo opcional.
- Modelos gratuitos: Planificador (Nemotron/OpenRouter), Arquitecto (Gemini Flash-Lite), Constructor (GPT-OSS/Groq), Auditor (Nemotron Lightning/NIM). Configurados en `.opencode/opencode.jsonc`.

## Seguridad

- El navegador usa solo la clave **publishable** de Supabase y tiene **solo lectura** gracias a RLS.
- Toda escritura la hace el backend (n8n) con una credencial privada. Nunca se debe poner una `service_role` en este repositorio.
- Una URL de webhook pública puede ser invocada por cualquiera. Antes de exponer el sitio, protégela con autenticación validada en servidor o con un proxy.

## Repositorio complementario

La red de agentes en n8n expuesta a Claude mediante MCP está en [**claude_agents-**](https://github.com/jhonni-png/claude_agents-). Usa los mismos cuatro roles que se visualizan aquí.
