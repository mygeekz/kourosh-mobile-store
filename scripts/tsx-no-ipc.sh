#!/bin/sh
# Sandbox/CI-safe TypeScript launcher. The tsx CLI creates an IPC socket even
# for one-shot runs; Node's import hook performs the same transpilation without it.
exec node --import tsx "$@"
