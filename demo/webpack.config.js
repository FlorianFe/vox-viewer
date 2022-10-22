const path = require("path");

module.exports = {
  mode: "development",
  entry: "./demo/demo.js",
  output: {
    filename: "demo.js",
    path: path.join(__dirname, "/dist"),
  },
  resolve: {
    modules: ["node_modules"],
  },
};
