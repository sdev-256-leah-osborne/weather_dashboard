import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
  recommended: true,
});

export default [
  ...compat.extends("eslint:recommended"),
  {
    rules: {
      semi: ["error", "always"],
      quotes: ["error", "single"]
    },
    files: ["./static/js/**/*.js"],
  },
];
