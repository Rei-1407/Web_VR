const fs = require("fs");
const path = require("path");

// CRA dev server shows a warning if this sourcemap is referenced but missing.
// @react-three/drei pulls @mediapipe/tasks-vision, which currently references this file.
const mapPath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "@mediapipe",
  "tasks-vision",
  "vision_bundle_mjs.js.map"
);

const minimalSourceMap = '{"version":3,"sources":[],"names":[],"mappings":""}';

try {
  if (!fs.existsSync(mapPath)) {
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, minimalSourceMap, "utf8");
    console.log(`Created missing sourcemap placeholder: ${mapPath}`);
  }
} catch (err) {
  // Non-fatal: this script is just to reduce console noise.
  console.warn("fix-mediapipe-sourcemap: unable to create placeholder map", err);
}
