import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', '*.js', '*.mjs'] },
  ...tseslint.configs.recommended,
  prettier,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
