import Stripe from "stripe";

import { DomainError } from "./domain/errors";

export async function createTestCheckout(input: { organizationId: string; organizationName: string; successUrl: string; cancelUrl: string }) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_TEST_PRICE_ID;
  if (!secretKey?.startsWith("sk_test_") || !priceId) {
    throw new DomainError(503, "Stripe test mode is not configured");
  }
  const stripe = new Stripe(secretKey);
  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: input.organizationId,
    metadata: { organizationId: input.organizationId, organizationName: input.organizationName },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
}
