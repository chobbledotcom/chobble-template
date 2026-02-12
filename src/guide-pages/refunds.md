---
title: Refunds
subtitle: How to process refunds and handle refund requests
guide-category: orders-and-payments
order: 1
faqs:
  - question: How do I issue a refund?
    answer: Log in to your Stripe Dashboard, find the payment, and click "Refund". You can issue a full or partial refund.
    order: 1
  - question: How long does a refund take to appear?
    answer: Refunds typically take 5-10 business days to appear on the customer's statement, depending on their bank.
    order: 2
  - question: Can I refund a quote or enquiry order?
    answer: Quote and enquiry orders do not involve online payments, so there is nothing to refund through the site. Handle these directly with your customer.
    order: 3
---

When a customer pays through your site using Stripe Checkout, the payment is processed entirely by Stripe. Your site does not store payment details or process refunds directly — all refund handling is done through the Stripe Dashboard.

## Issuing a Refund via Stripe

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/payments)
2. Find the payment you want to refund — you can search by amount, date, or customer email
3. Click the payment to open its details
4. Click **Refund** in the top right
5. Choose whether to issue a **full refund** or enter a **partial amount**
6. Add an internal reason for the refund (optional but recommended for your records)
7. Click **Refund** to confirm

Stripe will process the refund and notify the customer by email if you have Stripe email receipts enabled.

## Full vs Partial Refunds

- **Full refund** — returns the entire payment amount to the customer
- **Partial refund** — returns a specific amount, useful when only part of an order needs to be refunded (e.g. one item out of several, or a goodwill discount)

You can issue multiple partial refunds against the same payment, up to the original amount.

## Refund Timing

Refunds are not instant. Once you issue a refund through Stripe:

- Stripe processes it immediately on their end
- The customer's bank typically takes **5-10 business days** to credit the amount back
- The exact timing depends on the customer's bank and card issuer — this is outside your control

Let customers know this timeline upfront to set expectations.

## Stripe Fees on Refunds

Stripe does not return its processing fees when you issue a refund. For example, if a customer paid £50 and Stripe charged a £1.75 fee, you received £48.25. If you refund the full £50, you absorb the £1.75 fee.

This is worth factoring into your refund policy, especially for low-value orders where fees make up a larger proportion.

## Quote / Enquiry Mode

If your site uses **quote mode** instead of Stripe, customers submit enquiries rather than making online payments. Since no payment is taken through the site, there is nothing to refund online. Handle any refunds or cancellations directly with your customer through your normal business process.

## Tips for Handling Refund Requests

- **Respond promptly** — acknowledge refund requests quickly even if you need time to investigate
- **Keep records** — use Stripe's internal notes to log why each refund was issued
- **Set a clear policy** — consider adding a refund policy page to your site so customers know what to expect
- **Check for fraud** — if you see unusual refund patterns, review the orders in Stripe for signs of fraudulent activity
