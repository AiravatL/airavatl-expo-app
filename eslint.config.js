// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Naming conventions
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "interface",
          format: ["PascalCase"],
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
      ],
      // Component naming
      "react/jsx-pascal-case": "error",
      // File naming (enforced by file structure)
      "import/no-default-export": "off", // Expo Router requires default exports
      // Code organization
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external", 
            "internal",
            "parent",
            "sibling",
            "index"
          ],
          "newlines-between": "always",
        },
      ],
    },
  },
  {
    files: ["jest.setup.js", "**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
    languageOptions: {
      globals: {
        jest: "readonly",
        expect: "readonly",
        describe: "readonly",
        it: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        global: "readonly",
      },
    },
  },
]);
