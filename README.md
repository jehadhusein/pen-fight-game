# Pen Fight

A free, browser-based pen flick game built with HTML, CSS and vanilla JavaScript. Play locally with a friend or challenge the computer, with Easy, Medium and Hard difficulty options.

**Play:** https://jehadhusein.github.io/pen-fight-game/

## Features

- Two-player local mode
- Computer opponent with three difficulty levels
- Drag-to-aim flick controls
- Canvas-based pen movement and collision physics
- Sound effects and supported-device collision vibration
- Responsive layout for desktop and mobile browsers
- Match scores reset when the page is refreshed

## How to play

1. Open the game link in a modern browser.
2. Choose **2 Players** or **VS AI**. Select an AI difficulty before or during a new match.
3. Drag back from the active pen to aim and set shot power, then release to flick.
4. Knock the opponent's pen off the table to win the round.

## Project files

- `index.html` — page structure and search/social metadata
- `style.css` — layout and responsive styles
- `script.js` — game controls, rendering and physics
- `ai/ai-player.js` — computer player's shot selection
- `robots.txt` and `sitemap.xml` — search engine discovery

## Development

No build step is required. Serve the repository with a local static server or open `index.html` in a browser. The game uses Tailwind CSS and Font Awesome from their CDNs, plus Google Fonts.

## Browser support

Designed for modern desktop and mobile browsers. Vibration depends on browser and device support and may be unavailable in some in-app browsers.

## License

No license has been specified yet. Contact the repository owner before reusing the code.
