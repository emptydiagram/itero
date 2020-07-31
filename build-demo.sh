#!/bin/sh

git branch -D gh-pages
git checkout -b gh-pages
npm run build
cp -r public docs
git add docs
git ci -m "Build demo"
