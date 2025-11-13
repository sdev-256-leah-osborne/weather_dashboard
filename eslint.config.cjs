// eslint.config.cjs
module.exports = [
  {
    files: ["./static/js/**/*.js"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
      },
      sourceType: "module",
    },
    rules: {
      semi: "error",
      quotes: ["error", "double"],
    },
  },
];
