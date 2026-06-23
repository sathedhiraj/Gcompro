#!/usr/bin/env bash
# ============================================================================
# G-Ecom EC2 Deployment Fix Script
# ----------------------------------------------------------------------------
# Problem: "Add to Cart" fails with Prisma error:
#   PrismaClientUnknownRequestError: Invalid 'prisma.cartItem.create()'
#   ConnectorError (SQLiteError) extended_code: 8
#
# Root cause: SQLite error code 8 = SQLITE_READONLY
#   "attempt to write a readonly database"
#   The Next.js process can READ the .db file but cannot WRITE to it.
#   This happens because:
#     1. The db/custom.db file (or the db/ folder) is owned by root / the
#        user who ran `git clone`, NOT by the user running the Next.js app.
#     2. SQLite also needs write access to the DIRECTORY (for -journal /
#        -wal / -shm sidecar files).
#     3. DATABASE_URL may still point to the dev path (/home/z/my-project/...)
#        instead of the real EC2 path.
#
# Usage (on the EC2 instance, from the project root, e.g. /G-Ecom):
#   sudo bash deploy-fix.sh
# ============================================================================

set -euo pipefail

# --- Config -----------------------------------------------------------------
# Change APP_DIR if your project is NOT at /G-Ecom on EC2.
APP_DIR="${APP_DIR:-/G-Ecom}"
DB_DIR="$APP_DIR/db"
DB_FILE="$DB_DIR/custom.db"

# Color helpers
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

echo "============================================================"
echo "  G-Ecom EC2 Deployment Fix  (SQLite SQLITE_READONLY fix)"
echo "============================================================"
echo

# --- Step 0: Sanity checks --------------------------------------------------
if [[ "$EUID" -ne 0 ]]; then
  err "Please run this script with sudo:  sudo bash deploy-fix.sh"
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  err "Project directory not found: $APP_DIR"
  err "If your project lives elsewhere, re-run with:  sudo APP_DIR=/path/to/G-Ecom bash deploy-fix.sh"
  exit 1
fi
ok "Project directory found: $APP_DIR"

# --- Step 1: Detect the user that runs the Next.js app ----------------------
# Try common sources: pm2, systemd, or the owner of the running node process.
APP_USER=""
APP_GROUP=""

detect_app_user() {
  # 1) pm2
  if command -v pm2 >/dev/null 2>&1; then
    local pm2_user
    pm2_user=$(pm2 jlist 2>/dev/null | grep -o '"pm_uptime"' >/dev/null 2>&1 && \
      ps -o user= -C PM2 2>/dev/null | head -n1 || true)
    if [[ -n "$pm2_user" ]]; then
      APP_USER="$pm2_user"; APP_GROUP="$(id -gn "$pm2_user")"
      return
    fi
  fi

  # 2) systemd service named g-ecom / gecom / nextjs
  for svc in g-ecom gecom nextjs g_ecom; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      local svc_user
      svc_user=$(systemctl show -pUser --value "$svc" 2>/dev/null | head -n1)
      [[ -z "$svc_user" || "$svc_user" == "" ]] && svc_user=$(systemctl show -pDynamicUser --value "$svc" 2>/dev/null)
      # Fall back to the user actually running the service's main PID
      [[ -z "$svc_user" || "$svc_user" == "no" ]] && svc_user=$(ps -o user= -p "$(systemctl show -p MainPID --value "$svc")" 2>/dev/null | tr -d ' ')
      if [[ -n "$svc_user" ]]; then
        APP_USER="$svc_user"; APP_GROUP="$(id -gn "$svc_user")"
        return
      fi
    fi
  done

  # 3) nginx upstream often runs the node app as www-data or ubuntu
  for cand in ubuntu www-data node nextjs; do
    if id "$cand" >/dev/null 2>&1; then
      APP_USER="$cand"; APP_GROUP="$(id -gn "$cand")"
      warn "Could not auto-detect app user; defaulting to '$APP_USER'."
      warn "If your app runs as a different user, set it manually below and re-run."
      return
    fi
  done

  err "Could not detect the app user. Please set APP_USER manually in this script."
  exit 1
}

detect_app_user
ok "Detected app user/group: $APP_USER / $APP_GROUP"

# --- Step 2: Ensure db/ directory and db file exist -------------------------
mkdir -p "$DB_DIR"
if [[ ! -f "$DB_FILE" ]]; then
  warn "Database file does not exist yet: $DB_FILE"
  warn "It will be created by 'prisma db push' in a later step."
fi

# --- Step 3: Fix ownership & permissions (THE MAIN FIX) ---------------------
# SQLite needs WRITE access to BOTH the .db file AND its parent directory
# (for -journal / -wal / -shm sidecar files).
info "Fixing ownership: chown -R $APP_USER:$APP_GROUP $DB_DIR"
chown -R "$APP_USER:$APP_GROUP" "$DB_DIR"

info "Fixing permissions on directory: chmod 775 $DB_DIR"
chmod 775 "$DB_DIR"

if [[ -f "$DB_FILE" ]]; then
  info "Fixing permissions on db file: chmod 664 $DB_FILE"
  chmod 664 "$DB_FILE"
fi

# Remove stale SQLite lock/journal files that can block writes after a crash
for ext in -journal -wal -shm; do
  if [[ -f "$DB_FILE$ext" ]]; then
    warn "Removing stale SQLite sidecar: $DB_FILE$ext"
    rm -f "$DB_FILE$ext"
  fi
done
ok "Permissions fixed."

# --- Step 4: Fix DATABASE_URL in .env ---------------------------------------
ENV_FILE="$APP_DIR/.env"
touch "$ENV_FILE"
chown "$APP_USER:$APP_GROUP" "$ENV_FILE"
chmod 660 "$ENV_FILE"

CORRECT_URL="file:$DB_FILE"
if grep -q '^DATABASE_URL=' "$ENV_FILE" 2>/dev/null; then
  CURRENT_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
  if [[ "$CURRENT_URL" != "$CORRECT_URL" ]]; then
    info "Updating DATABASE_URL in $ENV_FILE"
    info "  old: $CURRENT_URL"
    info "  new: $CORRECT_URL"
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$CORRECT_URL|" "$ENV_FILE"
  else
    ok "DATABASE_URL already correct."
  fi
else
  info "Adding DATABASE_URL to $ENV_FILE"
  echo "DATABASE_URL=$CORRECT_URL" >> "$ENV_FILE"
fi
ok ".env updated."

# --- Step 5: Make sure schema is pushed to the DB ---------------------------
info "Running 'prisma db push' to ensure schema is up to date..."
cd "$APP_DIR"
# Generate prisma client (needed for standalone build too)
if command -v npx >/dev/null 2>&1; then
  sudo -u "$APP_USER" --preserve-env=DATABASE_URL npx prisma generate || warn "prisma generate failed (may be ok if already generated)"
  sudo -u "$APP_USER" --preserve-env=DATABASE_URL npx prisma db push --accept-data-loss || warn "prisma db push failed"
else
  warn "npx not found; please run 'prisma generate' and 'prisma db push' manually."
fi
ok "Schema pushed."

# --- Step 6: Restart the app ------------------------------------------------
info "Restarting the application..."
RESTARTED=0
for svc in g-ecom gecom nextjs g_ecom; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    systemctl restart "$svc"
    ok "Restarted systemd service: $svc"
    RESTARTED=1
    break
  fi
done
if [[ "$RESTARTED" -eq 0 ]] && command -v pm2 >/dev/null 2>&1; then
  if pm2 jlist >/dev/null 2>&1; then
    # Restart any process whose name contains 'g-ecom', 'gecom', or 'next'
    pm2 restart all >/dev/null 2>&1 || true
    ok "Restarted pm2 processes."
    RESTARTED=1
  fi
fi
if [[ "$RESTARTED" -eq 0 ]]; then
  warn "Could not auto-restart the app."
  warn "Please restart it manually, e.g.:"
  warn "    sudo systemctl restart g-ecom"
  warn "    # or"
  warn "    pm2 restart all"
  warn "    # or"
  warn "    pkill -f 'node server.js' && cd $APP_DIR && npm run start &"
fi

# --- Step 7: Verify ---------------------------------------------------------
echo
echo "============================================================"
echo "  Verification"
echo "============================================================"
info "Current ownership of $DB_DIR:"
ls -ld "$DB_DIR" || true
info "Current ownership of $DB_FILE:"
ls -l "$DB_FILE" 2>/dev/null || true
info "DATABASE_URL:"
grep '^DATABASE_URL=' "$ENV_FILE" || true

echo
ok "Done! Now try 'Add to Cart' again in the browser."
echo
echo "If it STILL fails:"
echo "  1. Check the app logs:    sudo journalctl -u g-ecom -n 50 --no-pager"
echo "     (or:                    pm2 logs --lines 50)"
echo "  2. Confirm the app really runs as '$APP_USER':"
echo "        ps -eo user,pid,cmd | grep -E 'node|next|server.js'"
echo "  3. If the user is different, re-run:"
echo "        sudo APP_DIR=$APP_DIR bash deploy-fix.sh"
echo "     after editing the detect_app_user() function to hard-code APP_USER."
echo "============================================================"
