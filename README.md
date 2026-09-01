# eve-agent

A simple [eve](https://eve.dev) agent with every authored slot on disk. The runtime is a small helpful assistant; the folders are the full surface you fill in as the product grows.

Created with `npx eve@latest init eve-agent` (eve `0.47.3`), then expanded with stub files in each slot.

## Quick start

Node.js 24+ is required.

```bash
cd eve-agent
cp .env.example .env.local
# set AI_GATEWAY_API_KEY, or link a Vercel project so VERCEL_OIDC_TOKEN is available
npm run dev
```

`npm run dev` runs `eve dev` and opens the interactive TUI. From this coding session, start without the TUI:

```bash
npm exec -- eve dev --no-ui
```

Then (port is usually `2000`; the server prints the URL):

```bash
curl -X POST http://localhost:2000/eve/v1/session \
  -H "Content-Type: application/json" \
  -d '{"message":"Say hello in one sentence."}'
```

## What this agent does

It is a short-answer assistant that can:

- Repeat text with the `echo` tool
- Remember caller facts via `agent/memory.ts` (`fileMemory`, scoped `byPrincipal`)
- Load the `how_to_reply` skill on demand
- Delegate investigation to the `researcher` subagent
- Accept messages on the default HTTP channel and on `POST /intake/message`

It does not call an external MCP server unless you set `EXAMPLE_MCP_URL`.

## Layout

eve walks `agent/` and names things from file paths. Evals live next to `agent/`, not inside it.

```text
eve-agent/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── agent/
│   ├── agent.ts                 # model and runtime config (defineAgent)
│   ├── instructions.md          # always-on system prompt
│   ├── instrumentation.ts       # telemetry (root-only)
│   ├── memory.ts                # durable memory slot named "memory"
│   ├── channels/                # HTTP and messaging entry points (root-only)
│   │   ├── eve.ts               # default /eve/v1 session API
│   │   └── intake.ts            # custom POST /intake/message
│   ├── connections/             # MCP / OpenAPI services
│   │   └── example.ts           # MCP stub; no tools until you fill `tools.allow`
│   ├── extensions/              # create this when mounting an npm/workspace extension
│   ├── hooks/                   # observe stream events
│   │   └── audit.ts
│   ├── skills/                  # on-demand procedures
│   │   └── how_to_reply.md
│   ├── lib/                     # shared code (not copied into the sandbox)
│   │   └── notes.ts
│   ├── sandbox/
│   │   ├── sandbox.ts           # sandbox definition
│   │   └── workspace/           # files seeded into /workspace
│   │       └── README.md
│   ├── tools/                   # typed executable actions
│   │   └── echo.ts
│   ├── schedules/               # cron jobs (root-only)
│   │   └── heartbeat.md
│   └── subagents/
│       └── researcher/          # specialist child agent
│           ├── agent.ts         # required; must include description
│           └── instructions.md
└── evals/
    ├── evals.config.ts
    └── smoke.eval.ts
```

Identity comes from the path, not a `name` field:

| Path | Runtime name |
| --- | --- |
| `agent/tools/echo.ts` | tool `echo` |
| `agent/connections/example.ts` | connection `example` |
| `agent/skills/how_to_reply.md` | skill `how_to_reply` |
| `agent/channels/intake.ts` | channel `intake` |
| `agent/hooks/audit.ts` | hook `audit` |
| `agent/schedules/heartbeat.md` | schedule `heartbeat` |
| `agent/subagents/researcher/agent.ts` | subagent `researcher` |
| `agent/memory.ts` | memory slot `memory` |

The root agent name is the `package.json` `name` (`eve-agent`).

## Slot log

### `agent/agent.ts` — runtime config

`defineAgent` from `eve`. This project uses the init default, `openai/gpt-5.6-luna-fast`, through the Vercel AI Gateway.

Optional fields: `reasoning`, `compaction`, `limits`, `modelOptions`, `outputSchema`, `build.externalDependencies`. Subagents must also set `description`.

Change the model with `eve set --model provider/model-id` or by editing the file.

### `agent/instructions.md` — system prompt

Required on the root. Identity and standing rules live here. Procedures belong in skills; actions belong in tools.

You can also use `instructions.ts` (`defineInstructions` from `eve/instructions`) or a directory of `.md` / `.ts` files. Static sources compose at build time; dynamic sources resolve at runtime.

### `agent/instrumentation.ts` — telemetry (root-only)

`defineInstrumentation` from `eve/instrumentation`. This file's presence enables authored telemetry and **replaces local disk traces** (`eve traces`, TUI `/traces`). Delete it if you want the local tracer back.

`recordInputs` and `recordOutputs` stay `false` so prompts and completions are not exported. Add a `setup` callback (for example `registerOTel` from `@vercel/otel`) to send spans to an OTel backend.

### `agent/memory.ts` — long-term memory

`defineMemory` from `eve/memory` with `fileMemory()` and `byPrincipal`. The model gets `memory__save_memory` and `memory__remove_memory`.

In `eve dev`, file memory uses process-local in-memory storage. On Vercel it expects a Blob store. Use `agent/memory/<slot>.ts` for multiple named slots; do not keep both `memory.ts` and `memory/`.

### `agent/channels/` — how users reach the agent (root-only)

| File | Helper | What it is |
| --- | --- | --- |
| `eve.ts` | `eveChannel` from `eve/channels/eve` | Default `/eve/v1` API used by the TUI, `useEveAgent`, curl, and evals |
| `intake.ts` | `defineChannel` from `eve/channels` | Custom `POST /intake/message` |

`eve.ts` auth is `[vercelOidc(), localDev(), placeholderAuth()]`. `placeholderAuth()` rejects production browser traffic until you replace it with your app auth (Auth.js, Clerk, JWT, or `none()` for a public demo).

`intake.ts` is scaffolding: it sends with `{ auth: null }`. Add route auth before using it outside localhost.

Install a platform channel instead of writing one:

```bash
eve add channel/slack --non-interactive
```

Slack, Discord, Teams, Telegram, Twilio, GitHub, and others ship as first-class channels. Credentials for those usually go through **Vercel Connect**, not hand-managed bot tokens.

Useful HTTP routes on the eve channel:

- `GET /eve/v1/health`
- `GET /eve/v1/info`
- `POST /eve/v1/session`
- `POST /eve/v1/session/:sessionId`
- `GET /eve/v1/session/:sessionId/stream`
- `POST /eve/v1/session/:sessionId/cancel`
- `POST /eve/v1/session/:sessionId/clear`
- `POST /eve/v1/session/:sessionId/compact`
- `POST /eve/v1/session/:sessionId/reset`

### `agent/connections/` — external MCP and OpenAPI (not channels)

Connections are services the **agent** calls. Channels are services **users** talk through.

`example.ts` is `defineMcpClientConnection` from `eve/connections`. It reads `EXAMPLE_MCP_URL` (fallback `http://127.0.0.1:9/mcp`) and sets `tools: { allow: [] }`, so the model cannot call remote tools until you list names.

OpenAPI services use `defineOpenAPIConnection`. Per-user OAuth uses `connect("connector-uid")` from `@vercel/connect/eve` (already a dependency). The model never sees URLs or tokens; it finds tools with `connection_search` and calls them as `<connection>__<tool>`.

### `agent/extensions/` — reusable packages

Empty on purpose until you mount something. Create `agent/extensions/<namespace>.ts`:

```ts
export { default } from "@acme/crm";
```

Do not add a `.ts` mount until that package is installed. Create an extension package with `npx eve@latest extension init <name>`.

### `agent/hooks/` — observe the stream

`audit.ts` uses `defineHook` from `eve/hooks`. Handlers are observe-only. They cannot inject model context. Thrown hooks fail the turn.

Subagent hooks fire only inside that subagent. Parent hooks do not see child turns.

### `agent/skills/` — on-demand procedures

`how_to_reply.md` is a flat markdown skill. The model sees the description and calls `load_skill` when it applies. Use `defineSkill` from `eve/skills` for generated content or packaged sibling files.

### `agent/lib/` — shared TypeScript

Import-only. Not seeded into `/workspace`. `notes.ts` is used by the `echo` tool.

### `agent/sandbox/` — isolated compute

`sandbox/sandbox.ts` is `defineSandbox({})` from `eve/sandbox`. The folder form is used so `sandbox/workspace/**` can seed `/workspace`.

Default tools `bash`, `read_file`, and `write_file` run in this sandbox. Authored tools run in the app runtime and can call `ctx.getSandbox()`.

### `agent/tools/` — typed actions

`echo.ts` is `defineTool` from `eve/tools` with a Zod `inputSchema`. Filename = tool name.

Gate sensitive tools with `always()` / `once()` / `never()` from `eve/tools/approval`. Built-in tools (`bash`, `read_file`, `write_file`, `todo`, `web_fetch`, `load_skill`, …) can be overridden or disabled by authoring the same filename.

### `agent/schedules/` — cron (root-only)

`heartbeat.md` is a markdown schedule: YAML `cron` frontmatter, body is the prompt. `eve dev` does **not** fire cron. Trigger it once:

```bash
curl -X POST http://localhost:2000/eve/v1/dev/schedules/heartbeat
```

Handler-form schedules use `defineSchedule` from `eve/schedules` with `run` instead of `markdown`. Production cron runs under `eve start` / Vercel Cron (UTC).

### `agent/subagents/researcher/` — specialist

Declared subagents inherit **nothing** from the root's authored slots. `agent.ts` is required and must include `description`. Channels and schedules are root-only.

Supported child slots (add files as needed): `connections/`, `hooks/`, `skills/`, `lib/`, `sandbox/`, `tools/`, `subagents/`. Leave them absent until you have a real `.ts` / `.md` file — empty folders and `.gitkeep` files fail discovery.

The parent calls the `researcher` tool with `{ message, agentId?, outputSchema? }`. The child does not see the parent's history.

### `evals/` — scored checks

`evals.config.ts` is required at the evals root. `smoke.eval.ts` sends a greeting and asserts `t.succeeded()`.

```bash
npm run eval
# or: eve eval smoke
```

Evals hit the real HTTP surface. They need a running model credential unless you point a fixture agent at `mockModel` from `eve/evals`.

## Scripts

| Script | Command |
| --- | --- |
| `npm run dev` | `eve dev` — local HMR + TUI |
| `npm run build` | `eve build` |
| `npm run start` | `eve start` — production Node server, including schedules |
| `npm run eval` | `eve eval` |
| `npm run deploy` | `eve deploy` |
| `npm run typecheck` | `tsc` |

Useful CLI:

```bash
eve info                 # what eve discovered
eve registry search slack
eve add channel/slack --non-interactive
eve set --model anthropic/claude-opus-4.8
eve traces               # local traces (only if instrumentation.ts is removed)
```

Inspectable artifacts land under `.eve/` (`agent-discovery-manifest.json`, `diagnostics.json`, `compiled-agent-manifest.json`).

## Environment

| Variable | Use |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Default Gateway models |
| `VERCEL_OIDC_TOKEN` | Alternative when the project is linked to Vercel |
| `EXAMPLE_MCP_URL` | Turns on `agent/connections/example.ts` |
| Direct provider keys | Only if you switch `agent.ts` to an AI SDK `LanguageModel` |

Copy `.env.example` to `.env.local`. Do not commit secrets.

## Auth and Connect

- **Route auth** (who can talk to the agent) lives on the channel, currently `agent/channels/eve.ts`.
- **Connection auth** (who the agent is when calling Linear, GitHub, …) lives on the connection. Prefer `connect()` from `@vercel/connect/eve` over storing user tokens in env vars.
- User-scoped Connect auth needs `principalType: "user"` on the session. Schedules and `localDev()` do not automatically carry an end-user principal.

## Naming collisions to avoid

Keep tool filenames distinct from subagent directory names. `researcher` as both a tool and a subagent is a build error.

Do not put custom channel routes under `/eve/v1/*`. That namespace belongs to the eve HTTP channel.

## Docs for this install

Version-matched docs are in `node_modules/eve/docs/`. Start at `docs/README.md`. Public site: [eve.dev/docs](https://eve.dev/docs).

## Deploy

```bash
eve deploy
```

Replace `placeholderAuth()` before production browser traffic. Review sandbox network policy, tool approvals, connection scopes, and telemetry destinations before sending non-public data through the agent.
