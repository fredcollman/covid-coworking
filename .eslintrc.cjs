module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  extends: [
    "plugin:prettier/recommended",
    "prettier/flowtype",
    "plugin:flowtype/recommended",
  ],
};
