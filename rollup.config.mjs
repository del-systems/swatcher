import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    banner: '#!/usr/bin/env node'
  },
  plugins: [
    nodeResolve({
      exportConditions: ['require'],
      preferBuiltins: true
    }),
    json(),
    commonjs({
      strictRequires: true
    })
  ]
}
