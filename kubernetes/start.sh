#!/bin/sh

if [ -z "$(ls -A ./ASSETS/templates)" ]; then
  cp -R ./_ASSETS/* ./ASSETS
fi

if [ -z "$(ls -A ./DATAROOT/HelloWorld-project)" ]; then
  cp -R ./_DATAROOT/* ./DATAROOT
fi

node server.js