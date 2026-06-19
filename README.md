# dohyeon.kr Ghost CMS

This repository deploys Ghost CMS for `https://blog.dohyeon.kr`.
`https://dohyeon.kr` redirects to the Ghost site.

The repository intentionally contains only the active Ghost deployment assets and
theme files. Legacy static-site/runtime code has been removed.

## Stack

- Ghost 5 Docker image
- SQLite content database for the initial setup
- Nginx reverse proxy on `blog.dohyeon.kr`
- Nginx redirect from `dohyeon.kr` to `blog.dohyeon.kr`
- GitHub Actions deploying through the restricted server wrapper

## Local Run

```sh
cp .env.example .env
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

The workflow:

1. runs semantic-release
2. authenticates to Vault with GitHub OIDC
3. reads the SOPS age private key from `kv/sops/dohyeon-kr`
4. decrypts `secrets/prod/ghost.env.enc` to a workspace `.env`
5. runs the restricted deployment wrapper:

```sh
sudo /usr/local/sbin/deploy-ghost-blog "$GITHUB_WORKSPACE"
```

The self-hosted runner must not run privileged deployment steps directly from
this workflow. If deployment behavior needs to change, update the server wrapper
and sudoers configuration deliberately instead of adding inline privileged
commands to `.github/workflows/deploy.yml`.

Docker registry credentials for future CI jobs should follow the
`dohyeon-base` Vault OIDC example instead of GitHub repository secrets. This
Ghost deployment does not currently need a Docker registry login step.

The `dohyeon-base` standard path for new services is
`kv/sops/<project>/<environment>`. This repository still reads the deploy key
from `kv/sops/dohyeon-kr` because that is the Vault path currently granted to
the `dohyeon-kr-deploy` GitHub OIDC role.

Useful server commands:

```sh
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose ps'
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose logs -f ghost'
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose pull && docker compose up -d'
```

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
`GHOST_NODE_ENV=production`.
