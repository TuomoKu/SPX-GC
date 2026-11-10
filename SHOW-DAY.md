# Show-day checklist

One page for getting an event on air. Details live in [YCS.md](YCS.md) and
`../ycs-graphics/EVENT-DEPLOYMENT.md`.

## 1 week out: freeze

- [ ] Merge or park everything in progress. From now on, merge only tested fixes.
- [ ] No new features, no dependency or Node upgrades.
- [ ] `master` (ycs-spx) and `main` (ycs-graphics) show a green **Tests** check.

## Before packaging

- [ ] Both repos on `master`/`main`, up to date, nothing uncommitted (`git status`).
- [ ] `node --version` matches `.nvmrc` (the bundle ships this computer's Node).
- [ ] `npm test` passes in both repos.
- [ ] Rehearsal: `npm run ycs:rehearsal`, open http://127.0.0.1:5661/rehearsal,
      run **Run playback checks**, then **Test server restart**. All pass.
- [ ] Show data reviewed: stage names, rounds, sheets/JSON connections, no test text.

## Package and tag

- [ ] Pause show edits, then in `ycs-graphics`:
      `python scripts/package-event.py --output dist/YCS-<Event>-Snapshot`
- [ ] Tag both repos with the same name, e.g. `orlando-2026-11`
      (commands in `EVENT-DEPLOYMENT.md` → Tag the release).
- [ ] Copy decktype image folders to the show PC if used; transfer the ZIP privately
      (it contains the Companion API key).

## On site

- [ ] Extract the ZIP to a local writable folder, run **Start Orlando.cmd**
      (or the event's start script). Allow inbound TCP 5660.
- [ ] Every stage: controller opens, Program and Preview outputs load in vMix
      (`http://SERVER-IP:5660/output/stage-N/program` and `/preview`).
- [ ] Data Manager: every source green, sheets refreshing.
- [ ] Each stage: Play ticker and lower third in Preview, then Program; Stop stage.
- [ ] Companion buttons fire on every stage.

## If something breaks

- **Server crashed or was killed:** start it again within 2 minutes and Program
  comes back as it was. After longer, or after a deliberate stop, Program starts
  stopped; replay what should be on air.
- **A source fails:** graphics keep the last good data. Check Data Manager for the
  reason; switch the field to manual if needed.
- **An output is blank:** reload that browser input in vMix; it rejoins the
  current Program.
- **Logs:** `.local/runtime-logs/` (the SPX window shows them too).

## After the show

- [ ] Note what went wrong or felt slow, and open issues or branches for it.
- [ ] Lift the freeze.
