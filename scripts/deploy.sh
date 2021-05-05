#!/bin/bash
./scripts/zipLambda.sh

stage=dev ./scripts/applyChanges.sh

stage=prod ./scripts/applyChanges.sh
