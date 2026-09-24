# Silly Goose Flap

A small browser game built with plain HTML, CSS, Canvas, and JavaScript.

Guide the goose through the reeds, build a high score, and avoid bonking into obstacles.

## Run it

No build step is required.

Open `index.html` directly, or serve the folder locally:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

- Space or Arrow Up to flap
- tap or click the game on mobile
- M to toggle sound

The best score is stored in the browser with `localStorage`.

## Project structure

```text
index.html    Page structure
styles.css   Layout and visual design
game.js      Canvas game loop and interaction
```

## Implementation

The game uses the Canvas API for rendering and `requestAnimationFrame` for the game loop.

There are no frameworks or runtime dependencies.

## Status

This started as a quick hackathon-style browser game. The repository has been cleaned up so the code is easier to review without changing the core game.
