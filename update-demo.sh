#!/bin/sh

rm -rf docs/demo
npm run build
cp -r public docs/demo
git add docs/demo
git ci -m "Update demo"
