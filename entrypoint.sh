#!/bin/sh
set -e

gcsfuse --implicit-dirs $BUCKET_NAME /usr/src/app/ASSETS
node server.js