#!/bin/sh

# Remove data folder
rm -rf ./ASSETS/* && rm -rf ./DATAROOT/*

# Copy the default assets
cp -R ./_ASSETS/* ./ASSETS && cp -R ./_DATAROOT/* ./DATAROOT
