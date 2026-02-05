# server (Fastify + SQLite)

## 로컬 실행

```bash
pnpm install
pnpm dev
```

- 기본 주소: `http://127.0.0.1:3000`
- API:
  - `GET /api/visit` → `{ today, total }`
  - `POST /api/visit` → `{ today, total }` (카운트 증가)

## 환경변수

- `DB_PATH` (선택): SQLite 파일 경로 (기본: `server/data/visits.sqlite`)
- `PORT` (선택): 기본 3000
- `HOST` (선택): 기본 127.0.0.1

## EC2 운영(예시)

### systemd (권장)

`/etc/systemd/system/dohyeon-kr-server.service`

```ini
[Unit]
Description=dohyeon.kr server
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/dohyeon.kr/server
ExecStart=/usr/bin/node /var/www/dohyeon.kr/server/dist/index.js
Restart=always
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
Environment=DB_PATH=/var/lib/dohyeon-kr/visits.sqlite

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dohyeon-kr-server
sudo systemctl status dohyeon-kr-server
```

### Nginx 리버스프록시 (같은 도메인에서 /api/*)

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

