PROJECT ?= dohyeon-kr
ENVIRONMENT ?= prod
SECRET_FILE ?= secrets/$(ENVIRONMENT)/ghost.env.enc
PLAINTEXT_SECRET_FILE ?= secrets/ghost.env
LOCAL_ENV_FILE ?= .env

.PHONY: secrets secrets-edit secrets-encrypt check-no-private-secrets

secrets:
	PROJECT="$(PROJECT)" ENVIRONMENT="$(ENVIRONMENT)" ./scripts/decrypt-ghost-env.sh "$(SECRET_FILE)" "$(LOCAL_ENV_FILE)"

secrets-edit:
	PROJECT="$(PROJECT)" ENVIRONMENT="$(ENVIRONMENT)" ./scripts/edit-ghost-env.sh "$(SECRET_FILE)"

secrets-encrypt:
	sops --encrypt --input-type dotenv --output-type dotenv --filename-override "$(SECRET_FILE)" --output "$(SECRET_FILE)" "$(PLAINTEXT_SECRET_FILE)"

check-no-private-secrets:
	./scripts/check-no-private-secrets.sh
