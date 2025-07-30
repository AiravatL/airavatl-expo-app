## Pull-request checklist

- [ ] PR targets **`dev`**
- [ ] Title uses Conventional Commit prefix
- [ ] `pnpm test` & `pnpm lint` pass locally
- [ ] Screenshots / screen-casts attached (UI changes)
- [ ] Relevant issue linked (`Fixes #123`)

GitHub Actions will run the same tests; do not merge while checks are red.

## Running locally

```bash
corepack enable          # enables pnpm
npm install
npm start               # expo start
```
