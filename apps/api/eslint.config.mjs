import globals from "globals";
import base from "@geriatria/config/eslint.base.mjs";

export default [
  ...base,
  {
    // El código de la API y sus scripts corren en Node: `process`, `console`,
    // etc. son globales legítimas.
    files: ["src/**/*.ts", "scripts/**/*.mjs", "prisma/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
