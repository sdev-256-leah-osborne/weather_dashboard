import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
      globals: {
        document: "readonly",
        window: "readonly",
        console: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
  },
]);
