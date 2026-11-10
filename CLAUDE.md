# ycs-spx

The YCS show controller: a fork of SPX-GC (an open-source graphics controller,
upstream author Tuomo Kulomaa) with a YCS layer for three independent stages,
Google Sheets / JSON data linking, Companion control and restart recovery.
On-air templates come from the sibling `ycs-graphics` repository.

Keep both repositories side by side:

```text
GitHub/
  ycs-graphics/   templates and assets (served from ycs.graphicsRoot)
  ycs-spx/        this repo
```

## Layout

- `server.js`, `routes/`, `views/`, `static/`, `utils/` – upstream SPX. Change only
  where YCS needs to; keep YCS logic in `ycs/`.
- `ycs/*.cjs` – YCS server modules (`index.cjs` registers routes; `playback.cjs`,
  `data.cjs`, `program-recovery.cjs`, `sockets.cjs`, ...)
- `ycs/public/` – YCS pages and browser code, served at `/ycs/`
  (Data Manager, settings, preview, output, controller additions)
- `ycs/rehearsal.cjs`, `ycs/rehearsal/` – disposable practice show
- `ycs/tests/` – Node test runner tests (`*.test.cjs`)
- `ycs/*.ps1` – Windows launch/stop scripts used by `Start SPX.cmd`
- `.local/` – ignored: dev config, show data, runtime logs, rehearsals
- `YCS.md` – full behaviour reference; `ycs/INSTALLATION.md`, `ycs/COMPANION.md`

## Commands

- `npm ci` – install dependencies (this repo needs its own `node_modules`;
  never link it to another project)
- `npm test` – all tests
- `npm run ycs:demo` then `node server.js .local/ycs-dev.json` – dev server on
  http://127.0.0.1:5660 (controllers at `/gc/YCS-Stage-N/Show`)
- `npm run ycs:rehearsal` – practice show on http://127.0.0.1:5661/rehearsal,
  never touches real config or data
- `Start SPX.cmd` – double-click launcher for the saved runtime;
  `ycs/stop-runtime.ps1` stops it. Logs: `.local/runtime-logs/`
- Event bundle: `python scripts/package-event.py` in `../ycs-graphics`
  (see its `EVENT-DEPLOYMENT.md`)

Node version: see `.nvmrc`.

## Rules

- Never commit to `master` directly. Use a short branch (`fix/...`, `feature/...`),
  open a pull request, let the Tests check pass, merge. Branches are deleted on merge.
- Merge finished work promptly; don't start a new branch on top of an unmerged one.
- Show safety comes first: a change must never interrupt what is on air. Failures
  keep the last good graphic or data and report the problem; they don't blank outputs.
- Data contract files (`ycs/data-contract.cjs`, `ycs/public/data-contract.js`,
  `ycs/contracts/`) are generated from `../ycs-graphics/contracts/`. Don't edit
  them here; change the source and run `npm run contracts:sync` there.
- Add or update a test in `ycs/tests/` with each behaviour change.
- Update `YCS.md` when behaviour an operator would notice changes.
- Before an event, follow `SHOW-DAY.md`.

## Known pitfalls

- Several tests start real servers; they assume ports are free and may be timing
  sensitive on a slow machine.
- The settings page only accepts connections from `127.0.0.1`.
- Port 5660 is the show server; rehearsal refuses it.
