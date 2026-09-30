# Diagnóstico SOMENTE LEITURA do servidor Oracle (não instala, não para e não altera nada).
# Usa o mesmo comando ssh que você já usa no PowerShell (lido do histórico) e salva o resultado em diagnostico-servidor.txt.
$ErrorActionPreference = 'Continue'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$saida = Join-Path $pasta 'diagnostico-servidor.txt'
$chavePadrao = 'C:\Users\da338\OneDrive\Desktop\vpss\ssh-key-2026-02-13.key'

$alvo = $null; $chave = $null; $porta = $null
$hist = Join-Path $env:APPDATA 'Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt'
if (Test-Path $hist) {
  $linha = Get-Content $hist | Where-Object { $_ -match '^\s*ssh(\.exe)?\s' -and $_ -match '\S+@\S+' } | Select-Object -Last 1
  if ($linha) {
    if ($linha -match '(\S+@[\w\.\-]+)') { $alvo = $Matches[1] }
    if ($linha -match '-i\s+"([^"]+)"') { $chave = $Matches[1] } elseif ($linha -match "-i\s+'([^']+)'") { $chave = $Matches[1] } elseif ($linha -match '-i\s+(\S+)') { $chave = $Matches[1] }
    if ($linha -match '-p\s+(\d+)') { $porta = $Matches[1] }
  }
}
if (-not $alvo) { $alvo = Read-Host 'Nao achei o endereco no historico. Digite usuario@IP do servidor (ex.: ubuntu@1.2.3.4)' }
if (-not $chave) { $chave = $chavePadrao }
if (-not $porta) { $porta = '22' }
Write-Host "Conectando em $alvo (porta $porta) para um diagnostico somente leitura..."

$remoto = @'
echo "== SISTEMA"; uname -srm; grep -E '^(PRETTY_NAME)=' /etc/os-release; uptime
echo; echo "== CPU"; nproc; lscpu | grep -E 'Model name|Architecture'
echo; echo "== MEMORIA"; free -h
echo; echo "== SWAP"; swapon --show
echo; echo "== DISCO"; df -h -x tmpfs -x devtmpfs -x overlay 2>/dev/null
echo; echo "== CARGA (5 amostras de 1s)"; vmstat 1 5
echo; echo "== PROCESSOS QUE MAIS USAM CPU"; ps aux --sort=-%cpu | head -12
echo; echo "== PROCESSOS QUE MAIS USAM MEMORIA"; ps aux --sort=-%mem | head -12
echo; echo "== PORTAS ABERTAS"; (sudo -n ss -tlnp 2>/dev/null || ss -tln) | head -40
echo; echo "== DOCKER"; (docker ps --format '{{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}' 2>/dev/null || sudo -n docker ps --format '{{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}' 2>&1) | head -20
echo; echo "== DOCKER USO"; (docker stats --no-stream 2>/dev/null || sudo -n docker stats --no-stream 2>&1) | head -20
echo; echo "== PM2"; (pm2 ls 2>&1 || true) | head -30
echo; echo "== SERVICOS ATIVOS"; systemctl list-units --type=service --state=running --no-pager --no-legend | head -60
echo; echo "== NODE / PYTHON"; node -v 2>&1; npm -v 2>&1; python3 --version 2>&1
echo; echo "== NGINX / CADDY"; nginx -v 2>&1; ls /etc/nginx/sites-enabled 2>&1; caddy version 2>&1
echo; echo "== FIREWALL"; sudo -n iptables -S INPUT 2>&1 | head -30; sudo -n ufw status 2>&1
echo; echo "== FIM"
'@
$remoto = $remoto -replace "`r`n", "`n"
$args2 = @('-i', $chave, '-p', $porta, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=20', $alvo, 'bash -s')
$resultado = $remoto | & ssh @args2 2>&1 | Out-String
"Servidor: $alvo`nData: $(Get-Date)`n`n$resultado" | Set-Content -Path $saida -Encoding UTF8
Write-Host ''
if ($resultado -match '== FIM') { Write-Host "Pronto! Resultado salvo em $saida. Pode voltar para o chat." } else { Write-Host 'A conexao nao completou. O que aconteceu esta em diagnostico-servidor.txt.'; Write-Host $resultado }
