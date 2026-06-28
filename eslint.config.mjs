import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Use Next.js recommended rules
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Disable problematic rules that cause issues
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "import/no-anonymous-default-export": "warn",
      "no-unused-vars": "warn",
      "prefer-const": "warn",
      // Remove TypeScript ESLint rule since plugin is not installed
      // "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "api-routes-backup/**",
      "chatpye-extension/**", // Exclude extension directory
      "chatpye-extension-v3/**", // Exclude extension v3 directory
    ],
  },
];

export default eslintConfig;
