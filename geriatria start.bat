@echo off
REM Arranca el sistema de Geriatria (API + Web) en modo produccion local.
REM Se posiciona en la carpeta del script para poder ejecutarse desde cualquier
REM lugar (acceso directo del escritorio, tarea programada, etc.).
cd /d "%~dp0"

echo ============================================
echo   Sistema de Geriatria
echo ============================================
echo.

echo [1/2] Compilando...
call pnpm build
if errorlevel 1 (
  echo.
  echo ERROR: fallo la compilacion. Revisa los mensajes de arriba.
  pause
  exit /b 1
)

echo.
echo [2/2] Iniciando ^(API en 3027, Web en 3028^)...
echo       Abri http://localhost:3028 en el navegador.
echo       Para detener: Ctrl+C en esta ventana.
echo.
call pnpm start

REM Si llegamos aca, el servidor se detuvo: dejamos la ventana abierta para que
REM el mensaje de error quede visible.
echo.
echo El servidor se detuvo.
pause
