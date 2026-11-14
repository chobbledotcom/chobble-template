#!/usr/bin/env bash

# The cpd steps must never touch the npm-shipped jscpd on NixOS, so stage
# the musl binary (a no-op when already installed) before running them.
# shellcheck source=/dev/null
source @runtimeSetup@

node scripts/jscpd/install.js

exec npm run precommit "$@"
