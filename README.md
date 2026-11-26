# Machine Fault Reporting and Maintenance Response System

## Contributors

- [kyrina-26](https://github.com/kyrina-26)
- [Ruthall21](https://github.com/Ruthall21)
- [mcfarlaneuwi](https://github.com/mcfarlaneuwi)
- [Adri1290](https://github.com/Adri1290)
- [Tywayne-Williams](https://github.com/Tywayne-Williams)
- [Elisha-Todd](https://github.com/Elisha-Todd)

## Overview

The Machine Fault Reporting and Maintenance Response System helps Production and Maintenance teams coordinate machine fault reports and repair work. It provides a shared workflow for submitting faults, reviewing and assigning work, recording maintenance actions, and following reports through to resolution.

## Features

- **Role-based accounts and sign-in** — Users sign in with accounts managed by an administrator. Production staff, maintenance staff, technicians, and administrators see the tools relevant to their work.
- **Machine fault reporting** — Production users identify a machine, describe the fault, and submit a report. Machine identifiers can be entered or scanned from a QR code.
- **Photo, audio, and video evidence** — Reports can include media attachments to help explain the fault.
- **Notifications** — New reports and maintenance updates appear in the maintenance inbox; reporters receive status-change notifications in their inbox. Users can review and mark notifications as read.
- **Technician assignment** — Maintenance staff can assign reported faults to currently signed-in technicians and review reports awaiting assignment.
- **Technician work tracking** — Technicians can review assigned faults, update report status, and record inspection or repair actions.
- **Production report tracking** — Production users can view their submitted reports, search and filter them, and check status, technician assignment, maintenance updates, and attached evidence.
- **Fault history and search** — Staff can search historical reports using machine, status, technician, and date filters, and open report details.
- **Machine management** — Administrators can register machines, update their details and status, search and filter active machines, and decommission machines while preserving their fault history.
- **User management** — Administrators can register users, assign roles, update account details, and search and filter accounts. Deleting an account permanently disables sign-in while preserving its report history.
- **Persistent records and scheduled backups** — Production data is stored in MySQL, uploaded evidence is stored separately, and an optional service creates scheduled backup sets.

## Production deployment

The production deployment uses Docker Compose. Nginx serves the web application and routes `/api/` requests to the application service. MySQL and the application service stay on internal Docker networks; only the web service needs to be reachable by users.

### Requirements

- A Linux host with Docker Engine and the Docker Compose plugin.
- An existing Docker network shared with your chosen reverse proxy. Its name is configured with `REVERSE_PROXY_NETWORK` in `.env`.
- A domain name and HTTPS certificate configured at the reverse proxy for internet-facing use.

### Configure and start

1. Clone this repository onto the deployment host and change into the project directory.
2. Copy `.env.example` to `.env` and set every value. Use unique, strong passwords and keep `.env` private. The bootstrap administrator password must be at least 12 characters. The initial administrator is created only if that username does not already exist.

   | Variable | Purpose |
   | --- | --- |
   | `MYSQL_IMAGE` | MySQL image tag, for example `mysql:8.4`. |
   | `API_IMAGE` | Name and tag to use for the application image, for example `machine-fault-api:1.0.0`. |
   | `MYSQL_DATABASE` | Database name. |
   | `MYSQL_USER`, `MYSQL_PASSWORD` | Application database user and password. |
   | `MYSQL_ROOT_PASSWORD` | MySQL root password, used by the database and restore operation. |
   | `API_CONTAINER_PORT` | Port used by the application service, normally `8080`. |
   | `APP_UPLOAD_DIR` | Container directory for uploaded evidence, normally `/app/uploads`. |
   | `APP_MAX_FILE_SIZE` | Maximum upload size, such as `25MB`. |
   | `APP_BOOTSTRAP_ADMIN_USERNAME`, `APP_BOOTSTRAP_ADMIN_PASSWORD` | Initial administrator login. |
   | `APP_BOOTSTRAP_ADMIN_NAME`, `APP_BOOTSTRAP_ADMIN_EMAIL` | Name and email for the initial administrator. |
   | `APP_ALLOWED_ORIGINS` | Public application origin allowed by the API, such as `https://faults.example.com`. |
   | `REVERSE_PROXY_NETWORK` | Name of the existing Docker network shared with your reverse proxy, for example `nginx_proxy` or `proxy`. |
   | `BACKUP_TZ` | Time zone used to schedule backups, for example `America/New_York`. |
   | `BACKUP_HOST_DIR` | Host directory where backup sets will be stored, for example `/srv/machine-fault/backups`. |

3. Ensure the Docker network named by `REVERSE_PROXY_NETWORK` exists and that your reverse proxy is connected to it. If needed, create it with `docker network create <network-name>` (using the same name as `.env`).
4. Create the host backup directory if scheduled backups are enabled, then restrict access to it and the `.env` file.
5. Start the application stack:

   ```sh
   docker compose up -d --build
   ```

   Compose builds the application image from `backend/` using the value of `API_IMAGE`. The web service is bound to `127.0.0.1:8080` on the host for local access, and exposes port 80 to the configured reverse proxy network.

6. Configure your reverse proxy to forward the application domain to `machine-fault-frontend` on port `80`. Enable HTTPS at the proxy. The proxy and frontend must share the network named by `REVERSE_PROXY_NETWORK`. Do not publish the API or database ports to the public network.
7. Open the configured domain and sign in with the bootstrap administrator account. Create individual accounts and assign roles for other users.
8. Check service health and logs when diagnosing startup problems:

   ```sh
   docker compose ps
   docker compose logs -f frontend api mysql
   ```

### Updates and operations

Pull or check out the desired code version, then rebuild and recreate services:

```sh
docker compose up -d --build
```

Back up the database and uploaded files before upgrades or host maintenance. Docker named volumes `machine_fault_mysql_data` and `machine_fault_uploads` hold persistent application data; removing them deletes that data. Backups are separate from these volumes.

### Scheduled backups and restore

The scheduled backup service is defined in `compose.backup.yaml` and is opt-in. It creates a database dump, an archive of uploaded files, checksums, and a completion marker each day at 03:15 in `BACKUP_TZ`. Successful backup sets older than 30 days are pruned.

Start the normal services and the backup scheduler with:

```sh
docker compose -f compose.yaml -f compose.backup.yaml --profile backup up -d --build
```

Review backup activity with:

```sh
docker compose -f compose.yaml -f compose.backup.yaml logs -f backup
```

To restore, first stop the application service so it cannot write data during restoration:

```sh
docker compose stop api
```

Set `RESTORE_SET` in `.env` to the backup directory name (for example, `backup-20261126T081500Z`) and set `ALLOW_DESTRUCTIVE_RESTORE=YES`. Then run:

```sh
docker compose -f compose.yaml -f compose.backup.yaml --profile restore run --rm restore
```

The restore replaces the current database and uploaded files. After it completes, reset `ALLOW_DESTRUCTIVE_RESTORE=NO`, start the application, and verify sign-in, reports, and attachments:

```sh
docker compose up -d
```

## Local development

For local development, use the same environment configuration and Docker Compose setup described above. The frontend files are served directly from `frontend/` by the web container, so browser requests use the same origin for the application and `/api/` routes.
