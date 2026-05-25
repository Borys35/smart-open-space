import { defineConfig } from "oxlint";
import native from "oxlint-config-universe/native";

export default defineConfig({
  extends: [native],
  plugins: ["react"],
  rules: {
    "react/exhaustive-deps": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/no-import-type-side-effects": "error",
    curly: ["warn", "multi-line"],
  },
});
