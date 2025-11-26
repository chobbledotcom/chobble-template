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
| `SITE_URL` | **Yes** | Your site URL (e.g., `https://example.com`) - used for CORS and redirect URLs |
| `STRIPE_SECRET_KEY` | For Stripe | Your Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `PAYPAL_CLIENT_ID` | For PayPal | PayPal REST API client ID |
| `PAYPAL_SECRET` | For PayPal | PayPal REST API secret |
| `PAYPAL_SANDBOX` | No | Set to `true` for PayPal sandbox mode |
| `CURRENCY` | No | Currency code (default: `GBP`) |
| `BRAND_NAME` | No | Brand name shown on PayPal checkout |
| `PORT` | No | Server port (default: `3000`) |

## Request Format

Both endpoints accept a cart array:

```json
{
  "cart": [
    {
      "item_name": "Product Name",
      "unit_price": 29.99,
      "quantity": 2
    }
  ]
}
```

## Response Format

```json
{
  "id": "session_or_order_id",
  "url": "https://checkout.stripe.com/... or https://paypal.com/..."
}
```

## Security

- CORS only allows requests from `SITE_URL`
- Redirect URLs are hardcoded to `SITE_URL` (not client-controlled)
- No wildcard origins - backend won't start without `SITE_URL`

## Docker

Build and run:

```bash
docker build -t checkout-backend .
docker run -p 3000:3000 \
  -e SITE_URL=https://yoursite.com \
  -e STRIPE_SECRET_KEY=sk_test_... \
  -e PAYPAL_CLIENT_ID=... \
  -e PAYPAL_SECRET=... \
  checkout-backend
```

## Frontend Configuration

In your site's `config.json`, set:

```json
{
  "checkout_api_url": "https://your-backend-url.com",
  "stripe_publishable_key": "pk_...",
  "paypal_email": "you@example.com"
}
```

**Checkout behavior:**
- **Stripe**: Requires the backend (`checkout_api_url` must be set)
- **PayPal**: Uses backend if `checkout_api_url` is set, otherwise falls back to client-side URL redirect (works with just `paypal_email`)
