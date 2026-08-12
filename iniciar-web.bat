@echo off
cd /d "C:\Users\jonat\Documents\bitacora-app\web"
echo ================================================
echo  BITACORA WEB - Planta Independencia
echo.
echo  Abre en tu navegador: http://localhost:5173
echo  Para detenerla, cierra esta ventana.
echo ================================================
echo.
call npm.cmd run dev
pause
