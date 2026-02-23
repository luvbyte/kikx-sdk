import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/kikx-sdk.esm.js",
      format: "esm"
    },
    {
      file: "dist/kikx-sdk.cjs.js",
      format: "cjs"
    },
    {
      file: "dist/kikx-sdk.umd.js",
      format: "umd",
      name: "kikxSdk"
    }
  ],
  plugins: [resolve()]
};
