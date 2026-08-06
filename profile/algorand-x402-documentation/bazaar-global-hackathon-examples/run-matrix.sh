#!/usr/bin/env bash
# =============================================================================
# run-matrix.sh — test every server example against every client example.
#
# Boots each server (port 4021) in turn and runs each client against it with a
# REAL x402 payment ($0.01 TestNet USDC per pair, settled by the facilitator).
#
# Usage:
#   ./run-matrix.sh                                   # full 4x4 matrix
#   ./run-matrix.sh --servers express-server          # subset
#   ./run-matrix.sh --clients fetch-client,httpx-client
#   ./run-matrix.sh -y                                # skip the confirmation
#
# Requirements:
#   - every selected project has its .env (copy .env.example) — servers need a
#     funded AVM_ADDRESS, clients a funded AVM_PRIVATE_KEY
#   - TS projects: `npm install` done; Python projects: deps installed in
#     `<project>/.venv` (preferred) or importable by `python3`
#
# Logs: everything under logs/matrix-<timestamp>/ — per-server logs,
# per-pair client logs, and summary.txt with the final matrix.
# =============================================================================
set -u

EX="$(cd "$(dirname "$0")" && pwd)"
PORT=4021
STAMP="$(date +%Y%m%d-%H%M%S)"
LOGDIR="$EX/logs/matrix-$STAMP"
mkdir -p "$LOGDIR"
SUMMARY="$LOGDIR/summary.txt"

SERVERS="express-server hono-server fastapi-server flask-server"
CLIENTS="fetch-client axios-client httpx-client requests-client"
ASSUME_YES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --servers) SERVERS="$(echo "$2" | tr ',' ' ')"; shift 2 ;;
    --clients) CLIENTS="$(echo "$2" | tr ',' ' ')"; shift 2 ;;
    -y|--yes)  ASSUME_YES=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1 (see --help)"; exit 2 ;;
  esac
done

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$SUMMARY"; }

pybin() { # best python for a project dir
  if [ -x "$1/.venv/bin/python" ]; then echo "$1/.venv/bin/python"; else echo "python3"; fi
}

server_cmd() {
  case "$1" in
    express-server|hono-server) echo "npm start" ;;
    fastapi-server) echo "$(pybin "$EX/$1") -m uvicorn main:app --port $PORT" ;;
    flask-server)   echo "$(pybin "$EX/$1") main.py" ;;
    *) echo "" ;;
  esac
}

client_cmd() {
  case "$1" in
    fetch-client|axios-client) echo "npm start" ;;
    httpx-client|requests-client) echo "$(pybin "$EX/$1") main.py" ;;
    *) echo "" ;;
  esac
}

# ---------------------------------------------------------------- prechecks
FAILED_PRECHECK=0
for p in $SERVERS $CLIENTS; do
  if [ ! -d "$EX/$p" ]; then log "PRECHECK FAIL: unknown project '$p'"; FAILED_PRECHECK=1; continue; fi
  if [ ! -f "$EX/$p/.env" ]; then log "PRECHECK FAIL: $p/.env missing (copy .env.example)"; FAILED_PRECHECK=1; fi
  case "$p" in
    *-server|*-client)
      if [ -f "$EX/$p/package.json" ] && [ ! -d "$EX/$p/node_modules" ]; then
        log "PRECHECK FAIL: $p has no node_modules (run npm install)"; FAILED_PRECHECK=1
      fi
      if [ -f "$EX/$p/requirements.txt" ] && ! "$(pybin "$EX/$p")" -c "import x402" 2>/dev/null; then
        log "PRECHECK FAIL: $p python deps not importable (pip install -r requirements.txt in a venv)"; FAILED_PRECHECK=1
      fi ;;
  esac
done
[ "$FAILED_PRECHECK" = 1 ] && { log "aborting — fix prechecks above"; exit 1; }

N_PAIRS=$(( $(echo $SERVERS | wc -w) * $(echo $CLIENTS | wc -w) ))
log "matrix: [$SERVERS] x [$CLIENTS] = $N_PAIRS pairs"
log "cost: each pair pays \$0.01 in REAL TestNet USDC (total ~\$0.$(printf '%02d' $N_PAIRS))"
if [ "$ASSUME_YES" != 1 ] && [ -t 0 ]; then
  printf "proceed? [y/N] "; read -r ans
  [ "$ans" = "y" ] || [ "$ans" = "Y" ] || { echo "aborted"; exit 0; }
fi

free_port() {
  for pid in $(lsof -ti :$PORT 2>/dev/null); do kill "$pid" 2>/dev/null; done
  sleep 1
}

RESULTS=""
PASS_COUNT=0
FAIL_COUNT=0

for S in $SERVERS; do
  SLOG="$LOGDIR/server-$S.log"
  free_port
  log ""
  log "=== booting $S (log: $SLOG)"
  ( cd "$EX/$S" && exec $(server_cmd "$S") ) > "$SLOG" 2>&1 &
  SPID=$!

  UP=""
  i=0
  while [ $i -lt 40 ]; do
    sleep 0.5; i=$((i+1))
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/my-api" 2>/dev/null)
    [ "$CODE" = "402" ] && { UP=1; break; }
  done
  if [ -z "$UP" ]; then
    log "=== $S FAILED TO BOOT (last http code: ${CODE:-none}) — tail of $SLOG:"
    tail -8 "$SLOG" | tee -a "$SUMMARY"
    kill "$SPID" 2>/dev/null; free_port
    for C in $CLIENTS; do RESULTS="$RESULTS\n$S <- $C : SKIP (server down)"; FAIL_COUNT=$((FAIL_COUNT+1)); done
    continue
  fi
  log "=== $S up — 402 confirmed after $((i / 2))s"

  for C in $CLIENTS; do
    CLOG="$LOGDIR/pair-$S-$C.log"
    log "--- $S <- $C (log: $CLOG)"
    ( cd "$EX/$C" && exec $(client_cmd "$C") ) > "$CLOG" 2>&1 &
    CPID=$!
    waited=0
    while kill -0 "$CPID" 2>/dev/null && [ $waited -lt 120 ]; do sleep 1; waited=$((waited+1)); done
    if kill -0 "$CPID" 2>/dev/null; then
      kill "$CPID" 2>/dev/null
      log "    TIMEOUT after 120s"
      RESULTS="$RESULTS\n$S <- $C : TIMEOUT"; FAIL_COUNT=$((FAIL_COUNT+1))
      continue
    fi
    wait "$CPID" 2>/dev/null
    TXN=$(grep -oE "txn id: [A-Z2-7]+" "$CLOG" | head -1 | sed 's/txn id: //')
    if [ -n "$TXN" ]; then
      log "    PASS in ${waited}s — txn $TXN"
      RESULTS="$RESULTS\n$S <- $C : PASS  $TXN"; PASS_COUNT=$((PASS_COUNT+1))
    else
      log "    FAIL — tail of $CLOG:"
      tail -6 "$CLOG" | sed 's/^/    | /' | tee -a "$SUMMARY"
      RESULTS="$RESULTS\n$S <- $C : FAIL"; FAIL_COUNT=$((FAIL_COUNT+1))
    fi
  done

  kill "$SPID" 2>/dev/null
  free_port
  log "=== $S stopped"
done

log ""
log "==================== MATRIX SUMMARY ===================="
printf "$RESULTS\n" | sed '/^$/d' | tee -a "$SUMMARY"
log "========================================================"
log "pass: $PASS_COUNT / $N_PAIRS   (full logs: $LOGDIR)"
[ "$FAIL_COUNT" = 0 ] || exit 1
