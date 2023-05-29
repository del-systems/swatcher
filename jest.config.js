const forcePackagesToBeTransformed = [
  'node-fetch',
  'data-uri-to-buffer',
  'fetch-blob',
  'formdata-polyfill'
]

module.exports = {
  collectCoverage: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    'src/__tests__/test-utils.js'
  ],
  transformIgnorePatterns: [
    `<rootDir>/node_modules/(?!(${forcePackagesToBeTransformed.join('|')})/)`
  ]
}
