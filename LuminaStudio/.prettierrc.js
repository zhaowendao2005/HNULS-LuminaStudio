module.exports = {
  singleQuote: true,
  semi: false,
  printWidth: 100,
  trailingComma: 'none',
  vueIndentScriptAndStyle: false,
  singleAttributePerLine: false,
  // 关键配置：保持 HTML 属性在合理范围内不换行
  htmlWhitespaceSensitivity: 'ignore',
  // Vue 相关配置
  overrides: [
    {
      files: '*.vue',
      options: {
        singleAttributePerLine: false
      }
    }
  ]
}
