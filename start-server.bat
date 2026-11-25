@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" "node_modules\vite\bin\vite.js" --port 5173 >> "%TEMP%\entusados-dev.log" 2>&1
