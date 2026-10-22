// Same colour values as the app (docs/THEME.md says admin imports them).
import { palettes, type Colors } from "../../app/src/theme/tokens";

const toVars = (c: Colors) =>
  Object.entries(c)
    .map(([k, v]) => `--${k}:${v};`)
    .join("");

// Dark by default; light follows the OS, or a data-theme override.
export const themeCss = `
:root{${toVars(palettes.dark)}color-scheme:dark}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){${toVars(palettes.light)}color-scheme:light}}
:root[data-theme="light"]{${toVars(palettes.light)}color-scheme:light}
`;
