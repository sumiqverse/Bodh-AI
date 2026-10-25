@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
"%ROOT_DIR%\apps\api\.venv\Scripts\python.exe" -m app.cli.main %*
