#!/usr/bin/env bash

function header () {
  echo ""
  echo "*********************************"
  echo -e "* $1"
  echo "*********************************"
  echo ""
}

function makeDirectories () {

    header "Creating new layer directory"

    if [ -e "$package_dir" ]; then
        rm -rf "$package_dir"
    fi

    mkdir -p "$package_dir"
    cp -a "$root_dir"/package.json "$package_dir"
}

function install () {

    header "Installing dependencies"

    pushd "$package_dir" || exit
        npm i --production
    popd || exit
}

function package () {

    header "Packing directory"

    pushd "$dist_dir" || exit
        zip -r nodejs.zip nodejs/*
    popd || exit
}

# Get reference for all important folders
root_dir="$PWD"
dist_dir="$root_dir/lambda/dist/layer"
package_dir="$root_dir/lambda/dist/layer/nodejs"

makeDirectories
install
package
header "Packaging finished. Now apply in Terraform folder ./terraform/infrastructure/ENV"
