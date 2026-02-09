import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Next.js doesn't need it
      'react/prop-types': 'off', // We use TypeScript
      '@typescript-eslint/no-explicit-any': 'off', // Many existing any usages
      'react-hooks/set-state-in-effect': 'off', // New rule in v5+, many existing usages
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  prettierConfig
);
