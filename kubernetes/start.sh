#!/bin/sh

# Check if the ASSETS folder is empty and copy the default assets
if [ -z "$(ls -A ./ASSETS)" ]; then
  cp -R ./_ASSETS/* ./ASSETS
fi

# Check if the DATAROOT folder is empty and copy the default dataroot
if [ -z "$(ls -A ./DATAROOT)" ]; then
  cp -R ./_DATAROOT/* ./DATAROOT
fi

node server.js