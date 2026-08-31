# dohyeon.kr Ghost CMS

This repository deploys Ghost CMS for `https://blog.dohyeon.kr`.
`https://dohyeon.kr` redirects to the Ghost site.

The repository intentionally contains only the active Ghost deployment assets and
theme files. Legacy static-site/runtime code has been removed.

## Stack

- Ghost 6.51.0 Alpine 3.23 Docker image selected by an exact local digest
- SQLite content database for the initial setup
- Nginx reverse proxy on `blog.dohyeon.kr`
- Nginx redirect from `dohyeon.kr` to `blog.dohyeon.kr`
- Loopback-only Python/SQLite visitor counter on `127.0.0.1:2370`
- GitHub Actions deploying through the restricted server wrapper

## Local Run

```sh
cp .env.example .env
docker pull ghost:6.51.0-alpine3.23
export GHOST_IMAGE="$(docker image inspect --format '{{index .RepoDigests 0}}' ghost:6.51.0-alpine3.23)"
docker compose up -d
```

Ghost will be available at:

- Site: `http://localhost:2368`
- Admin: `http://localhost:2368/ghost`

## Server Layout

The GitHub Actions workflow deploys these files to `/var/www/ghost-blog` on the
`dohyeon.kr` server:

```text
/var/www/ghost-blog/
├── docker-compose.yml
├── .env
├── .env.example
├── blog.dohyeon.kr.conf
├── secrets/
│   └── prod/
│       └── ghost.env.enc
└── content/
```

`content/` is the persistent Ghost volume. It contains uploaded images, themes,
logs, and the SQLite database at `content/data/ghost.db`.

The server also has `/etc/ghost-blog/image.env`, a root-owned mode `0600` file
containing exactly one `GHOST_IMAGE=ghost@sha256:<64 hex>` assignment. It is
separate from the service `.env`, so deployment metadata is not injected into
the Ghost process.

The footer visitor totals are served by `ghost-visit-counter.service`. It keeps
the legacy Astro totals in `/var/lib/dohyeon-kr/visits.sqlite`; Nginx exposes
only `GET` and `POST /api/visit`. Browsers increment at most once per 30 minutes
when local storage is available. The service binds only to loopback and runs as
the unprivileged `dohyeon` account with systemd filesystem and capability
restrictions. Per-post totals use the compatible
`GET`/`POST /api/visit/post/:slug` endpoint and the same browser-side interval.

The same loopback service provides login-free, plain-text comments at
`GET`/`POST /api/comments/:slug` and owner deletion at
`DELETE /api/comments/:slug/:id`. Delete tokens stay in the commenter's browser;
only their hashes are stored in SQLite. Comment creation requires a same-origin
request, a short-lived challenge, an empty honeypot, and passes length, link,
and rate limits. The Ghost-native member comments helper is not rendered.

Post edit links are hidden by default. An authenticated administrator can open
any post once with `?admin-tools=1` to enable them in that browser, or use
`?admin-tools=0` to hide them again. Ghost Admin still enforces authentication
when the editor link is opened.

The same admin-tools mode exposes `/ghost/comments-admin/`. Its API lives under
the Ghost cookie path and verifies the current Ghost staff session against the
loopback Ghost Admin API before returning comment data or accepting a deletion.
The management page lists the latest 500 comments and can optionally include
soft-deleted records.

## Generated thumbnails

Posts without a Ghost feature image use the restored Astro thumbnail design:
a 1200×630 PNG rendered with Satori, Sharp, and the bundled Pretendard fonts.
The same image is used by list cards, article headers, and social metadata.

Edit `scripts/thumbnail-manifest.json` when adding a published post, then run:

```sh
pnpm thumbnails
pnpm thumbnails:check
```

If an image has not been generated yet, the list card removes its media column
after the image request fails instead of leaving an empty thumbnail region.


## Mail

Ghost needs SMTP for reliable transactional mail, including staff invites,
password resets, member sign-in links, and member signup emails. The compose
file reads `.env` as an `env_file`, so you can pass Ghost's native
nested mail config keys directly with double underscores.

For example, configure SMTP values in `.env` or the ignored
`secrets/ghost.env` staging file before encrypting it with SOPS:

```dotenv
GHOST_MAIL_TRANSPORT=SMTP
mail__from='dohyeon.kr <noreply@blog.dohyeon.kr>'
mail__options__host=smtp.resend.com
mail__options__port=465
mail__options__secure=true
mail__options__auth__user=resend
mail__options__auth__pass=re_replace_with_resend_api_key
```

`GHOST_MAIL_TRANSPORT=Direct` is only a bootstrap/default value. Most cloud
servers block or rate-limit direct outbound mail, and direct mail has poor
deliverability without SMTP-provider reputation, SPF, DKIM, and DMARC.

Resend accepts SMTP authentication before the sending domain is verified, but
the message will still fail during `DATA` with `550 The blog.dohyeon.kr domain
is not verified`. Add these public DNS records for `blog.dohyeon.kr` at the DNS
provider before expecting Ghost mail to work:

```text
TXT  resend._domainkey.blog  p=<resend-domainkey-public-key>
MX   send.blog               feedback-smtp.us-east-1.amazonses.com  priority 10
TXT  send.blog               v=spf1 include:amazonses.com ~all
```

Check DNS propagation from the server:

```sh
ssh dohyeon.kr 'dig +short TXT resend._domainkey.blog.dohyeon.kr; dig +short MX send.blog.dohyeon.kr; dig +short TXT send.blog.dohyeon.kr'
```

After changing mail values on the server, recreate the Ghost container so Docker
Compose injects the updated environment:

```sh
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose up -d --force-recreate ghost'
```

## Secrets

Secrets are managed with SOPS + age. This service repository stores only public
age recipients and encrypted secret files. The age private key is stored in
Vault and is fetched only at decrypt/edit time.

Committed files:

```text
.sops.yaml
secrets/prod/ghost.env.enc
```

Vault location:

```text
kv/sops/dohyeon-kr/prod
field: age_key
```

Plaintext secret files are ignored by git:

```text
secrets/*.env
.env
.env.local
.age.key
*.agekey
*.decrypted.*
```

To decrypt the Ghost env for local Docker after authenticating to Vault:

```sh
vault login
make secrets
```

This fetches the age private key from Vault into `SOPS_AGE_KEY` for a single
process and writes the decrypted prod dotenv file to ignored `.env`.

To edit the encrypted Ghost environment file in place:

```sh
vault login
make secrets-edit
```

To create or replace the encrypted file from an ignored plaintext dotenv file:

```sh
cp .env.example secrets/ghost.env
$EDITOR secrets/ghost.env
make secrets-encrypt
rm secrets/ghost.env
```

## Deployment

Push to `main` or run the `Release & Deploy Ghost` workflow manually.

The release job is fail-closed unless the repository variable
`GHOST_PRODUCTION_MYSQL_READY` is exactly `true`. Keep it unset while this
repository still uses the SQLite development Compose contract. Set it only
after MySQL 8 is provisioned, content is exported and restored, the production
Compose file and root wrapper are reviewed together, and a rollback backup has
been tested.

The workflow:

1. runs semantic-release
2. enters the protected GitHub `production` environment
3. resolves the public `main` HEAD after semantic-release and passes only that
   40-character commit SHA to the restricted deployment wrapper:

```sh
sudo /usr/local/sbin/deploy-ghost-blog "$DEPLOY_SHA"
```

The self-hosted job has no repository or OIDC permissions and does not check out
the repository, contact Vault, run SOPS, or provide its workspace to root. The
root-owned wrapper independently verifies that the SHA is the public
`dohyeon-kr/dohyeon.kr` `main` HEAD over HTTPS, downloads that exact GitHub
archive into a private root temporary directory, and installs only the validated
Compose file, nginx config, and theme. It reuses the existing root-owned
`/var/www/ghost-blog/.env`; a missing, linked, non-root-owned, or overly
permissive file aborts deployment. It also requires the exact digest in the
root-owned `/etc/ghost-blog/image.env` to exist locally. The wrapper never pulls
a mutable tag and waits for the digest-pinned container health check.

Before enabling the new wrapper on an existing host, move the two deployment
asset directories out of the runner account's ownership. Do not recursively
change the Ghost content directory:

```sh
sudo chown root:root /var/www/ghost-blog /var/www/ghost-blog/themes
sudo chmod 755 /var/www/ghost-blog /var/www/ghost-blog/themes
sudo test -f /var/www/ghost-blog/.env
test "$(sudo stat -c %u /var/www/ghost-blog/.env)" = 0
sudo chmod 600 /var/www/ghost-blog/.env
sudo install -d -o root -g root -m 0755 /etc/ghost-blog
# Populate image.env from the currently reviewed local Ghost image digest.
sudo test -f /etc/ghost-blog/image.env
test "$(sudo stat -c %u /etc/ghost-blog/image.env)" = 0
sudo chmod 600 /etc/ghost-blog/image.env
```

The sudoers entry for the self-hosted runner must keep environment resetting
enabled and allow only `/usr/local/sbin/deploy-ghost-blog`; the wrapper itself
rejects extra arguments and non-SHA input.

`https://meetings.dohyeon.kr` is deployed outside this repository by the
internal polling deploy agent. The agent watches
`registry.dohyeon.kr/meeting-recorder:deploy-main` and runs Docker Compose on
the server when the tag digest changes.

The Ghost workflow should not run privileged deployment steps directly. If Ghost
deployment behavior needs to change, update the server wrapper and sudoers
configuration deliberately instead of adding inline privileged commands to
`.github/workflows/deploy.yml`.

Docker registry credentials for future CI jobs should follow the
`dohyeon-base` Vault OIDC example instead of GitHub repository secrets. This
Ghost deployment does not access Vault or need a Docker registry login step.

Useful server commands:

```sh
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose ps'
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose logs -f ghost'
```

Do not run an ad hoc server-side `docker compose pull`. Image updates require a
reviewed digest in `/etc/ghost-blog/image.env`, an explicit backup, and a normal
wrapper deployment of the current public `main` SHA.

## Nginx

The sample config is in `deploy/nginx/blog.dohyeon.kr.conf`. The deployment
wrapper is responsible for applying it on the server. The current server already
has a Let's Encrypt certificate at `/etc/letsencrypt/live/blog.dohyeon.kr`.

If rebuilding this on a fresh server, issue a certificate after DNS for
`blog.dohyeon.kr` points to the server:

```sh
ssh dohyeon.kr 'sudo certbot --nginx -d blog.dohyeon.kr'
```

## SQLite Note

This setup intentionally uses SQLite for the first Ghost install:

```env
GHOST_NODE_ENV=development
database__client=sqlite3
```

Ghost's supported production database is MySQL 8. Before treating this as a real
production blog, migrate the compose file to MySQL 8 and set
`GHOST_NODE_ENV=production`. The deployment workflow intentionally stays
disabled through `GHOST_PRODUCTION_MYSQL_READY` until that migration is ready.
