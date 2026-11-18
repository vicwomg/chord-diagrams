# Chord Diagrams

A lightweight, zero-dependency web app for creating, saving, and printing clean chord diagram sheets for stringed instruments.

## Features

- **Multiple instruments & string counts**
  - **Tuned:** Guitar (6-string), Ukulele (4-string), Mandolin (4-course), Banjo (5-string Open G), Tenor Banjo (4-string CGDA), Plectrum Banjo (4-string CGBD)
  - **Unlabeled:** 4-, 5-, 6-, 7-, and 8-string grids
- **Interactive fretboard editing**
  - **Left-click** any string/fret intersection to place or remove a dot
  - **Right-click** any fret position to add fingering labels (`1`–`4`, `T`) or switch dot color between **Black** and **Grey**
  - **Open / muted strings:** Click a string number or note name above the nut to cycle through `O` (open), `X` (muted), and blank
  - **Starting fret / nut:** Leave the left-side fret box blank or `0` for a heavy nut bar, or enter `1`–`24` for higher-position voicings
  - **5-fret toggle:** Switch between 4-fret and 5-fret diagrams
- **Flexible page layouts & printing**
  - Choose `4`, `8`, `12`, `16` (4×4), or `20` (4×5) diagrams per sheet
  - Add an optional page title and individual chord names
  - Print or export to PDF cleanly with toolbar controls and input borders hidden
- **Browser persistence**
  - Auto-saves your current sheet in `localStorage`
  - **Save** and **Open** named chord sets locally

## Local Development

No build step or package manager is required. You can open `index.html` directly in a browser or serve the directory with any static HTTP server:

```bash
# Python 3
python3 -m http.server 8080

# or Node.js
npx serve .
```

Then open `http://localhost:8080` (or the port printed by `serve`).

## Deployment

Because this is a pure static site (`index.html`, `styles.css`, `app.js`), it deploys with zero build configuration on both Vercel and Render.

### Deploy to Vercel

1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/new) and import the repository.
3. Leave the **Build Command** empty and **Output Directory** as `.` (or default), then click **Deploy**.

Or deploy from the command line with the [Vercel CLI](https://vercel.com/docs/cli):

```bash
npx vercel
```

### Deploy to Render

This repository includes a [`render.yaml`](render.yaml) Blueprint for a Render Static Site:

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Blueprint** (or **Static Site**).
3. Connect your repository:
   - If using **Blueprint**, Render reads `render.yaml` automatically.
   - If creating a **Static Site** manually, leave **Build Command** empty and set **Publish Directory** to `.`.

## Project Structure

```text
.
├── index.html    # App markup, toolbar, sheet container, and modals
├── styles.css    # Screen and print stylesheet
├── app.js        # SVG diagram rendering, state management, and localStorage persistence
├── render.yaml   # Render static site Blueprint configuration
├── vercel.json   # Vercel static deployment configuration
├── .gitignore
├── LICENSE
└── README.md
```

## License

[MIT](LICENSE)
