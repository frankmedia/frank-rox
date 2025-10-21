# Stripe Payment Integration Setup

This app now has **embedded Stripe payment** for the weekly coaching subscription (£99.99/month).

## Features

✅ **Conversion Journey:**
1. User fills out booking form (name, email, date, goals)
2. Review/confirmation screen with summary
3. Click "Subscribe Now" button
4. Embedded payment form appears (no redirect!)
5. Success screen after payment

✅ **No Redirects:** Payment happens entirely within the app
✅ **Subscription Management:** Automatic recurring billing via Stripe
✅ **User-Friendly:** Dark theme with yellow branding

---

## Setup Instructions

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for a free account
3. Complete business verification (for live payments)

### 2. Create a Product & Price
1. Log into Stripe Dashboard
2. Go to **Products** → **Add Product**
3. Set:
   - Name: "Weekly Check-In Coaching"
   - Price: £99.99
   - Billing: Recurring, Monthly
4. Click **Save Product**
5. Copy the **Price ID** (starts with `price_...`)

### 3. Get API Keys
1. In Stripe Dashboard, go to **Developers** → **API Keys**
2. Copy:
   - **Publishable Key** (starts with `pk_test_...` for test mode)
   - **Secret Key** (starts with `sk_test_...` for test mode)

### 4. Add Keys to Environment Variables

#### Local Development (`.env`):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PRICE_ID=price_your_price_id_here
```

#### Vercel (Production):
1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these 3 variables:
   - `VITE_STRIPE_PUBLISHABLE_KEY` (starts with `pk_`)
   - `STRIPE_SECRET_KEY` (starts with `sk_`)
   - `STRIPE_PRICE_ID` (starts with `price_`)
4. Redeploy your app

---

## Test Mode vs Live Mode

### Test Mode (Recommended First)
- Use test API keys (`pk_test_...` and `sk_test_...`)
- Use test card: `4242 4242 4242 4242`
- Any future date for expiry
- Any 3-digit CVC
- **No real money charged**

### Live Mode (After Testing)
1. Complete Stripe account verification
2. Switch to **Live** mode in Stripe Dashboard
3. Get **Live API Keys** (`pk_live_...` and `sk_live_...`)
4. Update environment variables in Vercel
5. Redeploy

---

## How It Works

### User Journey:
1. **Form:** User enters details → Click "Continue"
2. **Summary:** Review details → Click "Subscribe Now - £99.99/month"
3. **Payment:** Stripe Elements form appears (embedded, no redirect)
4. **Success:** Welcome message, subscription active

### Backend Flow:
1. `/api/create-checkout` - Creates Stripe customer & SetupIntent
2. User enters card details (secured by Stripe)
3. `/api/create-subscription` - Attaches payment method & creates subscription
4. Stripe handles recurring billing automatically

---

## Managing Subscriptions

### View Subscriptions:
- Log into Stripe Dashboard → **Customers**
- Click on a customer to see their subscription
- View all payments, cancel, refund, etc.

### Customer Info:
Each subscription stores:
- Customer name & email
- Preferred date/time for first session
- Goals/training focus
- All in Stripe metadata (accessible via dashboard)

---

## Testing

### Test Card Numbers:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires 3D Secure:** 4000 0027 6000 3184

Use any:
- Future expiry date (e.g., 12/25)
- Any 3-digit CVC (e.g., 123)
- Any postal code (e.g., 12345)

---

## Going Live

1. ✅ Complete Stripe account verification (business details, bank account)
2. ✅ Switch Stripe Dashboard to **Live** mode
3. ✅ Get **Live API Keys** (pk_live_..., sk_live_...)
4. ✅ Update Vercel environment variables
5. ✅ Redeploy app
6. ✅ Test with real card (£99.99 will be charged!)

---

## Support & Troubleshooting

### Common Issues:

**"Stripe is not defined"**
- Check `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env` (local) or Vercel (production)
- Restart dev server after adding env vars

**"Invalid API Key"**
- Make sure `STRIPE_SECRET_KEY` is in Vercel environment variables
- Don't use test keys in live mode (or vice versa)

**"Price not found"**
- Check `STRIPE_PRICE_ID` matches the Price ID in Stripe Dashboard
- Ensure it's a recurring price (not one-time payment)

**Payment fails**
- Check Stripe Dashboard → **Logs** for detailed error messages
- Verify card details are correct
- Try with test card 4242 4242 4242 4242

### Stripe Documentation:
- [Stripe React Elements](https://stripe.com/docs/stripe-js/react)
- [Subscriptions API](https://stripe.com/docs/billing/subscriptions/overview)
- [Testing](https://stripe.com/docs/testing)

---

## Revenue & Fees

### Stripe Fees:
- UK: **1.5% + 20p** per transaction
- Your revenue per user: **£97.80/month** (97.8%)

### Payout Schedule:
- Stripe pays out to your bank account automatically
- Default: 7 days (can be changed to 2 days after verification)

---

## Next Steps

1. ✅ Set up Stripe account
2. ✅ Create product & price
3. ✅ Add environment variables to Vercel
4. ✅ Test with test card
5. ✅ Go live when ready!

**Need help?** Check [Stripe Dashboard](https://dashboard.stripe.com) or contact Stripe Support.

