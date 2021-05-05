#!/bin/bash

# Get reference for all important folders
root_dir="$PWD"

function zipFunctions () {
    functionDir=$1
    dist_dir="$root_dir/lambda/dist/functions$functionDir"
    source_dir="$root_dir/lambda/source$functionDir"

    if [ -e $dist_dir ]; then
        rm -rf $dist_dir
    fi
    mkdir $dist_dir

    for filename in $source_dir/*; do
        [ -e "$filename" ] || continue
        cd $filename
        if [ -e "index.js" ]; then
            if [ -e "package.json" ]; then
            npm i
            fi
            currentDirName=${PWD##*/}
            zip -q -r9 $dist_dir/$currentDirName.zip *
            echo "$currentDirName packaged"
            if [ -e "package.json" ]; then
            rm -fR node_modules
            fi
        fi
    done
}

zipFunctions /
