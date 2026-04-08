#!/usr/bin/env bash

set -euo pipefail

APP_NAME="buzzforge"
APP_DIR="/var/www/buzzforge"
API_PORT="5000"
SERVER_NAME=""
REPO_URL="https://github.com/al-macleod/MacleodBlog"
BRANCH="main"
INSTALL_SYSTEM_DEPS="true"
ENABLE_HTTPS="false"
CERTBOT_EMAIL=""
MONGODB_URI=""
ADMIN_USERNAME="admin@buzzforge.com"
ADMIN_PASSWORD="862110baA"
JWT_SECRET="862110ba862110ba1782"
GOOGLE_CLIENT_ID=""
NON_INTERACTIVE="false"

usage() {
  cat <<'EOF'
Usage:
  bash deploy/deploy-vps.sh --server-name "example.com www.example.com" [options]

Options:
  --server-name <names>      Space-separated server_name value for nginx. Required.
  --repo-url <url>           Git repository URL to clone if the app directory does not exist.
  --branch <name>            Git branch to deploy. Default: main.
  --app-dir <path>           Target directory on the VPS. Default: /var/www/buzzforge.
  --api-port <port>          Backend port for PM2/nginx. Default: 5000.
  --mongo-uri <uri>          MongoDB connection string.
  --admin-username <value>   Admin username for the CMS login.
  --admin-password <value>   Admin password for the CMS login.
  --jwt-secret <value>       JWT signing secret.
  --google-client-id <id>    Optional Google OAuth client ID.
  --https                    Enable HTTPS with certbot.
  --certbot-email <email>    Email address required when --https is used.
  --skip-system              Skip apt/node/nginx/pm2 installation.
  --non-interactive          Fail instead of prompting for missing values.
  --help                     Show this help.

Examples:
  bash deploy/deploy-vps.sh \
    --server-name "blog.example.com www.blog.example.com" \
    --repo-url https://github.com/you/MacleodBlog.git \
    --branch main \
    --https \
    --certbot-email you@example.com

  bash deploy/deploy-vps.sh \
    --server-name "147.93.191.51" \
    --repo-url https://github.com/you/MacleodBlog.git \
    --skip-system
EOF
}

log() {
  printf '[deploy] %s\n' "$1"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

read_env_value() {
  local file_path="$1"
  local key="$2"

  if [[ ! -f "$file_path" ]]; then
    return 0
  fi

  grep -E "^${key}=" "$file_path" | tail -n 1 | cut -d'=' -f2-
}

prompt_if_empty() {
  local var_name="$1"
  local prompt_text="$2"
  local secret="${3:-false}"
  local current_value="${!var_name:-}"

  if [[ -n "$current_value" ]]; then
    return 0
  fi

  if [[ "$NON_INTERACTIVE" == "true" ]]; then
    fail "Missing required value: $var_name"
  fi

  if [[ "$secret" == "true" ]]; then
    read -r -s -p "$prompt_text: " current_value
    printf '\n'
  else
    read -r -p "$prompt_text: " current_value
  fi

  if [[ -z "$current_value" ]]; then
    fail "Value cannot be empty: $var_name"
  fi

  printf -v "$var_name" '%s' "$current_value"
}

ensure_sudo() {
  if [[ "$EUID" -ne 0 ]] && ! command_exists sudo; then
    fail "sudo is required for system setup"
  fi
}

run_root() {
  if [[ "$EUID" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

install_nodejs() {
  if command_exists node; then
    local major_version
    major_version="$(node -p "process.versions.node.split('.')[0]")"
    if [[ "$major_version" -ge 20 ]]; then
      log "Node.js $(node -v) already installed"
      return 0
    fi
  fi

  log "Installing Node.js 20"
  run_root bash -lc 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -'
  run_root apt-get install -y nodejs
}

install_system_dependencies() {
  log "Installing system dependencies"
  run_root apt-get update
  run_root apt-get install -y nginx git curl ca-certificates gnupg
  install_nodejs

  if ! command_exists pm2; then
    log "Installing PM2"
    run_root npm install -g pm2
  fi
}

ensure_repo() {
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Using existing repository in $APP_DIR"
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
    return 0
  fi

  [[ -n "$REPO_URL" ]] || fail "--repo-url is required when $APP_DIR does not already contain the repo"

  log "Cloning repository into $APP_DIR"
  run_root mkdir -p "$APP_DIR"
  run_root chown -R "$USER":"$USER" "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
}

write_backend_env() {
  local backend_dir="$APP_DIR/backend"
  local env_path="$backend_dir/.env"
  local scheme="http"

  if [[ "$ENABLE_HTTPS" == "true" ]]; then
    scheme="https"
  fi

  MONGODB_URI="${MONGODB_URI:-$(read_env_value "$env_path" 'MONGODB_URI')}"
  ADMIN_USERNAME="${ADMIN_USERNAME:-$(read_env_value "$env_path" 'ADMIN_USERNAME')}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(read_env_value "$env_path" 'ADMIN_PASSWORD')}"
  JWT_SECRET="${JWT_SECRET:-$(read_env_value "$env_path" 'JWT_SECRET')}"
  GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-$(read_env_value "$env_path" 'GOOGLE_CLIENT_ID')}"

  prompt_if_empty MONGODB_URI "MongoDB URI"
  prompt_if_empty ADMIN_USERNAME "Admin username"
  prompt_if_empty ADMIN_PASSWORD "Admin password" true
  prompt_if_empty JWT_SECRET "JWT secret" true

  log "Writing backend environment file"
  cat > "$env_path" <<EOF
PORT=$API_PORT
NODE_ENV=production
MONGODB_URI=$MONGODB_URI
CORS_ORIGIN=$scheme://${SERVER_NAME%% *}
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD
JWT_SECRET=$JWT_SECRET
ADMIN_COOKIE_NAME=buzzforge_admin_token
ADMIN_COOKIE_SAME_SITE=lax
ADMIN_COOKIE_SECURE=true
USER_COOKIE_NAME=buzzforge_user_token
USER_COOKIE_SAME_SITE=lax
USER_COOKIE_SECURE=true
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
RESET_PASSWORD_TOKEN_TTL_MINUTES=30
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
EOF
}

write_frontend_env() {
  local frontend_dir="$APP_DIR/frontend"
  local env_path="$frontend_dir/.env.production"

  log "Writing frontend production environment file"
  cat > "$env_path" <<EOF
REACT_APP_API_URL=/api
REACT_APP_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
EOF
}

install_dependencies_and_build() {
  log "Installing backend dependencies"
  if [[ -f "$APP_DIR/backend/package-lock.json" ]]; then
    npm --prefix "$APP_DIR/backend" ci
  else
    npm --prefix "$APP_DIR/backend" install
  fi

  log "Installing frontend dependencies"
  if [[ -f "$APP_DIR/frontend/package-lock.json" ]]; then
    npm --prefix "$APP_DIR/frontend" ci
  else
    npm --prefix "$APP_DIR/frontend" install
  fi

  log "Building frontend"
  npm --prefix "$APP_DIR/frontend" run build
}

configure_pm2() {
  log "Starting backend with PM2"
  if pm2 describe buzzforge-api >/dev/null 2>&1; then
    pm2 reload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
  else
    pm2 start "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
  fi

  pm2 save
  run_root env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME"
}

write_nginx_config() {
  local site_path="/etc/nginx/sites-available/$APP_NAME"

  log "Writing nginx site configuration"
  run_root tee "$site_path" >/dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    root $APP_DIR/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:$API_PORT/uploads/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF

  run_root ln -sfn "$site_path" "/etc/nginx/sites-enabled/$APP_NAME"
  run_root rm -f /etc/nginx/sites-enabled/default
  run_root nginx -t
  run_root systemctl enable --now nginx
  run_root systemctl reload nginx
}

configure_https() {
  [[ "$ENABLE_HTTPS" == "true" ]] || return 0
  [[ -n "$CERTBOT_EMAIL" ]] || fail "--certbot-email is required with --https"

  log "Installing certbot"
  run_root apt-get install -y certbot python3-certbot-nginx

  local -a domain_parts=()
  local domain
  read -r -a domain_parts <<< "$SERVER_NAME"

  local -a certbot_args=()
  for domain in "${domain_parts[@]}"; do
    certbot_args+=( -d "$domain" )
  done

  log "Requesting TLS certificate"
  run_root certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" "${certbot_args[@]}"
}

show_summary() {
  local primary_name
  primary_name="${SERVER_NAME%% *}"

  printf '\n'
  log "Deployment complete"
  printf 'App directory: %s\n' "$APP_DIR"
  printf 'Public URL: http%s://%s\n' "$( [[ "$ENABLE_HTTPS" == "true" ]] && printf 's' || printf '' )" "$primary_name"
  printf 'Health check: http://127.0.0.1:%s/api/health\n' "$API_PORT"
  printf 'PM2 status: pm2 status\n'
  printf 'PM2 logs: pm2 logs buzzforge-api\n'
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --server-name)
        SERVER_NAME="$2"
        shift 2
        ;;
      --repo-url)
        REPO_URL="$2"
        shift 2
        ;;
      --branch)
        BRANCH="$2"
        shift 2
        ;;
      --app-dir)
        APP_DIR="$2"
        shift 2
        ;;
      --api-port)
        API_PORT="$2"
        shift 2
        ;;
      --mongo-uri)
        MONGODB_URI="$2"
        shift 2
        ;;
      --admin-username)
        ADMIN_USERNAME="$2"
        shift 2
        ;;
      --admin-password)
        ADMIN_PASSWORD="$2"
        shift 2
        ;;
      --jwt-secret)
        JWT_SECRET="$2"
        shift 2
        ;;
      --google-client-id)
        GOOGLE_CLIENT_ID="$2"
        shift 2
        ;;
      --https)
        ENABLE_HTTPS="true"
        shift
        ;;
      --certbot-email)
        CERTBOT_EMAIL="$2"
        shift 2
        ;;
      --skip-system)
        INSTALL_SYSTEM_DEPS="false"
        shift
        ;;
      --non-interactive)
        NON_INTERACTIVE="true"
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        fail "Unknown argument: $1"
        ;;
    esac
  done
}

main() {
  parse_args "$@"

  [[ -n "$SERVER_NAME" ]] || {
    usage
    fail "--server-name is required"
  }

  ensure_sudo

  if [[ "$INSTALL_SYSTEM_DEPS" == "true" ]]; then
    install_system_dependencies
  fi

  ensure_repo
  write_backend_env
  write_frontend_env
  install_dependencies_and_build
  configure_pm2
  write_nginx_config
  configure_https
  show_summary
}

main "$@"