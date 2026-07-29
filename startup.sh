#!/bin/sh
set -eu
cd /workspace
if [ -f /workspace/.env ]; then set -a; . /workspace/.env; set +a; fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then exit 0; fi
npm run dev >>/tmp/app-startup.log 2>&1 &
