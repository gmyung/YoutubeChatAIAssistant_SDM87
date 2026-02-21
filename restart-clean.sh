#!/bin/bash
# Kill any process using port 3001 (old server) so only one server runs
echo "Checking what's using port 3001..."
if command -v lsof &>/dev/null; then
  lsof -ti :3001 | xargs kill -9 2>/dev/null && echo "Killed process(es) on 3001" || echo "Nothing was using 3001"
else
  echo "lsof not found; stop any running 'npm start' or 'node server' manually (Ctrl+C in those terminals)"
fi
echo "Now run: npm start"
