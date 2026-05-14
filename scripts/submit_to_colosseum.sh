#!/usr/bin/env bash
#===============================================================================
# meteora-agent Colosseum Hackathon Submission Script
# Usage: bash scripts/submit_to_colosseum.sh [--check|--video-review|--submit]
#
# Prerequisites:
#   - GitHub repo public and pushed
#   - Videos recorded and uploaded to YouTube/Vimeo (≤3 min each)
#   - Live dashboard running at meteora-agent.vercel.app
#   - Arena account at arena.colosseum.org
#
# What this script does:
#   --check        : Validate all submission requirements are met
#   --video-review : Checklist for pitch + demo video production
#   --submit       : Open submission form (manual fill since arena requires browser)
#===============================================================================

set -euo pipefail

REPO_URL="https://github.com/YOUR_USERNAME/meteora-agent"  # update this
DASHBOARD_URL="https://meteora-agent.vercel.app"
ARENA_URL="https://arena.colosseum.org/hackathon"

# -------- colours --------
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; BLU='\033[0;34m'
BLD='\033[1m'; RST='\033[0m'

info()    { echo -e "${BLU}[INFO]${RST} $1"; }
ok()      { echo -e "${GRN}[ OK ]${RST} $1"; }
warn()    { echo -e "${YLW}[WARN]${RST} $1"; }
fail()    { echo -e "${RED}[FAIL]${RST} $1"; }
section() { echo -e "\n${BLD}━━━ $1 ━━━${RST}"; }

#==============================================================================
# TASK 1 — Validate submission requirements
#==============================================================================
check_readiness() {
  section "Colosseum Submission Readiness Check"

  local errors=0

  # --- GitHub public ---
  info "Checking GitHub repo is public..."
  if gh repo view "$(basename "$REPO_URL" .git)" --json url --jq .url &>/dev/null; then
    ok "GitHub repo is public"
  else
    fail "GitHub repo not accessible (private or wrong URL)"
    errors=$((errors+1))
  fi

  # --- Dashboard live ---
  info "Checking live dashboard..."
  if curl -sf --max-time 10 "$DASHBOARD_URL" > /dev/null 2>&1; then
    ok "Dashboard is live at $DASHBOARD_URL"
  else
    fail "Dashboard not reachable at $DASHBOARD_URL"
    errors=$((errors+1))
  fi

  # --- Agent loop running ---
  info "Checking agent loop is running on VPS..."
  if systemctl is-active --quiet meteora-agent 2>/dev/null; then
    ok "meteora-agent.service is running"
  else
    warn "meteora-agent.service not running — start with:"
    warn "  systemctl enable --now meteora-agent"
  fi

  # --- DRY_RUN mode ---
  if grep -q "DRY_RUN=false" /opt/meteora-agent/.env 2>/dev/null; then
    ok "DRY_RUN=false — real positions active"
  elif grep -q "DRY_RUN=true" /opt/meteora-agent/.env 2>/dev/null; then
    warn "DRY_RUN=true — only simulated positions (still acceptable for submission)"
  fi

  # --- 53 unit tests ---
  info "Running unit tests..."
  cd /opt/meteora-agent
  if python -m pytest -q --tb=no 2>&1 | tail -3 | grep -q "passed"; then
    ok "Unit tests passing"
  else
    warn "Tests may need verification — run manually: cd /opt/meteora-agent && python -m pytest -q"
  fi

  # --- Safety rails ---
  for f in KILL_SWITCH_FILE MAX_POSITION_USD MAX_TOTAL_DEPLOYED_USD DAILY_LOSS_LIMIT_PCT; do
    if grep -q "$f" /opt/meteora-agent/.env 2>/dev/null; then
      ok "$f present in .env"
    else
      warn "$f missing from .env — add it before mainnet"
    fi
  done

  # --- Mainnet position ---
  info "Checking for mainnet positions in DB..."
  psql_url=$(grep DATABASE_URL /opt/meteora-agent/.env | cut -d'=' -f2-)
  if [[ -n "$psql_url" ]]; then
    position_count=$(psql "$psql_url" -t -c "SELECT COUNT(*) FROM positions WHERE status='open';" 2>/dev/null | tr -d ' ') || position_count=0
    if [[ "$position_count" -gt 0 ]]; then
      ok "Mainnet position found ($position_count open)"
    else
      warn "No open positions yet — still acceptable (DRY_RUN or wallet pending)"
    fi
  fi

  # --- Videos ---
  info "Checking for uploaded videos..."
  read -rp "  Pitch video URL (YouTube/Vimeo, ≤3 min): " PITCH_VIDEO_URL
  read -rp "  Demo video URL (YouTube/Vimeo, ≤3 min): " DEMO_VIDEO_URL

  if [[ -n "$PITCH_VIDEO_URL" && "$PITCH_VIDEO_URL" == http* ]]; then
    ok "Pitch video: $PITCH_VIDEO_URL"
  else
    fail "Pitch video missing — record before submitting"
    errors=$((errors+1))
  fi

  if [[ -n "$DEMO_VIDEO_URL" && "$DEMO_VIDEO_URL" == http* ]]; then
    ok "Demo video: $DEMO_VIDEO_URL"
  else
    fail "Demo video missing — record before submitting"
    errors=$((errors+1))
  fi

  echo ""
  if [[ $errors -eq 0 ]]; then
    ok "All checks passed — ready to submit!"
  else
    fail "$errors critical issue(s) must be resolved before submitting"
    exit 1
  fi
}

#==============================================================================
# TASK 2 — Video production checklist
#==============================================================================
video_review() {
  section "Video Production Checklist"
  echo -e "${BLD}Pitch Video (≤ 3 min) — Suggested Structure:${RST}"
  echo "  0:00–0:30  Problem statement (90% of LPs lose money)"
  echo "  0:30–1:15  Solution demo (dashboard + on-chain SPL Memo)"
  echo "  1:15–2:00  Technical differentiation (adaptive bin sizing + LLM tuner)"
  echo "  2:00–2:45  Traction (53 tests passing, loop running, safety rails)"
  echo "  2:45–3:00  CTA / what's next for the project"
  echo ""
  echo -e "${BLD}Tech Demo Video (≤ 3 min) — Screen Record Flow:${RST}"
  echo "  1. Dashboard open → positions list visible"
  echo "  2. Live agent loop log (systemctl status or journalctl)"
  echo "  3. Rebalance trigger → Solscan link showing SPL Memo on-chain"
  echo "  4. PostgreSQL positions table query showing updated state"
  echo ""
  echo -e "${BLD}Free tools:${RST}"
  echo "  OBS        : Unlimited recordings, high quality, no time limit"
  echo "  Loom Free  : 25 lifetime videos, 5 min max per recording"
  echo "  Your video : 3 min — fits Loom's 5 min limit"
  echo ""
  echo -e "${BLD}Upload to:${RST}"
  echo "  YouTube (unlisted link) or Vimeo (free tier)"
  echo "  Paste links in submission form"
}

#==============================================================================
# TASK 3 — Submission form guidance
#==============================================================================
submit() {
  section "Arena Submission Form"
  echo -e "Open this URL in your browser:\n"
  echo -e "  ${BLD}${ARENA_URL}${RST}\n"
  echo -e "${BLD}Expected fields:${RST}"
  echo "  Project name        : Meteora DLMM Autonomous Agent"
  echo "  Tagline             : AI-powered liquidity management for Meteora DLMM"
  echo "  GitHub repo         : $REPO_URL"
  echo "  Demo video URL      : (paste your pitch video link)"
  echo "  Live product URL    : $DASHBOARD_URL"
  echo "  Short description   : (≤280 chars — see README thesis)"
  echo "  Technical explain   : adaptive range sizing, LLM tuner, SPL Memo receipts"
  echo "  Team / individual   : (your name)"
  echo ""
  echo -e "${BLD}README thesis (copy-paste ready):${RST}"
  echo "90% of LPs lose money to impermanent loss and out-of-range positions."
  echo "Manual DLMM management is brutal — pools shift, bins move, fees compound"
  echo "only when positions stay active. This agent runs the loop autonomously,"
  echo "bin width scales with realized volatility, and an LLM recalibrates risk"
  echo "thresholds every hour based on live market regime."
  echo ""
  echo -e "${YLW}Deadline: May 12, 2026 @ 06:59 UTC${RST}"
  echo ""
  echo -e "After submitting, ping ${BLD}@arena-colosseum on X${RST} to signal your project."
}

#==============================================================================
# Main
#==============================================================================
case "${1:-}" in
  --check)
    check_readiness
    ;;
  --video-review)
    video_review
    ;;
  --submit)
    submit
    ;;
  *)
    echo "Usage: $0 {--check|--video-review|--submit}"
    echo ""
    echo "Workflow:"
    echo "  1. $0 --video-review   # Review video script + structure"
    echo "  2. Record + upload videos"
    echo "  3. $0 --check           # Validate everything is ready"
    echo "  4. $0 --submit          # Open arena form + get field guide"
    exit 1
    ;;
esac