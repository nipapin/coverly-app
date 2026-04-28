// `eslint-config-next` 16 ships a flat config (a plain array of config
// objects) and is loaded directly here. The previous setup wrapped it in
// `@eslint/eslintrc`'s `FlatCompat`, which `eslint-config-next` no longer
// supports — it crashes on circular references inside the plugin export.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
