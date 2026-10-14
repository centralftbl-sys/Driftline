# Rebuilds index.html from the files in src/. Run from the project folder:  .\build.ps1
$order = 'b_data.js','c_engine.js','d_loop.js','f_captains.js','g_depth.js','h_audio.js','i_console.js','j_traders.js','k_port.js','l_holdings.js','m_holdui.js','e_ui.js'
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>')
[void]$sb.AppendLine((Get-Content -Raw -Encoding UTF8 'src/a_head.html'))
[void]$sb.AppendLine('<script>')
foreach ($f in $order) { [void]$sb.AppendLine((Get-Content -Raw -Encoding UTF8 "src/$f")) }
[void]$sb.AppendLine('</script>')
[void]$sb.AppendLine('</body></html>')
[System.IO.File]::WriteAllText("$PSScriptRoot/index.html", $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
Write-Host "Built index.html"
