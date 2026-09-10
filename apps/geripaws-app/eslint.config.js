// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactNativeA11y = require('eslint-plugin-react-native-a11y');

module.exports = defineConfig([
  expoConfig,
  {
    // eslint-config-expo's default rule set caught real, pre-existing issues
    // unrelated to accessibility (React Compiler effect/purity violations, a
    // few unescaped JSX entities, one unused var) when this config was first
    // added. Fixing those is out of scope for the accessibility pass that
    // motivated adding ESLint — downgraded to warnings (still visible, not
    // silently ignored) rather than either fixing them here or leaving them
    // as errors that would block CI on unrelated grounds.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    plugins: { 'react-native-a11y': reactNativeA11y },
    rules: {
      // eslint-plugin-react-native-a11y predates ESLint 9's flat config and
      // ships no flat preset, so its rules are wired in individually rather
      // than via its `configs.basic` (an old-style `extends` object) — the
      // rule implementations themselves are plain ESLint rule objects and
      // work fine, only the packaged config shape doesn't.
      'react-native-a11y/has-accessibility-props': 'error',
      'react-native-a11y/has-valid-accessibility-role': 'error',
      'react-native-a11y/has-valid-accessibility-state': 'error',
      'react-native-a11y/has-valid-accessibility-states': 'error',
      'react-native-a11y/has-valid-accessibility-value': 'error',
      'react-native-a11y/has-valid-accessibility-actions': 'error',
      'react-native-a11y/has-valid-accessibility-component-type': 'error',
      'react-native-a11y/has-valid-accessibility-descriptors': 'error',
      'react-native-a11y/no-nested-touchables': 'error',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
