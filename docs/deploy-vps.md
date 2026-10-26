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
sudo install -d -o 1001 -g 1001 -m 0750 /opt/mhaf-live/data
sudo install -d -m 0750 /opt/mhaf-live
sudo install -m 0600 /dev/null /opt/mhaf-live/.env
openssl rand -base64 48
sudoedit /opt/mhaf-live/.env
```

Put a newly generated secret in the env file and replace the placeholder before deployment:

```dotenv
NODE_ENV=production
NEXTAUTH_SECRET=REPLACE_WITH_GENERATED_SECRET
NEXTAUTH_URL=https://meet.naiimbsili.com
NEXT_PUBLIC_APP_URL=https://meet.naiimbsili.com
```

The secret must be unique, at least 32 characters, and not the development fallback. Do not commit the env file or share its contents.

## Deploy

After reviewing and merging the deployment changes into `master`, open **Actions → Deploy MHAF Live → Run workflow**. Normal pushes do not trigger deployment.

The workflow keeps the previous container available until the new container passes its health check, and attempts to restore the previous container if the check fails. The persistent JSON data directory is `/opt/mhaf-live/data`.

## Before public exposure

- The app currently stores data in a local JSON file, not PostgreSQL. Run only one app replica; the in-process lock is not shared between replicas.
- The database currently seeds a host account with a known development password when its data file is empty. Remove or replace this development seed before public exposure, and verify registration/authentication security.
- The session helper contains a development fallback for `NEXTAUTH_SECRET`; always set a strong secret in the production env file.
- This workflow does not edit Caddy. Only after the app is healthy and reviewed, configure the existing Caddy site for `meet.naiimbsili.com` to proxy to `127.0.0.1:18083`.
