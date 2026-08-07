# Serving this site from your own GitHub Pages

Written for Vladimir, per the night session: *«инструкции, как сделать push на
GitHub Pages, чтобы это на твоём GitHub Pages было».* Five minutes, no build
step — the site is static files.

## One-time setup

1. **Get the repository.** Either fork `yaroslavvb/stellation` on GitHub
   (button top-right), or push a copy to a new repository of your own:

   ```bash
   git clone https://github.com/yaroslavvb/stellation.git
   cd stellation
   git remote set-url origin https://github.com/YOUR-NAME/stellation.git
   git push -u origin main
   ```

2. **Turn Pages on.** On GitHub: your repository → **Settings** → **Pages** →
   under *Build and deployment*, set **Source: Deploy from a branch**, then
   **Branch: `main`**, **folder: `/docs`**, and Save.

   The app lives in the `docs/` folder precisely so this works — GitHub Pages
   can serve either the repository root or `/docs`, nothing else, without a
   build pipeline.

3. Wait a minute or two. The site appears at

   ```
   https://YOUR-NAME.github.io/stellation/
   ```

## Updating it

Any push to `main` republishes automatically:

```bash
git add -A
git commit -m "what changed"
git push
```

## Three things worth knowing

- **`docs/.nojekyll` must stay.** Without it GitHub runs Jekyll over the site,
  which is slow and once broke the build outright.
- **Caching.** GitHub Pages serves everything with `max-age=600` and offers no
  way to change it — after a push, browsers may show a build up to ten minutes
  stale, and a hard reload is not always enough (this burned a whole review
  session). The Cloudflare deployment (`wrangler deploy` from the repo root,
  config in `wrangler.jsonc`) sends `no-cache` for code and never has this
  problem; keep it as the primary if staleness matters to you.
- **Everything is relative paths**, so the site works the same at
  `…github.io/stellation/`, on Cloudflare, or opened from a local server
  (`python3 -m http.server` in `docs/` — not `file://`, which blocks the
  web worker).
