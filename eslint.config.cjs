// eslint.config.cjs
module.exports = {
  root: true,
  parserOptions: { ecmaVersion: 2020 },
  env: { browser: true, es2021: true },
  rules: {
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
  },
};
