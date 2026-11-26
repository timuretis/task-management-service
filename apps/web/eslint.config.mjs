import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', '*.mjs'] },
  ...tseslint.configs.recommended,
  // Catches wrong useEffect dependency lists, the classic beginner bug.
  reactHooks.configs.flat.recommended,
  prettier,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
