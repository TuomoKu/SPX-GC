#!/bin/sh

rm -rf ./ASSETS/* && rm -rf ./DATAROOT/*

cp -R ./_ASSETS/* ./ASSETS && cp -R ./_DATAROOT/* ./DATAROOT
