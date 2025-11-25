# E-commerce Checkout Backend

Minimal stateless backend for Stripe and PayPal checkout sessions. Perfect for hosting on Docker containers without persistent storage (e.g., Bunny Magic Containers).

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, shows which providers are configured |
| `/api/stripe/create-session` | POST | Create Stripe Checkout session |
| `/api/paypal/create-order` | POST | Create PayPal order |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | For Stripe | Your Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `PAYPAL_CLIENT_ID` | For PayPal | PayPal REST API client ID |
| `PAYPAL_SECRET` | For PayPal | PayPal REST API secret |
| `PAYPAL_SANDBOX` | No | Set to `true` for PayPal sandbox mode |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed origins for CORS (default: `*`) |
| `CURRENCY` | No | Currency code (default: `GBP`) |
| `BRAND_NAME` | No | Brand name shown on PayPal checkout |
| `PORT` | No | Server port (default: `3000`) |

## Request Format

Both endpoints accept the same payload:

```json
{
  "cart": [
    {
      "item_name": "Product Name",
      "unit_price": 29.99,
      "quantity": 2
    }
  ],
  "success_url": "https://yoursite.com/checkout-success/",
  "cancel_url": "https://yoursite.com/"
}
```

## Response Format

```json
{
  "id": "session_or_order_id",
  "url": "https://checkout.stripe.com/... or https://paypal.com/..."
}
```

## Docker

Build and run:

```bash
docker build -t checkout-backend .
docker run -p 3000:3000 \
  -e STRIPE_SECRET_KEY=sk_test_... \
  -e PAYPAL_CLIENT_ID=... \
  -e PAYPAL_SECRET=... \
  -e ALLOWED_ORIGINS=https://yoursite.com \
  checkout-backend
```

## Frontend Configuration

In your site's `config.json`, set:

```json
{
  "checkout_api_url": "https://your-backend-url.com"
}
```

The cart will automatically use the backend for Stripe (required) and optionally for PayPal (falls back to static URL redirect if not configured).
