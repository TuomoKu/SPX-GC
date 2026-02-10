#!/bin/sh

# Generate config.json with PORT from environment variable
cat > /app/config.json << EOF
{
  "general": {
    "username": "${SPX_USERNAME:-admin}",
    "password": "${SPX_PASSWORD:-}",
    "hostname": "${OSC_HOSTNAME:-}",
    "greeting": "",
    "langfile": "english.json",
    "loglevel": "${SPX_LOGLEVEL:-info}",
    "launchBrowser": false,
    "apikey": "${SPX_APIKEY:-}",
    "logfolder": "/app/log/",
    "dataroot": "/data",
    "templatesource": "spx-ip-address",
    "port": ${PORT:-5656},
    "disableConfigUI": false,
    "disableLocalRenderer": false,
    "disableOpenFolderCommand": true,
    "disableSeveralControllersWarning": false,
    "hideRendererCursor": false,
    "resolution": "HD",
    "preview": "selected",
    "renderer": "normal",
    "autoplayLocalRenderer": true,
    "recents": []
  },
  "casparcg": {
    "servers": []
  },
  "osc": {
    "enable": false,
    "port": 57121
  },
  "globalExtras": {
    "customscript": "/ExtraFunctions/demoFunctions.js",
    "CustomControls": []
  }
}
EOF

# Optional endpoint for MinIO or other S3-compatible storage
ENDPOINT_ARG=""
if [ -n "$S3_ENDPOINT_URL" ]; then
  ENDPOINT_ARG="--endpoint-url $S3_ENDPOINT_URL"
  echo "Using custom S3 endpoint: $S3_ENDPOINT_URL"
fi

SYNC_INTERVAL="${S3_SYNC_INTERVAL:-60}"

# Start background S3 sync for templates if S3_TEMPLATES_URL is set
if [ -n "$S3_TEMPLATES_URL" ]; then
  TEMPLATES_SYNC_TARGET="/app/ASSETS/templates"

  mkdir -p "$TEMPLATES_SYNC_TARGET"

  echo "Starting bidirectional S3 template sync with $S3_TEMPLATES_URL (local: $TEMPLATES_SYNC_TARGET, interval: ${SYNC_INTERVAL}s)"

  # Background sync loop (bidirectional)
  (
    while true; do
      # Upload local changes to S3 (without --delete to avoid race conditions between instances)
      aws s3 sync "$TEMPLATES_SYNC_TARGET" "$S3_TEMPLATES_URL" $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Templates Upload] $line"
      done
      # Download from S3 (with --delete so all instances mirror S3)
      aws s3 sync "$S3_TEMPLATES_URL" "$TEMPLATES_SYNC_TARGET" --delete $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Templates Download] $line"
      done
      sleep "$SYNC_INTERVAL"
    done
  ) &
fi

# Start background S3 sync for projects if S3_PROJECTS_URL is set
if [ -n "$S3_PROJECTS_URL" ]; then
  PROJECTS_SYNC_TARGET="/data"

  mkdir -p "$PROJECTS_SYNC_TARGET"

  echo "Starting bidirectional S3 project sync with $S3_PROJECTS_URL (local: $PROJECTS_SYNC_TARGET, interval: ${SYNC_INTERVAL}s)"

  # Background sync loop (bidirectional)
  (
    while true; do
      # Upload local changes to S3 (without --delete to avoid race conditions between instances)
      aws s3 sync "$PROJECTS_SYNC_TARGET" "$S3_PROJECTS_URL" $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Projects Upload] $line"
      done
      # Download from S3 (with --delete so all instances mirror S3)
      aws s3 sync "$S3_PROJECTS_URL" "$PROJECTS_SYNC_TARGET" --delete $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Projects Download] $line"
      done
      sleep "$SYNC_INTERVAL"
    done
  ) &
fi

# Start background S3 sync for plugins if S3_PLUGINS_URL is set
if [ -n "$S3_PLUGINS_URL" ]; then
  PLUGINS_SYNC_TARGET="/app/ASSETS/plugins"

  mkdir -p "$PLUGINS_SYNC_TARGET"

  echo "Starting bidirectional S3 plugin sync with $S3_PLUGINS_URL (local: $PLUGINS_SYNC_TARGET, interval: ${SYNC_INTERVAL}s)"

  # Background sync loop (bidirectional)
  (
    while true; do
      # Upload local changes to S3 (without --delete to avoid race conditions between instances)
      aws s3 sync "$PLUGINS_SYNC_TARGET" "$S3_PLUGINS_URL" $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Plugins Upload] $line"
      done
      # Download from S3 (with --delete so all instances mirror S3)
      aws s3 sync "$S3_PLUGINS_URL" "$PLUGINS_SYNC_TARGET" --delete $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Plugins Download] $line"
      done
      sleep "$SYNC_INTERVAL"
    done
  ) &
fi

# Start background S3 sync for media if S3_MEDIA_URL is set
if [ -n "$S3_MEDIA_URL" ]; then
  MEDIA_SYNC_TARGET="/app/ASSETS/media"

  mkdir -p "$MEDIA_SYNC_TARGET"

  echo "Starting bidirectional S3 media sync with $S3_MEDIA_URL (local: $MEDIA_SYNC_TARGET, interval: ${SYNC_INTERVAL}s)"

  # Background sync loop (bidirectional)
  (
    while true; do
      # Upload local changes to S3 (without --delete to avoid race conditions between instances)
      aws s3 sync "$MEDIA_SYNC_TARGET" "$S3_MEDIA_URL" $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Media Upload] $line"
      done
      # Download from S3 (with --delete so all instances mirror S3)
      aws s3 sync "$S3_MEDIA_URL" "$MEDIA_SYNC_TARGET" --delete $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Media Download] $line"
      done
      sleep "$SYNC_INTERVAL"
    done
  ) &
fi

exec node server.js
