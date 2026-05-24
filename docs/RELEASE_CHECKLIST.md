# Release Checklist

> Use this checklist for Phase 4 pre-release validation and the v1.0 closeout.

---

## Phase 4: Pre-release QA

### Tests & Build

- [ ] `npm run test` — all tests pass
- [ ] `npm run lint` — TypeScript type check passes
- [ ] `npm run build` — production build succeeds
- [ ] `npm run dev` — dev server starts without errors
- [ ] Docker build + run works

### Security

- [ ] No real API keys in any committed file
- [ ] `.env.local` is gitignored
- [ ] `CODEX_HANDOFF.md` is gitignored
- [ ] `data/store.json` is gitignored
- [ ] SSRF protection verified (private IPs, metadata, localhost blocked)
- [ ] Error messages don't leak URLs or keys
- [ ] YAML import validates before writing (no dirty files on failure)
- [ ] Test fixtures and documentation must not contain realistic/high-entropy API-key-like strings; use obvious placeholders such as `tp-example-redaction-key-12345`

### Showcase Worlds

- [ ] All 9 worlds load via `GET /api/world?worldId=<id>`
- [ ] All 9 worlds appear in `GET /api/world?action=list`
- [ ] Each world's characters, relationships, and opening render correctly
- [ ] Genre CSS themes apply correctly (cyan/purple/blue/gold)

### Documentation

- [ ] README.md accurate and up-to-date
- [ ] README_ZH.md matches English version
- [ ] `docs/CONFIG.md` covers all 5 providers
- [ ] `docs/WORLD_FORMAT.md` has working examples
- [ ] `docs/ROADMAP.md` reflects current status
- [ ] `docs/ARCHITECTURE.md` exists and is accurate
- [ ] `docs/API.md` lists all endpoints
- [ ] All internal doc links resolve (no broken links)

---

## v1.0: Closeout

- [ ] Bump version to `1.0.0` in `package.json`
- [ ] Update version references in README.md and README_ZH.md
- [ ] Create GitHub Release with tag `v1.0.0`
- [ ] Write CHANGELOG.md (summarize Phase 1-4)
- [ ] Deploy demo instance (Vercel or Docker)
- [ ] Verify demo instance loads and runs a world
- [ ] Announce (if applicable)
