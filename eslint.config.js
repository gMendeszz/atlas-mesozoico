// ESLint: catches likely bugs before running the code. The React hooks rules are the important
// part here: they flag effects with missing dependencies (stale values) and hooks called
// conditionally, bugs that pass the tests and only show up when using the site.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "public/", "data/", "scripts/", "docs/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  }
);
