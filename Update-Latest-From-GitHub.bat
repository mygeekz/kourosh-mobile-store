@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "REPO_URL=https://github.com/mygeekz/kourosh-mobile-store.git"
set "SCRIPT_DIR=%~dp0"
set "CURRENT_DIR=%SCRIPT_DIR:~0,-1%"
set "CLONE_DIR=%SCRIPT_DIR%Kourosh-Latest-From-GitHub"

where git >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Git is not installed or is not available in PATH.
  echo Install Git for Windows, then run this file again.
  echo.
  pause
  exit /b 1
)

if exist "%CURRENT_DIR%\.git" (
  set "TARGET_DIR=%CURRENT_DIR%"
  echo Updating the current Git repository:
  echo %CURRENT_DIR%
) else (
  set "TARGET_DIR=%CLONE_DIR%"
  if not exist "%CLONE_DIR%\.git" (
    if exist "%CLONE_DIR%" (
      echo.
      echo ERROR: The target folder exists but is not a Git repository:
      echo %CLONE_DIR%
      echo Rename or remove that folder, then run this file again.
      echo.
      pause
      exit /b 1
    )
    echo Cloning the latest project version from GitHub...
    git clone "%REPO_URL%" "%CLONE_DIR%"
    if errorlevel 1 goto :failed
    goto :success
  )
  echo Updating the existing GitHub clone:
  echo %CLONE_DIR%
)

pushd "%TARGET_DIR%" || goto :failed

for /f "delims=" %%S in ('git status --porcelain') do set "HAS_CHANGES=1"
if defined HAS_CHANGES (
  echo.
  echo UPDATE STOPPED: Local changes were found in:
  echo %TARGET_DIR%
  echo Commit, stash, or back up those changes before updating.
  echo Nothing was overwritten.
  echo.
  popd
  pause
  exit /b 2
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)

echo Fetching latest changes...
git fetch --prune origin
if errorlevel 1 (
  popd
  goto :failed
)

set "DEFAULT_BRANCH="
for /f "tokens=2 delims=/" %%B in ('git symbolic-ref --short refs/remotes/origin/HEAD 2^>nul') do set "DEFAULT_BRANCH=%%B"
if not defined DEFAULT_BRANCH (
  git show-ref --verify --quiet refs/remotes/origin/main && set "DEFAULT_BRANCH=main"
)
if not defined DEFAULT_BRANCH (
  git show-ref --verify --quiet refs/remotes/origin/master && set "DEFAULT_BRANCH=master"
)
if not defined DEFAULT_BRANCH (
  echo ERROR: Could not determine the default GitHub branch.
  popd
  goto :failed
)

for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
  git switch "%DEFAULT_BRANCH%" 2>nul || git checkout "%DEFAULT_BRANCH%"
) else if /I not "%CURRENT_BRANCH%"=="%DEFAULT_BRANCH%" (
  git switch "%DEFAULT_BRANCH%" 2>nul || git checkout "%DEFAULT_BRANCH%"
)
if errorlevel 1 (
  popd
  goto :failed
)

echo Applying a safe fast-forward update from origin/%DEFAULT_BRANCH%...
git pull --ff-only origin "%DEFAULT_BRANCH%"
if errorlevel 1 (
  echo.
  echo UPDATE STOPPED: The repository cannot be fast-forwarded safely.
  echo No reset or destructive overwrite was performed.
  popd
  pause
  exit /b 3
)

where git-lfs >nul 2>&1
if not errorlevel 1 git lfs pull >nul 2>&1

popd

goto :success

:success
echo.
echo SUCCESS: The latest GitHub version is available at:
echo %TARGET_DIR%
echo.
echo This updater does NOT run npm install, build, migrations, or database changes.
start "" explorer "%TARGET_DIR%"
pause
exit /b 0

:failed
echo.
echo ERROR: The GitHub update could not be completed.
echo Check your internet connection, Git installation, and repository access.
echo No destructive reset was performed.
echo.
pause
exit /b 1
