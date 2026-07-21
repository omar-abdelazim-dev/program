# PROGRAM Platform — Enterprise Deployment Guide

## Architecture Overview
The system is designed to run in a clustered environment with Redis for distributed security state and MongoDB for persistent storage. It includes enterprise-grade features such as distributed locking, Prometheus metrics, and ClamAV integration for upload scanning.

## Prerequisites
- Docker Engine & Docker Compose
- TLS certificates for production (to be handled by reverse proxy/load balancer)
- RSA key pairs for JWT RS256 (optional but recommended)

## Configuration
Generate keys for JWT RS256 signing (store securely, e.g. AWS Secrets Manager or HashiCorp Vault):
```bash
ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
# Don't add passphrase
openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
```

Copy `.env.example` to `.env.production` and populate all variables including:
- `MONGO_URI=mongodb://mongo:27017/program`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`
- `CLAMAV_HOST=clamav`
- `CLAMAV_PORT=3310`
- `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (base64 encoded or stringified with newlines)

## Deployment (Docker Compose)
To start the entire stack:
```bash
docker-compose --env-file .env.production up -d --build
```

### Stack Components
- `app`: Node.js Express API
- `mongo`: MongoDB database
- `redis`: Redis cache for rate limiting, sessions, and idempotency
- `clamav`: Antivirus daemon
- `prometheus`: Metrics collection

## Scaling
The API layer (`app`) is completely stateless. Sessions and locks are distributed via Redis.
To scale the API horizontally:
```bash
docker-compose --env-file .env.production up -d --scale app=3
```

## Security Posture
- Container runs as a non-root user (`nodejs`).
- Uploads are scanned for viruses using `clamd` before reaching business logic.
- Prometheus `/metrics` endpoint is protected by Docker networking (or should be firewalled).
- Automatic lock-outs and rate limits are synced across all nodes using Redis.
