export default {
  input: "src/index.js",
  output: ["cjs", "esm"].map(format => ({
    file: `dist/bundle.${format}.js`,
    format
  }))
};
