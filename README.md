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
- GitHub Actions deploying to `ssh dohyeon.kr`

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
│   └── ghost.env.enc
└── content/
```

`content/` is the persistent Ghost volume. It contains uploaded images, themes,
logs, and the SQLite database at `content/data/ghost.db`.


## Mail

Ghost needs SMTP for reliable transactional mail, including staff invites,
password resets, member sign-in links, and member signup emails. The compose
file reads `.env` as an `env_file`, so you can pass Ghost's native
nested mail config keys directly with double underscores.

For example, configure SMTP values in `.env` or `secrets/ghost.env` before
encrypting it with SOPS:

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

After changing mail values on the server, recreate the Ghost container so Docker
Compose injects the updated environment:

```sh
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose up -d --force-recreate ghost'
```

## Secrets

Secrets are managed with SOPS + age.

Committed files:

```text
.sops.yaml
secrets/ghost.env.enc
```

Plaintext secret files are ignored by git:

```text
secrets/*.env
.env
```

The current server has its age private key at:

```text
~/.config/sops/age/keys.txt
```

To edit Ghost environment values from a machine that has the age private key,
decrypt to an ignored file, edit, then re-encrypt:

```sh
sops -d --input-type dotenv --output-type dotenv secrets/ghost.env.enc > secrets/ghost.env
sops --encrypt --input-type dotenv --output-type dotenv --filename-override secrets/ghost.env.enc --output secrets/ghost.env.enc secrets/ghost.env
```

To apply the encrypted env manually on the server:

```sh
ssh dohyeon.kr 'cd /var/www/ghost-blog && SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt" sops -d --input-type dotenv --output-type dotenv secrets/ghost.env.enc > .env && chmod 600 .env'
```

## Deployment

Push to `main` or run the `Release & Deploy Ghost` workflow manually.

The workflow:

1. runs semantic-release
2. creates `/var/www/ghost-blog/content` on `dohyeon.kr`
3. ensures `sops` and `age` are available on the server
4. uploads `docker-compose.yml`, `.env.example`, the encrypted env, and the Nginx sample config
5. decrypts `secrets/ghost.env.enc` to `/var/www/ghost-blog/.env`
6. runs `docker compose pull && docker compose up -d`
7. disables any leftover legacy Nginx vhost
8. applies the Ghost Nginx vhost and reloads Nginx

Useful server commands:

```sh
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose ps'
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose logs -f ghost'
ssh dohyeon.kr 'cd /var/www/ghost-blog && docker compose pull && docker compose up -d'
```

## Nginx

The sample config is in `deploy/nginx/blog.dohyeon.kr.conf`. The current server
already has a Let's Encrypt certificate at
`/etc/letsencrypt/live/blog.dohyeon.kr`.

Apply it on the server:

```sh
ssh dohyeon.kr 'sudo cp /var/www/ghost-blog/blog.dohyeon.kr.conf /etc/nginx/sites-available/blog.dohyeon.kr'
ssh dohyeon.kr 'sudo ln -sf /etc/nginx/sites-available/blog.dohyeon.kr /etc/nginx/sites-enabled/blog.dohyeon.kr'
ssh dohyeon.kr 'sudo nginx -t && sudo systemctl reload nginx'
```

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
