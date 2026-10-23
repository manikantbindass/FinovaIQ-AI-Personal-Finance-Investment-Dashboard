import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      ".local/**",
      "**/.venv/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
);
