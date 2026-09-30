@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Enviando o Radar para o GitHub (Dja-Cripto/gera-enprego)...
echo.
where git >nul 2>&1
if errorlevel 1 (
  echo O Git nao esta instalado. Baixe em https://git-scm.com/download/win , instale e rode este arquivo de novo.
  pause
  exit /b 1
)
if not exist ".git" (
  git init -b main
  git remote add origin https://github.com/Dja-Cripto/gera-enprego.git
)
git config user.name >nul 2>&1 || git config user.name "Dja-Cripto"
git config user.email >nul 2>&1 || git config user.email "Dja-Cripto@users.noreply.github.com"
git add -A
REM Trava de seguranca: dados pessoais e chaves nunca podem ir para o GitHub.
git diff --cached --name-only | findstr /i /c:".radar-jobs-state.json" /c:".radar-auth.json" /c:"perfil-pessoal.js" /c:"diagnostico-servidor.txt" /c:".pdf" >nul
if not errorlevel 1 (
  echo ERRO: arquivos com dados pessoais ou chaves entraram no envio. Nada foi enviado.
  git reset >nul
  pause
  exit /b 1
)
git commit -m "Radar: vagas, clientes e publicacoes" >nul 2>&1
git branch -M main
git push -u origin main
if errorlevel 1 (
  echo.
  echo O envio falhou. Se pediu login, entre com a sua conta do GitHub e rode de novo.
) else (
  echo.
  echo Pronto! Veja em https://github.com/Dja-Cripto/gera-enprego
)
pause
