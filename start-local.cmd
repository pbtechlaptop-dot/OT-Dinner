@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ENV_FILE=.env.production.vercel"
if not exist "%ENV_FILE%" (
  echo [ERROR] %ENV_FILE% not found.
  echo Run: vercel env pull .env.production.vercel --environment=production
  pause
  exit /b 1
)

for /f "usebackq tokens=* delims=" %%L in ("%ENV_FILE%") do (
  set "line=%%L"
  if not "!line!"=="" if not "!line:~0,1!"=="#" (
    for /f "tokens=1* delims==" %%A in ("!line!") do (
      set "key=%%A"
      set "val=%%B"
      if defined key (
        if not "!key!"=="PATH" if not "!key!"=="Path" (
          if defined val (
            set "val=!val:"=!"
          )
          set "!key!=!val!"
        )
      )
    )
  )
)

if not defined APP_TIMEZONE set "APP_TIMEZONE=Pacific/Auckland"
if not defined SUPABASE_URL (
  echo [ERROR] SUPABASE_URL is missing in %ENV_FILE%.
  pause
  exit /b 1
)
if not defined SUPABASE_SERVICE_ROLE_KEY (
  echo [ERROR] SUPABASE_SERVICE_ROLE_KEY is missing in %ENV_FILE%.
  pause
  exit /b 1
)

echo Starting local server with:
echo   APP_TIMEZONE=%APP_TIMEZONE%
echo   SUPABASE_URL=%SUPABASE_URL%
echo.
echo Open: http://127.0.0.1:3000
echo Press Ctrl+C to stop.
echo.

node server.js
exit /b %errorlevel%

