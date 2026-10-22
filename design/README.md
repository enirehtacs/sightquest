# Prototype reference

These `.dc.html` files are the screens from the Sightquest design canvas. They were made in a design tool format, so **they won't open as normal web pages**. Read them as source:

- **Layout and spacing**: the inline styles in the `<x-dc>` markup (frame width 390px).
- **Copy**: all visible text.
- **States and behaviour**: the `class Component` script at the bottom. It holds the mock data (routes, people, badges) and what each tap toggles.
- `{{name}}` holes are filled by `renderVals()` in that script.
- `<sc-for>` is a loop and `<sc-if>` is a condition.
- `<dc-import name="X" …>` means "this screen is screen X with these props". Small wrapper files (e.g. `MeDecember`, `CommentsNudge`, `LiveOffline`) show one state of a bigger screen.
- `*Light.dc.html` files render the same screen with `theme="light"`. The light and dark token values live in the `T = { dark: …, light: … }` object inside the main screen files.
- `canvas.json` lists every board with its title. Use it as the screen index.

If a prototype and `docs/SPEC.md` disagree, SPEC.md wins.

Want pixel-perfect matching? Vivi can screenshot boards from the canvas into `design/screens/`, and Claude Code can view those images.
