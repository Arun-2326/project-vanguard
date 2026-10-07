// Copies the self-hosted web fonts from their npm packages into public/assets/fonts.
// Runs as the Vercel build step (npm run build) and before local dev.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const out = fileURLToPath(new URL("../public/assets/fonts/", import.meta.url));

const FONTS = {
  "@fontsource/inter": ["inter-latin-400-normal", "inter-latin-600-normal"],
  "@fontsource/source-serif-4": ["source-serif-4-latin-600-normal", "source-serif-4-latin-600-italic"],
};

await mkdir(out, { recursive: true });
let licence = "Web fonts used by Epicycles, distributed via Fontsource under the SIL Open Font License 1.1.\n";

for (const [pkg, files] of Object.entries(FONTS)) {
  const root = dirname(require.resolve(`${pkg}/package.json`));
  for (const file of files) {
    await copyFile(join(root, "files", `${file}.woff2`), join(out, `${file}.woff2`));
  }
  licence += `\n===== ${pkg} =====\n\n${await readFile(join(root, "LICENSE"), "utf8")}`;
}

await writeFile(join(out, "LICENSE.txt"), licence);
console.log(`Copied ${Object.values(FONTS).flat().length} fonts to public/assets/fonts`);
