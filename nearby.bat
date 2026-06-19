@echo off
setlocal EnableDelayedExpansion
title NearBy Dev Tool

:: -----------------------------------------------------------------------------
::  NearBy - one-stop batch for local dev, staging commits, and prod releases
::
::  Branch model:
::    main  -> staging  (CI runs + auto-deploy to staging environment)
::    prod  -> production (CI runs + auto-deploy to production environment)
::
::  Usage: nearby.bat [dev | staging | prod | install | status | help]
::  Or run with no args for interactive menu
:: -----------------------------------------------------------------------------

set "ROOT=%~dp0"
set "SERVER=%ROOT%server"
set "CLIENT=%ROOT%dev"

if not "%1"=="" (
    call :CMD_%1 2>nul
    if errorlevel 1 (
        echo [ERROR] Unknown command: %1
        echo Run "nearby.bat help" for usage.
        exit /b 1
    )
    exit /b 0
)

:MENU
cls
echo.
echo  +======================================================+
echo  ^|             NearBy - Dev Control Panel               ^|
echo  +======================================================+
echo  ^|  1. Start local dev    (client + server)             ^|
echo  ^|  2. Install deps       (client + server)             ^|
echo  ^|  3. Commit + push  -^>  main  (STAGING deploy)        ^|
echo  ^|  4. Commit + push  -^>  prod  (PRODUCTION deploy)     ^|
echo  ^|  5. Release to BOTH  (push main + merge into prod)   ^|
echo  ^|  6. Git status                                       ^|
echo  ^|  7. Exit                                             ^|
echo  +======================================================+
echo.
set /p "CHOICE=  Choose [1-7]: "

if "%CHOICE%"=="1" call :CMD_dev    & goto :MENU_WAIT
if "%CHOICE%"=="2" call :CMD_install
if "%CHOICE%"=="3" call :CMD_staging
if "%CHOICE%"=="4" call :CMD_prod
if "%CHOICE%"=="5" call :CMD_release
if "%CHOICE%"=="6" call :CMD_status
if "%CHOICE%"=="7" exit /b 0

echo [ERROR] Invalid choice.
timeout /t 1 >nul
goto :MENU

:MENU_WAIT
echo.
echo  [Servers launched in separate windows - press any key to return to menu]
pause >nul
goto :MENU


:: -----------------------------------------------------------------------------
::  CMD_dev  - start server + client in separate terminal windows
:: -----------------------------------------------------------------------------
:CMD_dev
echo.
echo  [DEV] Checking .env ...
if not exist "%SERVER%\.env" (
    echo  [WARN] server\.env not found - copying from .env.example
    copy "%SERVER%\.env.example" "%SERVER%\.env" >nul
    echo  [WARN] Edit server\.env before running (MongoDB URI, secrets, etc.)
    pause
)

echo  [DEV] Starting backend  (port 5000) ...
start "NearBy - Backend" cmd /k "cd /d "%SERVER%" && npm run dev"

echo  [DEV] Starting frontend (port 4200) ...
start "NearBy - Frontend" cmd /k "cd /d "%CLIENT%" && npm start"

echo.
echo  Backend  -^> http://localhost:5000
echo  Frontend -^> http://localhost:4200
echo.
exit /b 0


:: -----------------------------------------------------------------------------
::  CMD_install  - npm ci for both packages
:: -----------------------------------------------------------------------------
:CMD_install
echo.
echo  [INSTALL] server ...
cd /d "%SERVER%" && npm install
echo  [INSTALL] client ...
cd /d "%CLIENT%" && npm install
cd /d "%ROOT%"
echo  [INSTALL] Done.
pause
goto :MENU


:: -----------------------------------------------------------------------------
::  CMD_status
:: -----------------------------------------------------------------------------
:CMD_status
cd /d "%ROOT%"
echo.
git status
echo.
git log --oneline -8
echo.
pause
goto :MENU


:: -----------------------------------------------------------------------------
::  CMD_staging  - commit + push to main -> triggers staging CI/CD pipeline
:: -----------------------------------------------------------------------------
:CMD_staging
cd /d "%ROOT%"
echo.
echo  +---------------------------------------------+
echo  ^|  STAGING RELEASE - pushes to main           ^|
echo  ^|  This triggers:                             ^|
echo  ^|    * CI (lint + tests)                      ^|
echo  ^|    * Frontend -^> Vercel preview             ^|
echo  ^|    * Backend  -^> Railway staging            ^|
echo  +---------------------------------------------+
echo.
git status
echo.

call :CHECK_DIRTY
if "%DIRTY%"=="0" (
    echo  [STAGING] Nothing to commit.
    pause
    goto :MENU
)

call :GET_MESSAGE "staging"
if "!MSG!"=="" (
    echo  [STAGING] Commit cancelled - empty message.
    pause
    goto :MENU
)

:: Switch to main if not already there
for /f "tokens=*" %%B in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
    echo  [STAGING] Switching to main ...
    git checkout main
    if errorlevel 1 (
        echo  [STAGING] Failed to switch to main - stash or commit your changes first.
        pause
        goto :MENU
    )
)

git add -A
git commit -m "!MSG!"
if errorlevel 1 (
    echo  [STAGING] Commit failed.
    pause
    goto :MENU
)

echo  [STAGING] Pushing to origin/main ...
git push origin main
if errorlevel 1 (
    echo  [STAGING] Push failed - check remote access.
    pause
    goto :MENU
)

echo.
echo  [STAGING] Pushed to main.
echo  GitHub Actions will now:
echo    * Run CI (lint + tests)
echo    * Deploy frontend to Vercel preview
echo    * Deploy backend to Railway staging
echo    * Run smoke tests against staging
echo.
echo  Monitor: https://github.com/Dhinesh2403/NearBy/actions
echo.
pause
goto :MENU


:: -----------------------------------------------------------------------------
::  CMD_prod  - commit + push to prod -> triggers production CD pipeline
:: -----------------------------------------------------------------------------
:CMD_prod
cd /d "%ROOT%"
echo.
echo  +=============================================+
echo  ^|  PRODUCTION RELEASE - pushes to prod        ^|
echo  ^|  This triggers the full CD pipeline:        ^|
echo  ^|    * Frontend -^> Vercel (prod)              ^|
echo  ^|    * Backend  -^> Railway (production)       ^|
echo  ^|    * Smoke tests against live URLs          ^|
echo  +=============================================+
echo.
git status
echo.

set /p "CONFIRM=  Confirm push to prod? [y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo  [PROD] Aborted.
    pause
    goto :MENU
)

call :CHECK_DIRTY

:: If there are uncommitted changes, commit them first
if "%DIRTY%"=="1" (
    call :GET_MESSAGE "prod"
    if "!MSG!"=="" (
        echo  [PROD] Commit cancelled - empty message.
        pause
        goto :MENU
    )
    git add -A
    git commit -m "!MSG!"
    if errorlevel 1 (
        echo  [PROD] Commit failed.
        pause
        goto :MENU
    )
)

:: Switch to prod branch (create if it doesn't exist)
git show-ref --verify --quiet refs/heads/prod
if errorlevel 1 (
    echo  [PROD] Creating local prod branch from main ...
    git checkout main
    git checkout -b prod
) else (
    git checkout prod
    git merge main --no-edit
)

echo  [PROD] Pushing to origin/prod ...
git push origin prod
if errorlevel 1 (
    echo  [PROD] Push failed - check remote access / branch protection.
    pause
    goto :MENU
)

echo.
echo  [PROD] Pushed to prod.
echo  GitHub Actions will now:
echo    * Build frontend (production config) and deploy to Vercel
echo    * Audit backend and deploy to Railway production
echo    * Run smoke tests against production URLs
echo.
echo  Monitor: https://github.com/Dhinesh2403/NearBy/actions
echo.
pause
goto :MENU


:: -----------------------------------------------------------------------------
::  CMD_release  - one-shot: commit, push main, merge main -> prod, push prod
:: -----------------------------------------------------------------------------
:CMD_release
cd /d "%ROOT%"
echo.
echo  +=============================================+
echo  ^|  RELEASE TO BOTH - staging + production     ^|
echo  ^|  This will:                                 ^|
echo  ^|    * Commit pending changes on main         ^|
echo  ^|    * Push  -^> origin/main   (STAGING)       ^|
echo  ^|    * Merge main -^> prod                     ^|
echo  ^|    * Push  -^> origin/prod   (PRODUCTION)    ^|
echo  +=============================================+
echo.
git status
echo.

set /p "CONFIRM=  Confirm release to BOTH main and prod? [y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo  [RELEASE] Aborted.
    pause
    goto :MENU
)

:: Make sure we are on main before committing
for /f "tokens=*" %%B in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
    echo  [RELEASE] Switching to main ...
    git checkout main
    if errorlevel 1 (
        echo  [RELEASE] Failed to switch to main - stash or commit your changes first.
        pause
        goto :MENU
    )
)

:: Commit any pending changes on main
call :CHECK_DIRTY
if "%DIRTY%"=="1" (
    call :GET_MESSAGE "release"
    if "!MSG!"=="" (
        echo  [RELEASE] Commit cancelled - empty message.
        pause
        goto :MENU
    )
    git add -A
    git commit -m "!MSG!"
    if errorlevel 1 (
        echo  [RELEASE] Commit failed.
        pause
        goto :MENU
    )
) else (
    echo  [RELEASE] No pending changes - releasing current main HEAD.
)

:: Push main (staging)
echo  [RELEASE] Pushing to origin/main ...
git push origin main
if errorlevel 1 (
    echo  [RELEASE] Push to main failed - check remote access.
    pause
    goto :MENU
)

:: Merge main into prod (create prod if missing) and push
git show-ref --verify --quiet refs/heads/prod
if errorlevel 1 (
    echo  [RELEASE] Creating local prod branch from main ...
    git checkout -b prod
) else (
    git checkout prod
    if errorlevel 1 (
        echo  [RELEASE] Failed to switch to prod.
        pause
        goto :MENU
    )
    git merge main --no-edit
    if errorlevel 1 (
        echo  [RELEASE] Merge main -^> prod failed - resolve conflicts, then retry.
        pause
        goto :MENU
    )
)

echo  [RELEASE] Pushing to origin/prod ...
git push origin prod
if errorlevel 1 (
    echo  [RELEASE] Push to prod failed - check remote access / branch protection.
    pause
    goto :MENU
)

:: Return to main so the working tree is left on the dev branch
git checkout main >nul 2>nul

echo.
echo  [RELEASE] Done - pushed main and prod.
echo  GitHub Actions will now run both the staging and production pipelines.
echo.
echo  Monitor: https://github.com/Dhinesh2403/NearBy/actions
echo.
pause
goto :MENU


:: -----------------------------------------------------------------------------
::  Helpers
:: -----------------------------------------------------------------------------

:CHECK_DIRTY
set "DIRTY=0"
git diff --quiet 2>nul
if errorlevel 1 set "DIRTY=1"
git diff --cached --quiet 2>nul
if errorlevel 1 set "DIRTY=1"
:: check untracked files
for /f %%F in ('git ls-files --others --exclude-standard 2^>nul') do set "DIRTY=1"
exit /b 0

:GET_MESSAGE
set "MSG="
set /p "MSG=  Commit message (%1): "
exit /b 0
