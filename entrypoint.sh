#!/bin/sh
set -e

gcsfuse $BUCKET_NAME /usr/src/app/ASSETS
node server.js