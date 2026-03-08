module.exports = [
  {
    files: ['**/*.{js,mjs}'],
    ignores: ['node_modules/**', 'public/build/**', 'playwright-report/**', 'test-results/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-trailing-spaces': 'error',
      semi: ['error', 'always']
    }
  }
];
