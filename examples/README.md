# Audio Loom Examples

Each example imports `AudioManager` directly from the local `dist/` folder and resolves the `rxjs` dependency from the esm.sh CDN via an import map.

## Running the examples

Because of browser security restrictions on ES modules and the Web Audio API, examples **must be served over HTTP** — they won't work when opened as `file://` URLs.

From the repo root, run:

```bash
pnpm run serve:examples
```

Then open:

- http://localhost:3000/examples/basic-audio/
- http://localhost:3000/examples/threejs/

> VS Code's **Live Server** extension also works — right-click the HTML file and choose *Open with Live Server*.

## Adding audio files

Each example expects audio files in its own `sounds/` subfolder. Drop your files in there and update the `addAudioTrack` calls in the respective `index.html`.

| Example | Expected files (defaults) |
|---|---|
| `basic-audio` | `sounds/sfx-1.wav`, `sounds/sfx-2.wav`, `sounds/music.mp3` |
| `threejs` | `sounds/sfx-1.wav`, `sounds/music.mp3` |

## Building before serving

If you've made changes to the library source, rebuild before testing:

```bash
pnpm run build
```
