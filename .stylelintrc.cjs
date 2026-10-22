module.exports = {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['dist/**', 'coverage/**', 'node_modules/**'],
  rules: {
    'alpha-value-notation': 'number',
    'color-function-notation': 'modern',
    'hue-degree-notation': 'number',
    // 保留 Fable 原版的 WebKit 兼容声明，避免自动修复移除
    'property-no-vendor-prefix': [
      true,
      { ignoreProperties: ['user-select', 'backdrop-filter'] },
    ],
    'media-feature-range-notation': null,
    'no-descending-specificity': null,
    'selector-class-pattern': null,
    'value-keyword-case': null,
  },
};
