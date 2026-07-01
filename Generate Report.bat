@echo off
cd /d "%~dp0"
echo Generating correspondence report...
node report.js
if errorlevel 1 (
  echo.
  echo Something went wrong. Leave this window open and send a screenshot to Sam.
  pause
  exit /b 1
)

for /f "delims=" %%f in ('dir /b /o-d "reports\barrasso-correspondence-*.html"') do (
  set "LATEST=%%f"
  goto :found
)
:found
start "" "reports\%LATEST%"
