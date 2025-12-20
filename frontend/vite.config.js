const { defineConfig } = require("vite");
const reactImport = require("@vitejs/plugin-react");
const react = reactImport.default || reactImport;

module.exports = defineConfig({
  plugins: [react()],
  esbuild: {
    // Allow JSX in .js files (CRA-style project)
    loader: "jsx",
    jsx: "automatic",
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    outDir: "dist",
  },
});
