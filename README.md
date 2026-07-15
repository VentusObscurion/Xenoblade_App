# Xenoblade Tracker

An offline-capable Progressive Web App for tracking completion in **Xenoblade Chronicles** games.

**Live app:** `https://<username>.github.io/Xenoblade_App/`

## Features

### Xenoblade Chronicles (XC1)
- Quests, Unique Monsters, Achievements, Heart-to-Hearts
- Collectopaedia, Landmarks, Colony 6 Reconstruction
- Quest prerequisites, walkthroughs, and rewards from the wiki
- Playthrough state: level, area affinity (half-stars), discovered regions
- Filter by region, status, and sort by prerequisites

### Xenoblade Chronicles 2 (XC2)
- Collectopaedia

### Future Connected
- Quests, Unique Monsters, Quiet Moments

### General
- Local progress storage in the browser (IndexedDB)
- Export / import progress as JSON
- Offline support after first load (PWA)

## Development

```bash
npm install
npm run fetch-data   # Pull wiki data (optional locally, ~1 min)
npm run dev
```

Open `http://localhost:5173/Xenoblade_App/`

## Build

```bash
npm run fetch-data
npm run build
npm run preview
```

## GitHub setup

### 1. Create the repository

On GitHub, create a new **public** repository named exactly:

`Xenoblade_App`

Do **not** initialize with a README (this repo already has one).

### 2. Push this project

```bash
git init
git add .
git commit -m "Initial commit: Xenoblade Tracker PWA"
git branch -M main
git remote add origin https://github.com/<username>/Xenoblade_App.git
git push -u origin main
```

Replace `<username>` with your GitHub username.

### 3. Enable GitHub Pages

1. Repository → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. After the first push, the workflow **Deploy to GitHub Pages** runs automatically

The app will be available at:

`https://<username>.github.io/Xenoblade_App/`

### CI workflow

On every push to `main`, GitHub Actions will:

1. Fetch fresh data from the [Xenoblade Wiki](https://xenoblade.fandom.com)
2. Build the Vite app
3. Deploy `dist/` to GitHub Pages

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Data source

Game data is fetched from the [Xenoblade Wiki](https://xenoblade.fandom.com) (CC BY-SA 3.0) at build time. Progress is stored **locally only** and is never written back to the wiki.

## License

App code: use as you like for this personal project.

Wiki data: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — attribute the Xenoblade Wiki when redistributing data.
