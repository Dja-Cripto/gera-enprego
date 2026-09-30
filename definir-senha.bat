@echo off
chcp 65001 >nul
cd /d "%~dp0"
node server.mjs --definir-senha
echo A nova senha ja vale, mesmo com o Radar aberto. Entre de novo nos seus aparelhos.
pause
