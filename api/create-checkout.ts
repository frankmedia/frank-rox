import type { VercelRequest, VercelResponse } from "@vercel/node";
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { name, email, preferredDate, preferredTime, goals } = req.body;

    // Create or retrieve customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          preferredDate,
          preferredTime,
          goals: goals?.substring(0, 500) || "",
        },
      });
    }

    // Create a SetupIntent to collect payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      metadata: {
        name,
        email,
        preferredDate,
        preferredTime,
        goals: goals?.substring(0, 500) || "",
      },
    });

    return res.status(200).json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error("Stripe setup error:", error);
    return res.status(500).json({
      error: "Failed to create setup intent",
      message: error.message,
    });
  }
}

