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

:: Re-launch from a private temp copy so git stash/checkout can never swap THIS
:: file out from under the running interpreter. When git reverts/checks out the
:: tracked nearby.bat mid-run, cmd keeps reading byte offsets from the swapped
:: file and executes garbage (e.g. "'et' is not recognized"). The temp copy is
:: untracked, so it stays put while the repo copy is free to change.
if not defined NEARBY_RELAUNCHED (
    set "NEARBY_RELAUNCHED=1"
    set "NEARBY_ROOT=%~dp0"
    set "NEARBY_SELF=%TEMP%\nearby_run_%RANDOM%%RANDOM%.bat"
    copy /y "%~f0" "!NEARBY_SELF!" >nul
    call "!NEARBY_SELF!" %*
    set "RC=!ERRORLEVEL!"
    del "!NEARBY_SELF!" >nul 2>&1
    exit /b !RC!
)

:: --- Below here runs from the temp copy; use the repo root captured above. ---
set "ROOT=%NEARBY_ROOT%"
set "SERVER=%ROOT%server"
set "CLIENT=%ROOT%dev"
cd /d "%ROOT%"

:: Detect the git remote name (this repo's remote may not be called "origin").
set "REMOTE="
for /f "delims=" %%R in ('git remote 2^>nul') do if not defined REMOTE set "REMOTE=%%R"
if not defined REMOTE set "REMOTE=origin"

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

:: Dispatch with goto (not call): handlers return via "goto :MENU", which keeps
:: the call stack flat. Using call here leaks a frame each round and eventually
:: trips cmd's batch-recursion limit.
if "%CHOICE%"=="1" goto :CMD_dev
if "%CHOICE%"=="2" goto :CMD_install
if "%CHOICE%"=="3" goto :CMD_staging
if "%CHOICE%"=="4" goto :CMD_prod
if "%CHOICE%"=="5" goto :CMD_release
if "%CHOICE%"=="6" goto :CMD_status
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
goto :MENU_WAIT


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

:: Carry any uncommitted changes onto main (stash -> checkout -> pop),
:: so this works even when you are sitting on prod or a feature branch.
call :SYNC_TO_MAIN
if errorlevel 1 (
    pause
    goto :MENU
)

call :CHECK_DIRTY
if "%DIRTY%"=="1" (
    call :GET_MESSAGE "staging"
    if "!MSG!"=="" (
        echo  [STAGING] Commit cancelled - empty message.
        pause
        goto :MENU
    )
    git add -A
    git commit -m "!MSG!"
    if errorlevel 1 (
        echo  [STAGING] Commit failed.
        pause
        goto :MENU
    )
) else (
    echo  [STAGING] No new changes - pushing current main HEAD.
)

echo  [STAGING] Pushing to !REMOTE!/main ...
git push !REMOTE! main
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

:: Prod is a PROMOTION of main -> prod. It does not commit working changes.
:: If the tree is dirty, send the user to staging/release first so the code
:: lands on main before it is promoted.
call :CHECK_DIRTY
if "%DIRTY%"=="1" (
    echo  [PROD] You have uncommitted changes.
    echo  [PROD] Run option 3 (staging) or 5 (release) first so they land on main,
    echo  [PROD] then promote to prod from here.
    pause
    goto :MENU
)

set /p "CONFIRM=  Confirm promote main -^> prod and push? [y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo  [PROD] Aborted.
    pause
    goto :MENU
)

:: Tree is clean, so switching branches is safe.
git checkout main
if errorlevel 1 (
    echo  [PROD] Could not switch to main.
    pause
    goto :MENU
)

:: Switch to prod branch (create if it doesn't exist) and bring main in.
git show-ref --verify --quiet refs/heads/prod
if errorlevel 1 (
    echo  [PROD] Creating local prod branch from main ...
    git checkout -b prod
    if errorlevel 1 (
        echo  [PROD] Failed to create prod branch.
        pause
        goto :MENU
    )
) else (
    git checkout prod
    if errorlevel 1 (
        echo  [PROD] Failed to switch to prod.
        pause
        goto :MENU
    )
    git merge main --no-edit
    if errorlevel 1 (
        echo  [PROD] Merge main -^> prod failed - resolve conflicts, then retry.
        pause
        goto :MENU
    )
)

echo  [PROD] Pushing to !REMOTE!/prod ...
git push !REMOTE! prod
if errorlevel 1 (
    echo  [PROD] Push failed - check remote access / branch protection.
    pause
    goto :MENU
)

:: Leave the working tree back on main.
git checkout main >nul 2>nul

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

:: Carry any uncommitted changes onto main (stash -> checkout -> pop).
call :SYNC_TO_MAIN
if errorlevel 1 (
    pause
    goto :MENU
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
echo  [RELEASE] Pushing to !REMOTE!/main ...
git push !REMOTE! main
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

echo  [RELEASE] Pushing to !REMOTE!/prod ...
git push !REMOTE! prod
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

:: Move to main, carrying any uncommitted changes via a temporary stash.
:: Returns exit code 1 (and prints why) if the branch could not be reached.
:SYNC_TO_MAIN
set "STASHED=0"
for /f "tokens=*" %%B in ('git rev-parse --abbrev-ref HEAD') do set "CURBR=%%B"
if /i "%CURBR%"=="main" exit /b 0

call :CHECK_DIRTY
if "%DIRTY%"=="1" (
    echo  [GIT] Stashing local changes to carry them to main ...
    git stash push -u -m "nearby-autostash"
    if errorlevel 1 (
        echo  [GIT] Stash failed - cannot move changes to main.
        exit /b 1
    )
    set "STASHED=1"
)

git checkout main
if errorlevel 1 (
    echo  [GIT] Could not switch to main.
    if "%STASHED%"=="1" git stash pop
    exit /b 1
)

if "%STASHED%"=="1" (
    git stash pop
    if errorlevel 1 (
        echo  [GIT] Stash pop hit a conflict - resolve it, then retry.
        exit /b 1
    )
)
exit /b 0

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
