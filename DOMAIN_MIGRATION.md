# 🌐 Domain Migration Guide: roxpt.app + my.roxpt.app

## Architecture Overview

```
roxpt.app           → Marketing Site (new)
  ├── Landing page
  ├── Features
  ├── Pricing
  ├── Sign up / Login → redirects to my.roxpt.app
  └── About / Contact

my.roxpt.app        → Training App (current project)
  ├── User login
  ├── Workout plans
  ├── Exercise tracking
  └── Profile / History
```

---

## 🚀 Step-by-Step Migration

### **Step 1: Configure Vercel for Current App (my.roxpt.app)**

#### In Vercel Dashboard:

1. **Go to your project** (frank-rox)
2. **Settings** → **Domains**
3. **Add Domain**: `my.roxpt.app`
4. **Configure DNS** (see DNS setup below)
5. **Remove old domain** (if any) or keep as redirect

#### DNS Configuration (in your DNS provider):

```
Type    Name    Value                           TTL
CNAME   my      cname.vercel-dns.com           Auto
```

**Wait 5-30 minutes** for DNS propagation.

---

### **Step 2: Update Environment Variables**

#### In Vercel Project Settings:

Go to **Settings** → **Environment Variables** and add/update:

```bash
# Google Sheets API
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyBDHQQIMjCQ9-RjpPQ4_uQ7S5vpfBRH24I
VITE_MASTER_SHEET_ID=19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# New domain URLs
VITE_APP_URL=https://my.roxpt.app
VITE_MARKETING_URL=https://roxpt.app

# Stripe (if using)
VITE_STRIPE_PUBLISHABLE_KEY=your_key_here
```

**Redeploy** after adding variables.

---

### **Step 3: Create Marketing Site (roxpt.app)**

#### Option A: Quick Landing Page (Recommended for MVP)

Use a simple React/Next.js template:

**Folder structure:**
```
roxpt-marketing/
├── public/
│   ├── hero-image.jpg
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Pricing.tsx
│   │   └── Footer.tsx
│   ├── pages/
│   │   ├── index.tsx (home)
│   │   └── signup.tsx (redirects to my.roxpt.app/login)
│   └── styles/
└── package.json
```

**Quick setup with Next.js:**
```bash
npx create-next-app@latest roxpt-marketing
cd roxpt-marketing
npm install
```

**Key pages needed:**
1. **Home** (`/`) - Hero, features, CTA
2. **Pricing** (`/pricing`) - Plans and pricing
3. **Sign Up** (`/signup`) - Redirect to `my.roxpt.app/login`
4. **Login** (`/login`) - Redirect to `my.roxpt.app/login`

#### Option B: Use a Template

- **Framer**: framer.com (no-code, fast)
- **Webflow**: webflow.com (visual builder)
- **Carrd**: carrd.co (simple one-pager)

---

### **Step 4: Deploy Marketing Site to Vercel**

1. **Create new GitHub repo**: `roxpt-marketing`
2. **Push your marketing site** to the repo
3. **Import to Vercel**:
   - Go to vercel.com
   - Click "Add New Project"
   - Import `roxpt-marketing`
   - Add domain: `roxpt.app`
4. **Configure DNS**:

```
Type    Name    Value                           TTL
A       @       76.76.21.21                     Auto
AAAA    @       2606:4700:4700::1111           Auto
```

Or use Vercel's DNS:
```
Type    Name    Value                           TTL
CNAME   @       cname.vercel-dns.com           Auto
```

---

### **Step 5: Update Current App Code**

#### Create a constants file for URLs:

```typescript
// src/config/urls.ts
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8081';
export const MARKETING_URL = import.meta.env.VITE_MARKETING_URL || 'http://localhost:3000';
```

#### Update Capacitor config:

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roxpt.app',
  appName: 'RoxPT',
  webDir: 'dist',
  server: {
    // Use production URL in builds
    url: 'https://my.roxpt.app',
    cleartext: true
  }
};

export default config;
```

---

### **Step 6: Update Authentication & Redirects**

#### Add logout redirect to marketing site:

```typescript
// src/contexts/AuthContext.tsx
import { MARKETING_URL } from '@/config/urls';

const logout = () => {
  setUser(null);
  localStorage.removeItem("frank_rock_user");
  
  // Redirect to marketing site if in production
  if (window.location.hostname !== 'localhost') {
    window.location.href = MARKETING_URL;
  }
};
```

---

### **Step 7: SEO & PWA Updates**

Update your `vite.config.ts`:

```typescript
manifest: {
  name: "RoxPT - Hyrox Training",
  short_name: "RoxPT",
  description: "Your personalized Hyrox training programme",
  theme_color: "#FFCC00",
  background_color: "#000000",
  display: "standalone",
  scope: "/",
  start_url: "https://my.roxpt.app/", // Updated
  icons: [
    {
      src: "/android-chrome-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/android-chrome-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
},
```

---

## 🎯 Marketing Site - Quick Template

Here's a minimal landing page structure:

### Homepage Content:
```
Hero Section:
  - Headline: "Train for HYROX. Built by Athletes."
  - Subheadline: "Personalized training plans tuned to your goals"
  - CTA: "Start Training →" (links to my.roxpt.app/login)
  - Image: Hero workout image

Features Section:
  - 📊 Personalized Plans
  - 🔥 Progress Tracking
  - 🎯 PT Check-ins
  - 💪 HYROX-Specific Workouts

Social Proof:
  - Testimonials
  - Results/transformations

Pricing:
  - Monthly: £X/month
  - Annual: £X/year (save X%)
  - CTA: "Get Started"

Footer:
  - About
  - Contact
  - Terms & Privacy
  - Social links
```

---

## 📝 Checklist

**Before Going Live:**

- [ ] DNS configured for `my.roxpt.app`
- [ ] DNS configured for `roxpt.app`
- [ ] Environment variables set in Vercel
- [ ] Marketing site deployed
- [ ] Test login flow: `roxpt.app` → `my.roxpt.app/login`
- [ ] Test logout: redirects to `roxpt.app`
- [ ] SSL certificates active (auto via Vercel)
- [ ] Mobile app updated with new URL
- [ ] Google Sheets API allows new domain
- [ ] Stripe webhooks updated (if using)
- [ ] Analytics setup (Google Analytics / Plausible)
- [ ] Favicons and meta tags updated

---

## 🔒 Security Updates

### CORS for Google Apps Script:

If using Apps Script for logging, update allowed origins:

```javascript
// In your Apps Script Code.gs
function doPost(e) {
  const allowedOrigins = [
    'https://my.roxpt.app',
    'http://localhost:8081'
  ];
  
  const origin = e.parameter.origin;
  if (allowedOrigins.includes(origin)) {
    // Process request
  }
}
```

### Google Sheets API Restrictions:

In Google Cloud Console → API Credentials:
- Add `https://my.roxpt.app` to allowed referrers
- Add `https://roxpt.app` if marketing site needs API access

---

## 🚀 Quick Deploy Commands

```bash
# Current app (my.roxpt.app)
cd frank-rox
npm run build
npx cap sync android
vercel --prod

# Marketing site (roxpt.app)
cd roxpt-marketing
npm run build
vercel --prod
```

---

## 💡 Pro Tips

1. **Use Vercel Preview URLs** to test before changing DNS
2. **Keep localhost working** - all env vars should have fallbacks
3. **Test on mobile** - both web and app versions
4. **Monitor DNS propagation**: https://dnschecker.org
5. **Set up redirects** on old domain if migrating existing users

---

## 📚 Resources

- Vercel Domains: https://vercel.com/docs/concepts/projects/domains
- DNS Setup: https://vercel.com/docs/concepts/projects/domains/add-a-domain
- Next.js Templates: https://nextjs.org/examples
- Landing Page Inspiration: https://landingfolio.com

---

## 🆘 Troubleshooting

**Domain not working?**
- Check DNS propagation (can take up to 48 hours)
- Verify CNAME records are correct
- Check Vercel project is assigned to correct domain

**API calls failing?**
- Update Google Cloud Console allowed referrers
- Check environment variables are set
- Verify CORS settings in Apps Script

**Mobile app not loading?**
- Update Capacitor config with new URL
- Rebuild: `npm run build && npx cap sync android`
- Clear app cache and reinstall

---

## Next Steps

1. ✅ Set up `my.roxpt.app` (this project)
2. 🆕 Create marketing site for `roxpt.app`
3. 🔗 Link both sites with proper redirects
4. 📱 Update mobile app builds
5. 🚀 Launch!

