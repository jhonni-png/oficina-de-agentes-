# Arquitectura

Oficina Digital 3D es la **capa visual** de un sistema de cuatro agentes de IA: **Planificador**, **Arquitecto**, **Constructor** y **Auditor**. La página no ejecuta a los agentes; muestra su estado en tiempo real y envía la misión que los pone en marcha.

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
| Escena 3D | `js/scene3d.js` | Oficina, escritorios, avatares, animación y monitores |
| Datos | `js/supabase.js`, `sql/schema.sql` | Lectura inicial y suscripción a Realtime |
| Misión | `js/mission.js` | Envío de la misión al webhook de n8n |

## Seguridad

- El navegador usa solo la clave **publishable** de Supabase y tiene **solo lectura** gracias a RLS.
- Toda escritura la hace el backend (n8n) con una credencial privada. Nunca se debe poner una `service_role` en este repositorio.
- Una URL de webhook pública puede ser invocada por cualquiera. Antes de exponer el sitio, protégela con autenticación validada en servidor o con un proxy.

## Repositorio complementario

La red de agentes en n8n expuesta a Claude mediante MCP está en [**claude_agents-**](https://github.com/jhonni-png/claude_agents-). Usa los mismos cuatro roles que se visualizan aquí.
