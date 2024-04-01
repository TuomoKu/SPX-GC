#!/bin/sh

if [ -z "$(ls -A ./ASSETS/templates)" ]; then
  rm -rf ./ASSETS/* && cp -R ./_ASSETS/* ./ASSETS
fi

if [ -z "$(ls -A ./DATAROOT/HelloWorld-project)" ]; then
  rm -rf ./DATAROOT/* && cp -R ./_DATAROOT/* ./DATAROOT
fi

node server.js