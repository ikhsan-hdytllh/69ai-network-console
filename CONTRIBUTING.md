# Contributing

Thanks for helping make 69 AI Network Console better! Issues and pull requests can be written in **English or Bahasa Indonesia**.

## Ways to help

- 🐛 **Report a bug** using the [bug report form](../../issues/new?template=bug_report.yml). Include the vendor/model, OS and app version.
- 📚 **Fix or add vendor commands** in the offline knowledge base (`frontend/src/data/`). This is the easiest way to start contributing.
- 💡 **Suggest a feature** using the [feature request form](../../issues/new?template=feature_request.yml).
- 🔐 **Security issues:** don't open a public issue. Follow [SECURITY.md](SECURITY.md).

## Development setup

```bash
npm ci
npm run build:frontend   # installs frontend deps, type-checks and builds app-dist/
npm start
```

For UI work you can also run the Vite dev server with `npm --prefix frontend run dev`. Desktop-only features (SSH, serial, keychain) need the Electron app.

## Pull request checklist

- [ ] `npm run build:frontend` passes (TypeScript has 0 errors).
- [ ] `node --check desktop-main.js desktop-preload.js` passes.
- [ ] Commit the rebuilt `app-dist/` together with your `frontend/` changes, so the two stay in sync.
- [ ] No secrets, API keys, real device IPs or customer configs in code, screenshots or tests.
- [ ] If your change touches the main process or IPC, explain how you kept the [security model](README.md#security--privacy) intact.

## Security rules for code

These rules keep the fixes from the [security audit](docs/00-baseline/AUDIT-2026-09-30.md) in place. PRs that break them won't be merged.

1. Never build shell commands from user input. Use `execFile`/`spawn` with an argument array.
2. The renderer stays sandboxed: no `nodeIntegration`, no `webSecurity: false`, and no relaxing the CSP for convenience.
3. Secrets go through `secrets:*` IPC (OS keychain). Never store them in `localStorage`, and never expose a "get secret" API to the UI.
4. AI requests go only to official provider endpoints. No relay servers.
5. Validate every IPC argument in `desktop-main.js`.

## Project process

The project uses a lightweight Waterfall process. Requirements, design, test plan and change requests live in [`docs/`](docs/README.md) (in Indonesian). Larger changes should reference a requirement ID (`FR-xx`, `SEC-xx`) or add a change request.
