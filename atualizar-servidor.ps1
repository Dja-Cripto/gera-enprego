# Atualiza o Radar de ponta a ponta: envia para o GitHub e atualiza o servidor (git pull + Docker).
# Resultado em atualizar-servidor.txt. Não apaga dados: o estado fica em ../data no servidor.
$ErrorActionPreference = 'Continue'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $pasta
$log = Join-Path $pasta 'atualizar-servidor.txt'
"Atualização do Radar - $(Get-Date)" | Set-Content -Path $log -Encoding UTF8
function Log($t){ Write-Host $t; Add-Content -Path $log -Value $t -Encoding UTF8 }

# ---------- 1. GitHub ----------
Log '== 1/2 Enviando para o GitHub'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Log 'ERRO: Git não instalado.'; exit 1 }
git add -A 2>&1 | Out-Null
$sens = git diff --cached --name-only | Select-String -Pattern '\.radar-jobs-state\.json|\.radar-auth\.json|perfil-pessoal\.js|diagnostico-servidor\.txt|atualizar-servidor\.txt|\.pdf$'
if ($sens) { git reset 2>&1 | Out-Null; Log "ERRO: arquivo sensível no envio ($sens). Nada foi enviado."; exit 1 }
git commit -m "Radar: atualização $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
$push = git push origin HEAD:main 2>&1 | Out-String
Log $push.Trim()
if ($LASTEXITCODE -ne 0) { Log 'ERRO: o envio ao GitHub falhou.'; exit 1 }

# ---------- 2. Servidor ----------
Log '== 2/2 Atualizando o servidor'
$alvo=$null;$chave=$null;$porta='22'
$hist = Join-Path $env:APPDATA 'Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt'
if (Test-Path $hist) {
  $linha = Get-Content $hist | Where-Object { $_ -match '^\s*ssh(\.exe)?\s' -and $_ -match '\S+@\S+' } | Select-Object -Last 1
  if ($linha) {
    if ($linha -match '(\S+@[\w\.\-]+)') { $alvo = $Matches[1] }
    if ($linha -match '-i\s+"([^"]+)"') { $chave = $Matches[1] } elseif ($linha -match "-i\s+'([^']+)'") { $chave = $Matches[1] } elseif ($linha -match '-i\s+(\S+)') { $chave = $Matches[1] }
    if ($linha -match '-p\s+(\d+)') { $porta = $Matches[1] }
  }
}
if (-not $alvo) { Log 'ERRO: não achei o comando ssh no histórico do PowerShell.'; exit 1 }
if (-not $chave) { $chave = 'C:\Users\da338\OneDrive\Desktop\vpss\ssh-key-2026-02-13.key' }

$remoto = @'
set -e
D=$(docker inspect radar-panel --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' 2>/dev/null || sudo -n docker inspect radar-panel --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' 2>/dev/null || true)
if [ -z "$D" ]; then D=$(dirname "$(find ~ /opt /srv -maxdepth 4 -path '*deploy/compose.yaml' 2>/dev/null | head -1)"); fi
[ -n "$D" ] && [ -f "$D/compose.yaml" ] || { echo "ERRO: pasta do Radar não encontrada no servidor"; exit 1; }
cd "$D/.."
echo "Pasta: $(pwd)"
if [ -d .git ]; then git pull --ff-only; else echo "ERRO: a pasta do servidor não é um clone do GitHub"; exit 1; fi
DC="docker compose"; $DC version >/dev/null 2>&1 || DC="sudo -n docker compose"
$DC -f deploy/compose.yaml up -d --build
sleep 8
curl -fsS http://127.0.0.1:8765/api/health && echo && echo "== FIM OK"
'@
$remoto = $remoto -replace "`r`n", "`n"
$saida = $remoto | & ssh -i $chave -p $porta -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 $alvo 'bash -s' 2>&1 | Out-String
Log $saida.Trim()
if ($saida -match '== FIM OK') { Log 'PRONTO: Radar atualizado no servidor.' } else { Log 'ATENÇÃO: a atualização do servidor não terminou. Veja acima.' }
