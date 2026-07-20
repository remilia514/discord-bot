@echo off

if "%~1"=="" (
    set msg=update
) else (
    set msg=%~1
)

git add .
git commit -m "%msg%"
git pull origin main
git push origin main