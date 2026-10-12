# Atualiza o Radar de ponta a ponta:
#   1) envia para o GitHub (backup e histórico);
#   2) copia os arquivos do projeto para o servidor (/home/ubuntu/radar), sem tocar em data/;
#   3) reconstrói só o painel no Docker e confere se voltou.
# Resultado em atualizar-servidor.txt. O endereço do servidor fica em deploy\servidor.local.json (fora do Git).
$ErrorActionPreference = 'Continue'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $pasta
$log = Join-Path $pasta 'atualizar-servidor.txt'
"Atualização do Radar - $(Get-Date)" | Set-Content -Path $log -Encoding UTF8
function Log($t){ Write-Host $t; Add-Content -Path $log -Value $t -Encoding UTF8 }

# ---------- Configuração do servidor (pede só na primeira vez) ----------
$cfgFile = Join-Path $pasta 'deploy\servidor.local.json'
$cfg = $null
if (Test-Path $cfgFile) { $cfg = Get-Content $cfgFile -Raw | ConvertFrom-Json }
if (-not $cfg) {
  $alvo = $null
  $hist = Join-Path $env:APPDATA 'Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt'
  if (Test-Path $hist) { $linha = Get-Content $hist | Where-Object { $_ -match '^\s*ssh(\.exe)?\s' -and $_ -match '\S+@\S+' } | Select-Object -Last 1; if ($linha -match '(\S+@[\w\.\-]+)') { $alvo = $Matches[1] } }
  if (-not $alvo) {
    Write-Host ''
    $ip = Read-Host 'Primeira vez: digite o IP do servidor Oracle (ex.: 129.146.10.20) e aperte Enter'
    $alvo = "ubuntu@$($ip.Trim())"
  }
  $cfg = [pscustomobject]@{ target = $alvo; key = 'C:\Users\da338\OneDrive\Desktop\vpss\ssh-key-2026-02-13.key'; path = '/home/ubuntu/radar' }
  $cfg | ConvertTo-Json | Set-Content -Path $cfgFile -Encoding UTF8
  Log "Servidor salvo em deploy\servidor.local.json: $($cfg.target)"
}
$sshOpts = "-i `"$($cfg.key)`" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20"

# ---------- 1. GitHub ----------
Log '== 1/3 Enviando para o GitHub'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Log 'ERRO: Git não instalado.'; exit 1 }
git add -A 2>&1 | Out-Null
$sens = git diff --cached --name-only | Select-String -Pattern '\.radar-jobs-state\.json|\.radar-auth\.json|perfil-pessoal\.js|diagnostico-servidor\.txt|atualizar-servidor\.txt|servidor\.local\.json|\.pdf$'
if ($sens) { git reset 2>&1 | Out-Null; Log "ERRO: arquivo sensível no envio ($sens). Nada foi enviado."; exit 1 }
git commit -m "Radar: atualização $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
cmd /c "git push origin HEAD:main 2>&1" | ForEach-Object { Log $_ }

# ---------- 2. Copiar arquivos para o servidor ----------
Log '== 2/3 Copiando os arquivos para o servidor'
$lista = Join-Path $env:TEMP 'radar-arquivos.txt'
git ls-files | Where-Object { $_ -notmatch '^(tests/|deploy/data/)' } | Set-Content -Path $lista -Encoding ASCII
$n = (Get-Content $lista).Count
Log "$n arquivos do projeto (os dados do servidor em data/ não são tocados)."
$copia = cmd /c "tar -czf - -T `"$lista`" | ssh $sshOpts $($cfg.target) `"mkdir -p $($cfg.path) && tar -xzf - -C $($cfg.path) && echo COPIA_OK`" 2>&1"
$copia | ForEach-Object { Log $_ }
if (-not ($copia -match 'COPIA_OK')) { Log 'ERRO: a cópia para o servidor falhou. Nada foi reiniciado.'; exit 1 }

# ---------- 3. Reconstruir o painel ----------
Log '== 3/3 Reconstruindo o painel no Docker'
$remoto = @'
set -e
cd __PATH__
DC="docker compose"; $DC version >/dev/null 2>&1 || DC="sudo -n docker compose"
$DC -f deploy/compose.yaml up -d --build --no-deps radar-panel
for i in $(seq 1 20); do sleep 3; if curl -fsS http://127.0.0.1:8765/api/health >/tmp/radar-health 2>/dev/null; then cat /tmp/radar-health; echo; echo "== FIM OK"; exit 0; fi; done
echo "ERRO: o painel não respondeu depois de 60 segundos"; $DC -f deploy/compose.yaml logs --tail 40 radar-panel; exit 1
'@
$remoto = ($remoto -replace '__PATH__', $cfg.path) -replace "`r`n", "`n"
$tmp = Join-Path $env:TEMP 'radar-remoto.sh'; [IO.File]::WriteAllText($tmp, $remoto)
$saida = cmd /c "ssh $sshOpts $($cfg.target) bash -s < `"$tmp`" 2>&1"
$saida | ForEach-Object { Log $_ }
if ($saida -match '== FIM OK') { Log 'PRONTO: Radar atualizado no servidor.' } else { Log 'ATENÇÃO: a atualização não terminou. Veja acima.' }
