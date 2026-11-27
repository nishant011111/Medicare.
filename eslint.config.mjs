import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: [
      'dist/**/*',
      'web/**/*',
      'backend/**/*',
      'app/**/*',
      'node_modules/**/*',
      'gradle/**/*',
      '.gradle/**/*',
      'docs/**/*',
      '*.mjs',
      '*.ts',
      '*.js',
    ],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
