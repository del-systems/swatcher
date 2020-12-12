#!/usr/bin/env sh

set -e

npm install catage
find /data -iname '*.js' ! -ipath '*node_modules/*' ! -ipath '*__tests__/*' ! -ipath '/data/dist/index.js' -print -exec node_modules/.bin/catage -l javascript -s 1 '{}' '{}.png' \;
