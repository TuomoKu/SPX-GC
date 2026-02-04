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

# Start background S3 sync if S3_TEMPLATES_URL is set
if [ -n "$S3_TEMPLATES_URL" ]; then
  # Extract bucket name from S3 URL (e.g., s3://bucket-name/path -> bucket-name)
  BUCKET_NAME=$(echo "$S3_TEMPLATES_URL" | sed 's|s3://||' | cut -d'/' -f1)
  SYNC_TARGET="/app/ASSETS/templates/${BUCKET_NAME}"
  SYNC_INTERVAL="${S3_SYNC_INTERVAL:-60}"

  # Optional endpoint for MinIO or other S3-compatible storage
  ENDPOINT_ARG=""
  if [ -n "$S3_ENDPOINT_URL" ]; then
    ENDPOINT_ARG="--endpoint-url $S3_ENDPOINT_URL"
  fi

  mkdir -p "$SYNC_TARGET"

  echo "Starting bidirectional S3 template sync with $S3_TEMPLATES_URL (local: $SYNC_TARGET, interval: ${SYNC_INTERVAL}s)"
  if [ -n "$S3_ENDPOINT_URL" ]; then
    echo "Using custom S3 endpoint: $S3_ENDPOINT_URL"
  fi

  # Background sync loop (bidirectional)
  (
    while true; do
      # Upload local changes to S3 (without --delete to avoid race conditions between instances)
      aws s3 sync "$SYNC_TARGET" "$S3_TEMPLATES_URL" $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Upload] $line"
      done
      # Download from S3 (with --delete so all instances mirror S3)
      aws s3 sync "$S3_TEMPLATES_URL" "$SYNC_TARGET" --delete $ENDPOINT_ARG 2>&1 | while read line; do
        echo "[S3 Download] $line"
      done
      sleep "$SYNC_INTERVAL"
    done
  ) &
fi

exec node server.js
