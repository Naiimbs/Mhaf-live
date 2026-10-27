# MHAF Live — Backup, Restore, and Disaster Recovery Runbook

This document defines the operational procedures for backing up and restoring MHAF Live application data and PostgreSQL databases on the production Debian VPS (`146.59.226.213`).

> [!WARNING]
> **Production Safety Rule**
> Never run restore commands directly against a live production database or active data directory without first verifying the backup archive in an isolated staging environment and confirming an active maintenance window.

---

## 1. Storage Architecture Overview

MHAF Live currently maintains two persistent storage layers on the VPS:

1. **File-Based JSON Application Storage (`/opt/mhaf-live/data`)**
   - **Contents**: `mhaf_live_db.json` (users, sessions, event types, availability schedules, bookings, and linked/manual/instant meetings) and `demo_requests_fallback.json` (un-synced demo inquiries staged during database outages).
   - **Permissions**: Owned by host user UID `1001` (Node.js container user `nextjs`), directory permissions `0750`.
   - **Concurrency Model**: Single container process with in-memory mutex write serialization and atomic `.tmp` file renames.

2. **PostgreSQL Relational Storage (`/opt/mhaf-live/postgres-data`)**
   - **Contents**: PostgreSQL 16 data cluster (`mhaf-db` container).
   - **Container Networking**: Strictly isolated on internal Docker network `mhaf-network`. No public host port exposure.
   - **Permissions**: UID `70`, GID `70` (`postgres` user in `postgres:16-alpine`), directory permissions `0700`.

---

## 2. Backup Procedures

### A. JSON Application Data Backup (Daily / Pre-Deployment)

To create an atomic, timestamped archive of the file-based database:

```bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/mhaf-live/backups
sudo install -d -m 0700 "$BACKUP_DIR"

# Create compressed tarball of the data directory
sudo tar -czf "${BACKUP_DIR}/mhaf_data_${BACKUP_DATE}.tar.gz" -C /opt/mhaf-live data

# Restrict permissions strictly to root
sudo chmod 0600 "${BACKUP_DIR}/mhaf_data_${BACKUP_DATE}.tar.gz"

# Verify archive integrity
sudo tar -tzf "${BACKUP_DIR}/mhaf_data_${BACKUP_DATE}.tar.gz"
```

### B. PostgreSQL Database Backup (`pg_dump`)

To dump the PostgreSQL database consistently without stopping the container:

```bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/mhaf-live/backups
sudo install -d -m 0700 "$BACKUP_DIR"

# Source environment variables to extract credentials safely without printing them
POSTGRES_USER=$(sudo sed -n 's/^POSTGRES_USER=//p' /opt/mhaf-live/.env | tail -n 1 | tr -d '"\047[:space:]\r')
POSTGRES_DB=$(sudo sed -n 's/^POSTGRES_DB=//p' /opt/mhaf-live/.env | tail -n 1 | tr -d '"\047[:space:]\r')
POSTGRES_USER=${POSTGRES_USER:-mhaf_app}
POSTGRES_DB=${POSTGRES_DB:-mhaf_live}

# Execute pg_dump inside the isolated container
docker exec mhaf-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --format=c \
  > "${BACKUP_DIR}/mhaf_postgres_${BACKUP_DATE}.dump"

# Secure dump file permissions
sudo chmod 0600 "${BACKUP_DIR}/mhaf_postgres_${BACKUP_DATE}.dump"

# Verify dump file is non-empty
test -s "${BACKUP_DIR}/mhaf_postgres_${BACKUP_DATE}.dump" || { echo "Backup failed!"; exit 1; }
```

### C. Backup Retention and Offsite Transfer

- **Local Retention**: Retain the last 14 daily archives in `/opt/mhaf-live/backups/`.
- **Automated Pruning**:
  ```bash
  find /opt/mhaf-live/backups/ -type f -name "mhaf_*" -mtime +14 -delete
  ```
- **Offsite Encryption**: Daily archives should be encrypted with GPG/Age before offsite sync to S3 or an isolated cold-storage server.

---

## 3. Restore Procedures

### A. Restoring File-Based JSON Data

> [!CAUTION]
> Restoring `/opt/mhaf-live/data` will overwrite current live booking and user state. Stop the application container before restoring to prevent concurrent write collisions.

1. **Stop Application Container**:
   ```bash
   docker stop mhaf-live
   ```

2. **Stage Pre-Restore Safety Snapshot**:
   ```bash
   sudo cp -r /opt/mhaf-live/data /opt/mhaf-live/data_pre_restore_backup
   ```

3. **Extract Desired Archive**:
   ```bash
   sudo tar -xzf /opt/mhaf-live/backups/mhaf_data_YYYYMMDD_HHMMSS.tar.gz -C /opt/mhaf-live
   ```

4. **Verify Ownership and File Permissions**:
   ```bash
   sudo chown -R 1001:1001 /opt/mhaf-live/data
   sudo chmod -R 0750 /opt/mhaf-live/data
   ```

5. **Restart Container & Validate Health**:
   ```bash
   docker start mhaf-live
   docker inspect --format '{{.State.Health.Status}}' mhaf-live
   ```

---

### B. Restoring PostgreSQL Database

> [!CAUTION]
> Restoring a database using `--clean` will drop and recreate existing tables. Ensure you have captured a pre-restore dump first.

1. **Take Pre-Restore Dump**:
   ```bash
   docker exec mhaf-db pg_dump -U mhaf_app -d mhaf_live --format=c > /opt/mhaf-live/backups/pre_restore_safety.dump
   ```

2. **Restore Archive via `pg_restore`**:
   ```bash
   # Stream compressed dump into pg_restore inside container
   docker exec -i mhaf-db pg_restore -U mhaf_app -d mhaf_live --clean --if-exists < /opt/mhaf-live/backups/mhaf_postgres_YYYYMMDD_HHMMSS.dump
   ```

3. **Verify Table Row Counts**:
   ```bash
   docker exec mhaf-db psql -U mhaf_app -d mhaf_live -c "SELECT count(*) FROM \"DemoRequest\";"
   ```

---

## 4. Staging Restore Validation Procedure

Before executing any production restore, follow this non-disruptive validation workflow:

1. Launch an isolated temporary PostgreSQL test container on the VPS:
   ```bash
   docker run -d --name mhaf-db-verify --network mhaf-network \
     -e POSTGRES_DB=verify_db \
     -e POSTGRES_USER=verify_user \
     -e POSTGRES_PASSWORD=verify_pass \
     postgres:16-alpine
   ```

2. Wait for `pg_isready`:
   ```bash
   docker exec mhaf-db-verify pg_isready -U verify_user -d verify_db
   ```

3. Attempt restoration into `mhaf-db-verify`:
   ```bash
   docker exec -i mhaf-db-verify pg_restore -U verify_user -d verify_db < /opt/mhaf-live/backups/mhaf_postgres_YYYYMMDD_HHMMSS.dump
   ```

4. Inspect schema integrity and data row counts:
   ```bash
   docker exec mhaf-db-verify psql -U verify_user -d verify_db -c "\dt"
   docker exec mhaf-db-verify psql -U verify_user -d verify_db -c "SELECT count(*) FROM \"DemoRequest\";"
   ```

5. Cleanup verification container:
   ```bash
   docker rm -f mhaf-db-verify
   ```

---

## 5. Fallback Leads Synchronization & Reconciliation

If PostgreSQL experiences downtime, incoming demo inquiries submitted via `/api/demo-request` automatically fail over to `/app/data/demo_requests_fallback.json` without failing the user experience.

### Safe CLI Synchronization

Once PostgreSQL is healthy, synchronize staged leads using the operator CLI script:

```bash
docker exec mhaf-live npm run sync:leads
```

### Architectural Limitation & Security Rationale

- **No Unauthenticated HTTP Route**: Exposing an HTTP endpoint (e.g. `/api/admin/sync-leads`) without strong authentication was explicitly rejected to eliminate unauthenticated denial-of-service or repeated execution risks.
- **Current Authentication State**: The application currently implements host-level authentication for scheduling (`requireHostAuth`), but does not yet implement an enterprise Admin Role-Based Access Control (RBAC) portal.
- **Recommended Phase 3 Follow-up**: When the enterprise Admin dashboard is built in Phase 3, an authenticated route (`/api/admin/demo-requests/reconcile`) protected by `requireAdminAuth` can be added to provide single-click UI synchronization.
