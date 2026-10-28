# MHAF Live — Manual VPS deployment

The manual workflow builds the Docker image on GitHub Actions, publishes it to GitHub Container Registry (GHCR), and deploys it over SSH. The app binds to `127.0.0.1:18083`. The workflow does not edit Caddy or restart unrelated services.

## GitHub Actions secrets

Configure these in **Settings → Secrets and variables → Actions**:

- `VPS_HOST`: VPS IP or hostname.
- `VPS_USER`: SSH account allowed to run Docker and access `/opt/mhaf-live`.
- `VPS_SSH_KEY`: private SSH key for that account; never commit or paste it into chat.
- `VPS_KNOWN_HOSTS`: verified SSH host-key line(s) for the VPS. Verify the fingerprint independently before adding it.
- `GHCR_PULL_USERNAME`: GitHub username for the package-read token.
- `GHCR_PULL_TOKEN`: least-privilege token with read-only access to the private GHCR package.
- `VPS_PORT`: optional SSH port; defaults to 22.

The repository workflow uses `GITHUB_TOKEN` to publish the image. Ensure the repository's Actions settings permit package write access and that the GHCR package is visible to the intended account.

## One-time VPS preparation

Run on the VPS, using an account with appropriate permissions:

```bash
# 1. Base directory & application file storage (Node.js user uid 1001)
sudo install -d -m 0750 /opt/mhaf-live
sudo install -d -o 1001 -g 1001 -m 0750 /opt/mhaf-live/data

# 2. PostgreSQL persistent volume provisioning (UID/GID 70 for postgres:16-alpine)
# Verification: The official postgres:16-alpine image runs as uid 70, gid 70.
# You can verify this independently with: docker run --rm postgres:16-alpine id -u postgres
# Fresh directory creation:
sudo install -d -o 70 -g 70 -m 0700 /opt/mhaf-live/postgres-data

# If /opt/mhaf-live/postgres-data already exists, inspect first before modifying permissions:
# sudo ls -la /opt/mhaf-live/postgres-data
# stat -c '%u:%g %a %n' /opt/mhaf-live/postgres-data
# DO NOT recursively chown if non-empty unless confirmed to be an existing PostgreSQL data cluster.
# If empty:
# sudo chown 70:70 /opt/mhaf-live/postgres-data && sudo chmod 0700 /opt/mhaf-live/postgres-data

# 3. Dedicated internal Docker network for database isolation
docker network inspect mhaf-network >/dev/null 2>&1 || docker network create mhaf-network

# 4. Production environment configuration
sudo install -m 0600 /dev/null /opt/mhaf-live/.env
openssl rand -base64 48 # For NEXTAUTH_SECRET
openssl rand -base64 32 # For POSTGRES_PASSWORD
sudoedit /opt/mhaf-live/.env
```

Configure the environment file with strong, uniquely generated secrets:

```dotenv
NODE_ENV=production
NEXTAUTH_SECRET=REPLACE_WITH_GENERATED_48_CHAR_SECRET
NEXTAUTH_URL=https://meet.naiimbsili.com
NEXT_PUBLIC_APP_URL=https://meet.naiimbsili.com

# PostgreSQL Database Configuration (Private internal network mhaf-network)
POSTGRES_DB=mhaf_live
POSTGRES_USER=mhaf_app
POSTGRES_PASSWORD=REPLACE_WITH_GENERATED_32_CHAR_PASSWORD
DATABASE_URL=postgresql://mhaf_app:REPLACE_WITH_GENERATED_32_CHAR_PASSWORD@mhaf-db:5432/mhaf_live?schema=public

# SMTP confirmation email (store credentials only in this server-side env file)
SMTP_HOST=REPLACE_WITH_SMTP_HOST
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=REPLACE_WITH_SMTP_USERNAME
SMTP_PASS=REPLACE_WITH_NEW_SMTP_PASSWORD
EMAIL_FROM="meet <notifications@your-verified-domain.example>"
```

The secrets must be unique and non-placeholder. The `DATABASE_URL` must point to internal host `mhaf-db:5432` on `mhaf-network`. Never commit or share the env file. The confirmation mailer requires `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`; it does not have a built-in credential fallback. Configure a valid sender address and keep normal TLS certificate validation enabled.

If an SMTP credential was ever committed to Git, removing it from the current source is not sufficient: revoke/rotate it with the mail provider before release, and do not reuse the old value.


## Deploy

After reviewing and merging the deployment changes into `master`, open **Actions → Deploy MHAF Live → Run workflow**. Normal pushes do not trigger deployment.

The workflow keeps the previous container available until the new container passes its health check, and attempts to restore the previous container if the check fails. The persistent JSON data directory is `/opt/mhaf-live/data`.

## Before public exposure

- The app currently stores data in a local JSON file, not PostgreSQL. Run only one app replica; the in-process lock is not shared between replicas.
- The database currently seeds a host account with a known development password when its data file is empty. Remove or replace this development seed before public exposure, and verify registration/authentication security.
- The session helper contains a development fallback for `NEXTAUTH_SECRET`; always set a strong secret in the production env file.
- The Demo Request endpoint uses an in-process sliding-window rate limiter (10 requests/15m per IP, 3 requests/15m per email).
- **Reverse Proxy, Network Boundaries & Client IP Trust:**
  1. **Traffic Boundaries:** Public internet traffic reaches the application strictly through Caddy (ports 80/443). The application container publishes port 3000 solely to `127.0.0.1:18083` on the VPS host, preventing direct public access to port 3000. Note: Other containers attached to `mhaf-network` or `proxy` can reach `mhaf-live:3000` internally across the Docker bridge.
  2. **Authoritative `X-Forwarded-For` Evaluation:** The application uses `extractClientIp` (`getClientIp`) to read `X-Forwarded-For` from right to left, selecting the rightmost syntactically valid IP. In Caddy reverse-proxy deployments, Caddy automatically appends the incoming TCP client address to the rightmost position in `X-Forwarded-For`, guaranteeing that client-injected prefixes on the left cannot bypass rate limits.
  3. **No Silent `X-Real-IP` Trust:** Because default Caddy does not overwrite `X-Real-IP`, the application does NOT silently trust `X-Real-IP` when `X-Forwarded-For` is absent, preventing client spoofing. `X-Real-IP` is evaluated only if explicitly enabled via `TRUST_X_REAL_IP="true"` when Caddy is verified to overwrite it (`header_up X-Real-IP {remote_host}`).
  4. **Fallback:** If all forwarding headers are missing or malformed, the application safely falls back to `"127.0.0.1"`, grouping requests into a monitored rate-limit bucket rather than allowing unmetered abuse.
- **Caddy Reverse Proxy Configuration:**
  ```caddy
  meet.naiimbsili.com {
      reverse_proxy mhaf-live:3000 {
          header_up X-Real-IP {remote_host}
      }
  }
  ```
- **Network Prerequisites:** The Docker network `proxy` (used by Caddy) and `mhaf-network` (used by PostgreSQL and MHAF Live) must both exist on the VPS. Deployment preflight strictly verifies both networks and will fail before stopping or replacing the active container if either network is missing.
- This workflow does not edit Caddy or connect to the production VPS directly. Only after the app is healthy and reviewed, ensure the Caddy site configuration is in place.
