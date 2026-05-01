<#
.SYNOPSIS
  Initialize the Robotic Lawnz repo, make the first commit, and push to a
  brand-new GitHub repo.

.DESCRIPTION
  Run from the repo root. Idempotent — re-running is safe; existing remotes
  are left alone unless -Force is passed.

  Two flows:
    1. With GitHub CLI:    gh repo create + push in one step.
    2. Without:            init + commit only; you push manually after
                           creating the repo on github.com.

.PARAMETER Repo
  GitHub <owner>/<repo> slug — e.g. paulrichards87/roboticlawnz.
  When -UseGh is set, this is the slug to create. Otherwise it's the slug
  used to set the `origin` remote.

.PARAMETER UseGh
  Use `gh repo create` to create the GitHub repo (requires gh CLI signed in).

.PARAMETER Visibility
  public | private. Default: private. Only used with -UseGh.

.PARAMETER Force
  Replace any existing .git directory and rewrite remotes.

.EXAMPLE
  pwsh -File scripts\setup-git.ps1 -Repo paulrichards87/roboticlawnz -UseGh

.EXAMPLE
  pwsh -File scripts\setup-git.ps1 -Repo paulrichards87/roboticlawnz
  # Then create the repo at https://github.com/new and run `git push -u origin main`
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Repo,

    [switch]$UseGh,

    [ValidateSet("public", "private")]
    [string]$Visibility = "private",

    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Move to the repo root (the script lives at scripts/setup-git.ps1).
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "→ Repo root: $RepoRoot" -ForegroundColor Cyan

# 1. Clean stale .git from prior failed init (Linux sandbox left junk behind).
if (Test-Path .git) {
    if ($Force -or -not (Test-Path .git\HEAD)) {
        Write-Host "→ Removing existing .git directory" -ForegroundColor Yellow
        Remove-Item -Recurse -Force .git
    } else {
        Write-Host "→ .git already exists — pass -Force to recreate" -ForegroundColor Yellow
    }
}

# 2. git init + identity
if (-not (Test-Path .git)) {
    git init -q -b main
    Write-Host "✓ git init (branch: main)" -ForegroundColor Green
}
git config user.name "Paul Richards"
git config user.email "paul.w.richards87@gmail.com"
git config core.autocrlf true       # Windows-friendly line endings on disk
git config init.defaultBranch main
Write-Host "✓ user identity configured" -ForegroundColor Green

# 3. Stage everything (.gitignore prevents node_modules, .next, .env, etc.)
git add -A

$staged = (git diff --cached --numstat | Measure-Object).Count
Write-Host "✓ staged $staged files" -ForegroundColor Green

# Belt-and-braces: confirm no .env files snuck in.
$envFiles = git diff --cached --name-only | Where-Object { $_ -match '(^|/)\.env(\.|$)' -and $_ -notmatch '\.env\.example$' }
if ($envFiles) {
    Write-Host "✗ refusing to commit .env files:" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    git reset --quiet
    exit 1
}

# 4. Initial commit (skip if already committed).
$hasCommits = $true
try { git rev-parse HEAD 2>$null | Out-Null } catch { $hasCommits = $false }

if (-not $hasCommits -or $Force) {
    git commit -q -m "feat: initial commit — Robotic Lawnz MVP" `
                  -m "Phase 1 ship of the assessment flow, recommendation engine, lead capture, sales + admin dashboards, Clerk auth, Mapbox + SAM 2 integration, Resend email, PostHog analytics, privacy + terms, CI workflow, and Railway deploy config."
    Write-Host "✓ initial commit" -ForegroundColor Green
}

# 5. Origin remote
$expectedRemote = "https://github.com/$Repo.git"
$current = git remote get-url origin 2>$null
if ($current -and $current -ne $expectedRemote -and -not $Force) {
    Write-Host "→ origin already set to $current — pass -Force to replace" -ForegroundColor Yellow
} elseif ($current -ne $expectedRemote) {
    if ($current) { git remote remove origin }
    git remote add origin $expectedRemote
    Write-Host "✓ origin → $expectedRemote" -ForegroundColor Green
}

# 6. Create the GitHub repo + push, if requested.
if ($UseGh) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "✗ gh CLI not found. Install it from https://cli.github.com/ or skip -UseGh and create the repo on github.com." -ForegroundColor Red
        exit 2
    }

    $description = "Robotic Lawnz — customer-facing web app for the ZippyLawnz sub-brand."
    Write-Host "→ creating $Repo on GitHub ($Visibility)..." -ForegroundColor Cyan
    & gh repo create $Repo --$Visibility --description $description --source=. --remote=origin --push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ gh repo create failed (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "✓ pushed to https://github.com/$Repo" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Create the repo at https://github.com/new (name: $Repo)"
    Write-Host "  2. git push -u origin main"
    Write-Host ""
    Write-Host "Or rerun this script with -UseGh to do both steps automatically." -ForegroundColor Cyan
}
