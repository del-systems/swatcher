export default {
  input: 'src/index.js',
  plugins: [],
  output: {
    file: 'dist/index.mjs',
    format: 'es',
    banner: '#!/usr/bin/env node'
  }
}
