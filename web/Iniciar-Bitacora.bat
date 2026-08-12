@echo off
title Bitacora Web - Servidor de la planta
cd /d "%~dp0"
echo ============================================
echo   BITACORA WEB - SERVIDOR DE LA PLANTA
echo   Deten este servidor con Ctrl+C
echo ============================================
echo.
node servidor.cjs
pause
