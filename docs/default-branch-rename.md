# Proposal: rename the default branch `master` → `main`

`main` is the default name GitHub has used for new repositories since 2020
and the convention across the rest of the ecosystem. This fork's default is
still `master` (inherited from the upstream Open Hardware Monitor repo).

## Repo readiness

The tree is already rename-safe — an audit found **zero** hard references
to the branch name:

- no GitHub Actions workflows (`.github/` does not exist)
- `build-web.sh`, `vercel.json`, and the web stack are branch-agnostic
- no `master` links in the READMEs or docs

So the rename is a settings change only; nothing in the tree needs to
follow it beyond this document.

## Steps (repo admin)

1. GitHub → **Settings → Branches (or the branch list) → rename `master`
   to `main`**. GitHub automatically re-targets open PRs and branch
   protection rules, and serves a redirect notice to anyone who pushes or
   fetches the old name.
2. **Vercel**: Project → Settings → Git — if the production branch is
   pinned to `master`, change it to `main` (if it's set to the repository
   default, no change is needed).
3. Each local clone, once:

   ```sh
   git branch -m master main
   git fetch origin
   git branch -u origin/main main
   git remote set-head origin -a
   ```

Merging this PR signals agreement with the proposal; the rename itself is
performed in the repository settings afterwards.
