@echo off
setlocal

set "ROOT=%~dp0"

start "SF6 Live Server" /D "%ROOT%" cmd /k node server.js
start "" "http://localhost:8080/config-simple.html"

endlocal
