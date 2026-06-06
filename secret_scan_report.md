# Secret Scan Report

Scan date: 2026-06-06

## Scope

The scan checked tracked source and local environment files for references to MongoDB URIs, JWT secrets, Razorpay keys, Stripe keys, SMTP credentials, API tokens, OAuth secrets, and hardcoded local machine paths. Dependency folders, build output, `.git`, and `__MACOSX/` archive contents were excluded from source scanning.

Secret values are intentionally not printed in this report.

## Results

| Category | Status | Files / Variables |
| --- | --- | --- |
| MongoDB URI | Local env only | `backend/.env`: `MONGO_URI`; `backend/config/env.js`: `MONGO_URI`; `backend/config/db.js`: `MONGO_URI` reference. |
| JWT/admin secrets | Local env and source references | `backend/.env`: `JWT_SECRET`, `ADMIN_SECRET`; `backend/config/env.js`: `JWT_SECRET`, `ADMIN_SECRET`; `backend/middleware/authMiddleware.js`: `JWT_SECRET`; `backend/routes/auth.js`: `JWT_SECRET`, `ADMIN_SECRET`. |
| Razorpay keys | Local env and source references | `backend/.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`; `backend/config/env.js`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; `backend/modules/payment/payment.service.js`: same variables. |
| Stripe keys | Source references only | `backend/config/env.js`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; `backend/modules/payment/payment.service.js`: same variables. |
| SMTP credentials | Source references only | `backend/config/env.js`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; `backend/utils/emailService.js`: same variables. |
| Frontend/admin API endpoints | Local env only | `frontend/.env`: `VITE_API_URL`, `VITE_ADMIN_PORTAL_URL`; `admin/.env`: `VITE_API_URL`, `VITE_API_BASE_URL`. |
| API tokens / OAuth secrets | Not found | No OAuth secret or generic API token variable with a committed value was identified. |
| Hardcoded local machine paths | Found in untracked scratch file | `extract.py`: local Windows user path variable `log_path`. |

## Tracked Secret Exposure

PASS: No tracked real `.env` file was found.

PASS: No tracked hardcoded credential value was identified in source files during this scan.

WARN: `extract.py` is untracked and contains a hardcoded local machine path. It is now ignored as a scratch file, but it should be deleted locally if no longer needed.

## Safe Environment Templates

- `frontend/.env.example`
- `admin/.env.example`
- `backend/.env.example`

All environment example files contain variable names and safe placeholder values only.
