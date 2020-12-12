#!/usr/bin/env bash

set -exuo pipefail

TEMP_DIR="/tmp/swatcher-e2e/"
mkdir -p "$TEMP_DIR"
find "$TEMP_DIR" -mindepth 1 -delete

PROJECT_DIR="$(dirname "$(dirname "$(realpath "$0")")")"

# start minio and prepare all keys
export SWATCHER_S3_ENDPOINT='http://127.0.0.1:9000'
export SWATCHER_S3_ACCESS_KEY='ACCESS_KEY'
export SWATCHER_S3_SECRET_KEY='SECRET_KEY'
export SWATCHER_S3_BUCKET_NAME='swatcher-bucket'
export SWATCHER_S3_FORCE_PATH_STYLE_BUCKET='1'
docker-compose -f "${PROJECT_DIR}/docker-compose.yml" up -d
sleep 15

# first push a commit
export GITHUB_EVENT_NAME='push'
cat <<EOF > /tmp/github_payload.json
{
  "sha": "masterSHA1",
  "parents": [
    {
      "sha": "masterSHA0"
    }
  ]
}
EOF
export GITHUB_EVENT_PATH='/tmp/github_payload.json'

cp "${PROJECT_DIR}/e2e/fixtures/ipad-1.png" "$TEMP_DIR/ipad_home.png"
cp "${PROJECT_DIR}/e2e/fixtures/ipad-3.png" "$TEMP_DIR/ipad_apps.png"
"${PROJECT_DIR}/dist/index.js" collect "$TEMP_DIR"
"${PROJECT_DIR}/dist/index.js" generate-diff

## clean the pushed commit
find "$TEMP_DIR" -mindepth 1 -delete

# now try to create a pull request
export GITHUB_EVENT_NAME='pull_request'
cat <<EOF > /tmp/github_payload.json
{
  "base": {
    "sha": "masterSHA1"
  },
  "head": {
    "sha": "featureSHA1"
  }
}
EOF

cp "${PROJECT_DIR}/e2e/fixtures/ipad-2.png" "$TEMP_DIR/ipad_home.png"
cp "${PROJECT_DIR}/e2e/fixtures/ipad-4.png" "$TEMP_DIR/ipad_settings.png"
"${PROJECT_DIR}/dist/index.js" collect "$TEMP_DIR"
"${PROJECT_DIR}/dist/index.js" generate-diff

docker-compose -f "${PROJECT_DIR}/docker-compose.yml" down

