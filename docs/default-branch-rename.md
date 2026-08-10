# Default branch: `main` (migrated from `master`)

`main` was created 2026-08-10 at the identical tip of `master`
(d7010e9); open PRs were retargeted to `main`. The tree itself has no
hard references to the branch name (no CI workflows; `build-web.sh` and
`vercel.json` are branch-agnostic), so the migration is settings-only.

## Remaining steps (repo admin, in order)

1. **GitHub** -> Settings -> General -> Default branch -> switch to
   `main`.
2. **Vercel** -> Project -> Settings -> Git: if the production branch is
   pinned to `master`, change it to `main` (no change needed if it
   tracks the repository default).
3. Confirm a production deploy from `main`, then delete `master`
   (Branches page, or `git push origin --delete master`).
4. Each local clone, once:

   ```sh
   git branch -m master main
   git fetch origin
   git branch -u origin/main main
   git remote set-head origin -a
   ```

Until step 3, `master` remains as a frozen mirror of the pre-migration
tip; nothing merges into it.
