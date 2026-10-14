# Driftline: one-time setup for VS Code + Git + GitHub. Safe to re-run.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

Step '1/6  Installing Git, VS Code and GitHub CLI (winget)'
if (-not (Has winget)) { Write-Host 'winget is missing. Install "App Installer" from the Microsoft Store, then run this again.' -ForegroundColor Red; exit 1 }
foreach ($p in @(@('git','Git.Git'), @('code','Microsoft.VisualStudioCode'), @('gh','GitHub.cli'))) {
  RefreshPath
  if (Has $p[0]) { Write-Host "$($p[1]) already installed." }
  else { winget install --id $p[1] -e --silent --accept-source-agreements --accept-package-agreements }
}
RefreshPath
foreach ($c in 'git','gh') { if (-not (Has $c)) { Write-Host "$c not found on PATH yet. Close this window and run setup again." -ForegroundColor Red; exit 1 } }

Step '2/6  Git identity'
if (-not (git config --global user.name)) { git config --global user.name (Read-Host 'Your name for commits') }
if (-not (git config --global user.email)) { git config --global user.email (Read-Host 'Email for commits (use the one on your GitHub account)') }
git config --global init.defaultBranch main

Step '3/6  Sign in to GitHub'
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'A browser will open. No GitHub account yet? Click "Create an account" on that page, then come back and finish signing in.' -ForegroundColor Yellow
  gh auth login --hostname github.com --git-protocol https --web
}
gh auth setup-git

Step '4/6  VS Code settings and extensions'
New-Item -ItemType Directory -Force .vscode | Out-Null
'{ "recommendations": ["ritwickdey.liveserver"] }' | Set-Content -Encoding UTF8 .vscode/extensions.json
'{ "editor.tabSize": 2, "files.eol": "\n" }' | Set-Content -Encoding UTF8 .vscode/settings.json
if (Has code) { code --install-extension ritwickdey.LiveServer --force | Out-Null }

Step '5/6  Create the repository and push'
if (-not (Test-Path .git)) { git init | Out-Null }
git add -A
git diff --cached --quiet; if ($LASTEXITCODE -ne 0) { git commit -m 'Initial commit: Driftline' | Out-Null }
$owner = gh api user --jq .login
git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh repo view "$owner/Driftline" 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { git remote add origin "https://github.com/$owner/Driftline.git" }
  else { gh repo create Driftline --public --source . --remote origin --description 'Top-down space sim in the browser' }
}
git push -u origin main

Step '6/6  Turn on GitHub Pages'
gh api -X POST "repos/$owner/Driftline/pages" -f 'source[branch]=main' -f 'source[path]=/' 2>$null | Out-Null
$url = "https://$($owner.ToLower()).github.io/Driftline/"
Write-Host "`nDone!" -ForegroundColor Green
Write-Host "Repo:      https://github.com/$owner/Driftline"
Write-Host "Play link: $url   (takes a minute or two to go live the first time)"
if (Has code) { code . }
Read-Host "`nPress Enter to close"
