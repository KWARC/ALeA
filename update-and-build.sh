#!/bin/bash
set -e

git pull
NX_DAEMON=false npx nx reset
NX_DAEMON=false npx nx build alea-frontend --outputPath=dist/packages/alea-frontend-new
