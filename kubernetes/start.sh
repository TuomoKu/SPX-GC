#!/bin/sh

if [ -z "$(ls -A ./ASSETS)" ]; then
  cp -R ./_ASSETS/* ./ASSETS
fi

if [ -z "$(ls -A ./DATAROOT)" ]; then
  cp -R ./_DATAROOT/* ./DATAROOT
fi

node server.js