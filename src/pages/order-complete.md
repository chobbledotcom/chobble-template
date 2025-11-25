---
title: Order Complete
header_text: Thank You for Your Order
meta_description: Thank you for your order
meta_title: Order Complete
no_index: true
---

Your payment has been received. Thank you for your order!

We'll be in touch with you soon regarding your purchase.

<script>
  // Clear the shopping cart after successful PayPal payment
  (function() {
    localStorage.removeItem('paypal_cart');
  })();
</script>
