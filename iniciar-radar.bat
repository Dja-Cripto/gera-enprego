@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM Fecha uma versao antiga do Radar que ainda esteja usando a porta 8765.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8765 " ^| findstr "LISTENING"') do (
  echo Fechando versao antiga do Radar ^(processo %%p^)...
  taskkill /PID %%p /F >nul 2>&1
)
timeout /t 2 >nul
netstat -ano | findstr ":8765 " | findstr "LISTENING" >nul && (
  echo.
  echo ATENCAO: uma versao antiga do Radar continua aberta e nao consegui fecha-la.
  echo Feche todas as janelas pretas do Radar e abra este arquivo de novo.
  pause
  exit /b 1
)
echo Iniciando o Radar. Deixe esta janela aberta.
start "" /min cmd /c "timeout /t 3 >nul & start http://localhost:8765/"
set RADAR_LOOP=1
:inicio
node server.mjs
if %errorlevel%==75 (
  echo Carregando a versao nova do Radar...
  goto inicio
)
pause
