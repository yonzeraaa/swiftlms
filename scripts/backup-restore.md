# SwiftLMS — Restore Guide

Backups are stored in Cloudflare R2 under `swiftlms-backups/<YYYYMMDD_HHMMSS>/`.

## 1. List available backups

```bash
aws s3 ls s3://swiftlms-backups/ --endpoint-url $R2_ENDPOINT --profile r2
```

## 2. Download a backup

```bash
DATE=20240101_020000   # replace with target backup date
aws s3 sync s3://swiftlms-backups/$DATE/ /tmp/swiftlms-restore-$DATE/ \
  --endpoint-url $R2_ENDPOINT --profile r2
```

## 3. Restore the database

> **Warning**: This overwrites the target database. Make sure you're pointing to the right DATABASE_URL.

```bash
# Decompress
gunzip /tmp/swiftlms-restore-$DATE/database.sql.gz

# Restore (plain SQL dump)
psql $DATABASE_URL -f /tmp/swiftlms-restore-$DATE/database.sql
```

If the dump was created with `pg_dump --format=custom`, use `pg_restore` instead:
```bash
pg_restore --dbname=$DATABASE_URL /tmp/swiftlms-restore-$DATE/database.sql.gz
```

## 4. Restore Storage files

Files are under `/tmp/swiftlms-restore-$DATE/storage/<bucket>/<path>`.

Upload them back using the Supabase CLI or the dashboard:

```bash
# Example: restore a single file via supabase CLI
supabase storage cp /tmp/swiftlms-restore-$DATE/storage/certificates/file.pdf \
  ss://certificates/file.pdf
```

Or upload them in bulk via Supabase dashboard → Storage.

## 5. Verify

- Check that key tables have data: `SELECT COUNT(*) FROM users;`
- Log in to the app and verify that avatars, certificates, and templates load correctly.

## Retention policy

R2 Lifecycle Rule: objects in `swiftlms-backups/` are deleted after **30 days**.
Configure once in Cloudflare dashboard → R2 → swiftlms-backups → Settings → Lifecycle.
