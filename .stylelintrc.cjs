module.exports = {
  extends: ['stylelint-config-standard-less'],
  plugins: ['stylelint-order'],
  customSyntax: 'postcss-less',
  ignoreFiles: ['dist/**', 'coverage/**', 'node_modules/**'],
  rules: {
    'alpha-value-notation': 'number',
    'color-function-notation': 'legacy',
    'hue-degree-notation': 'number',
    'media-feature-range-notation': null,
    'no-descending-specificity': null,
    'selector-class-pattern': null,
    'value-keyword-case': null,
  },
};
