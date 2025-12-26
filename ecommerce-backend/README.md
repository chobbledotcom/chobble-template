# E-commerce Checkout Backend

Minimal stateless backend for Stripe and PayPal checkout sessions. Perfect for Docker containers without persistent storage.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/stripe/create-session` | POST | Create Stripe Checkout session |
| `/api/paypal/create-order` | POST | Create PayPal order |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SITE_HOST` | **Yes** | Your site's domain(s), comma-separated (e.g., `example.com` or `example.com,shop.example.com`) |
| `BRAND_NAME` | **Yes** | Brand name shown on checkout pages |
| `STRIPE_SECRET_KEY` | For Stripe | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `PAYPAL_CLIENT_ID` | For PayPal | PayPal REST API client ID |
| `PAYPAL_SECRET` | For PayPal | PayPal REST API secret |
| `PAYPAL_SANDBOX` | No | Set to `true` for PayPal sandbox mode |
| `CURRENCY` | No | Currency code (default: `GBP`) |

## Request Format

```json
{
  "cart": [
    { "item_name": "Product", "unit_price": 29.99, "quantity": 2 }
  ]
}
```

## Security

- CORS only allows configured origins (`https://{SITE_HOST}` for each host)
- Redirect URLs use the request's origin (validated against allowed hosts)
- SKU prices are cached per-origin (1 minute TTL)
- Backend won't start without `SITE_HOST`

## Docker

```bash
docker build -t checkout-backend .
docker run -p 3000:3000 \
  -e SITE_HOST=example.com,shop.example.com \
  -e BRAND_NAME="My Shop" \
  -e STRIPE_SECRET_KEY=sk_test_... \
  -e PAYPAL_CLIENT_ID=... \
  -e PAYPAL_SECRET=... \
  checkout-backend
```

## Frontend Config

In your site's `config.json`:

```json
{
  "cart_mode": "stripe",
  "checkout_api_url": "https://checkout.example.com/api/stripe/create-session"
}
```

Or for PayPal:

```json
{
  "cart_mode": "paypal",
  "checkout_api_url": "https://checkout.example.com/api/paypal/create-order"
}
```

The `checkout_api_url` should be the full URL to the checkout endpoint.
