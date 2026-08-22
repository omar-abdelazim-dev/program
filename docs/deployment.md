# Deployment guide

## Architecture

- **Frontend:** Vercel static deployment from `client/`.
- **API:** Render web service built from the root `Dockerfile`.
- **Database:** MongoDB Atlas. Enable Atlas automated backups before production.
- **Media:** Cloudinary, configured with production credentials in the API host.

`render.yaml` defines a staging API service. It intentionally uses `autoDeploy: false` so staging releases are explicitly triggered and reviewed.

## First staging deployment

1. In Render, create a Blueprint from this repository and select `render.yaml`.
2. Fill every `sync: false` variable from `server/.env.example`; use the staging MongoDB Atlas URI and a staging Cloudinary environment. Configure a staging-only `SENTRY_DSN` before testing error alerts.
3. Deploy the service and confirm `GET /api/health` and `GET /api/ready` both return 200.
4. In Vercel, set `VITE_API_URL` to `https://<render-service>.onrender.com/api`, redeploy the frontend, and set the API `CLIENT_URL` to the exact Vercel staging origin.
5. Run the staging checklist below before enabling automatic deployment or pointing production domains at the services.

## Staging checklist

- Verify HTTPS and CORS with the deployed Vercel origin.
- Test registration, login, logout, session refresh, and cookie delivery.
- Test Cloudinary image/video uploads with the staging credentials.
- Verify registration OTP, password-reset OTP, and approval emails reach a real inbox.
- Configure a Mobile Wallet or InstaPay recipient and test a manual-payment proof from submission through admin approval.
- Confirm a pending enrollment cannot access a lesson and an approved one can.
- Confirm `/api/ready` goes non-200 if MongoDB is unavailable.
- Verify an Atlas backup is scheduled and that a restore procedure has an owner and date.
- Configure log collection from stdout and error tracking before production traffic.

## Production promotion

Use separate production Atlas, Cloudinary, email, and manual-payment recipient configuration. Do not reuse staging credentials. Enable Render auto-deploy only after the staging checklist passes and the deployed commit is approved.
