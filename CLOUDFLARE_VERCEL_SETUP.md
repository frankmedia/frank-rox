# 🌐 Cloudflare + Vercel Setup Guide

Complete guide to set up `roxpt.app` and `my.roxpt.app` with Cloudflare DNS and Vercel hosting.

---

## 📋 Overview

**What You're Setting Up:**
- `roxpt.app` → Marketing site (Next.js in `/roxpt-marketing`)
- `my.roxpt.app` → Training app (React/Vite in `/frank-rox`)

**Where:**
- **DNS**: Cloudflare (manages your domain)
- **Hosting**: Vercel (hosts both sites)

---

## Part 1️⃣: Vercel Setup (Deploy Your Apps)

### **Step 1: Deploy Training App (my.roxpt.app)**

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Login with GitHub

2. **Import Your Current Project**
   - Click "Add New" → "Project"
   - Select your repository: `frank-rox` (or whatever it's called)
   - Click "Import"

3. **Configure Build Settings**
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   VITE_GOOGLE_SHEETS_API_KEY=AIzaSyBDHQQIMjCQ9-RjpPQ4_uQ7S5vpfBRH24I
   VITE_MASTER_SHEET_ID=19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   VITE_APP_URL=https://my.roxpt.app
   VITE_MARKETING_URL=https://roxpt.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes
   - ✅ You'll get a URL like: `frank-rox-abc123.vercel.app`

6. **Add Custom Domain**
   - After deployment, go to: **Settings** → **Domains**
   - Click "Add Domain"
   - Enter: `my.roxpt.app`
   - Click "Add"
   - **Don't configure DNS yet** - we'll do that in Cloudflare

---

### **Step 2: Deploy Marketing Site (roxpt.app)**

1. **Push Marketing Site to GitHub** (if you created it)
   ```bash
   cd /Users/frank/frank-rox/roxpt-marketing
   git remote add origin https://github.com/YOUR_USERNAME/roxpt-marketing.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - In Vercel Dashboard: "Add New" → "Project"
   - Select: `roxpt-marketing` repository
   - Click "Import"

3. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: (auto-detected)
   Output Directory: (auto-detected)
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes
   - ✅ You'll get a URL like: `roxpt-marketing-xyz789.vercel.app`

5. **Add Custom Domain**
   - After deployment, go to: **Settings** → **Domains**
   - Click "Add Domain"
   - Enter: `roxpt.app`
   - Click "Add"
   - Vercel will show you need to configure DNS

---

## Part 2️⃣: Cloudflare Setup (Configure DNS)

### **Step 1: Access Cloudflare DNS**

1. **Login to Cloudflare**
   - Go to: https://dash.cloudflare.com
   - Select your domain: **roxpt.app**

2. **Navigate to DNS Settings**
   - Click on your domain
   - Click "DNS" in the left sidebar
   - Click "Records"

---

### **Step 2: Configure DNS Records**

**Delete any existing A/CNAME records for @ and my (if they exist)**

Then add these records:

#### **For roxpt.app (Marketing Site)**

| Type | Name | Target | Proxy Status | TTL |
|------|------|--------|--------------|-----|
| CNAME | @ | cname.vercel-dns.com | DNS only (gray cloud) | Auto |

**Alternative (if CNAME @ doesn't work):**

| Type | Name | Target | Proxy Status | TTL |
|------|------|--------|--------------|-----|
| A | @ | 76.76.21.21 | DNS only (gray cloud) | Auto |

#### **For my.roxpt.app (Training App)**

| Type | Name | Target | Proxy Status | TTL |
|------|------|--------|--------------|-----|
| CNAME | my | cname.vercel-dns.com | DNS only (gray cloud) | Auto |

---

### **Step 3: Important Cloudflare Settings**

#### **🔴 CRITICAL: Turn OFF Proxy (Gray Cloud)**

- Make sure the cloud icon next to each record is **GRAY** (not orange)
- Orange = Cloudflare proxy (will break Vercel SSL)
- Gray = DNS only (required for Vercel)

#### **SSL/TLS Settings**

1. Go to: **SSL/TLS** → **Overview**
2. Set encryption mode to: **Full (strict)**
3. Go to: **SSL/TLS** → **Edge Certificates**
4. Enable:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2

---

### **Step 4: Verify DNS in Vercel**

1. **Go back to Vercel**
   - Open the project for training app (`frank-rox`)
   - Go to: **Settings** → **Domains**
   - Find: `my.roxpt.app`

2. **Check Status**
   - If configured correctly, you'll see: ✅ **Valid Configuration**
   - If not, it will show pending with instructions

3. **Repeat for Marketing Site**
   - Open the marketing project (`roxpt-marketing`)
   - Go to: **Settings** → **Domains**
   - Find: `roxpt.app`
   - Should show: ✅ **Valid Configuration**

---

## Part 3️⃣: Wait for DNS Propagation

**Time Required**: 5 minutes to 48 hours (usually 10-30 minutes)

### **Check Propagation Status**

Use these tools to check if DNS is live:

1. **DNS Checker**
   - Visit: https://dnschecker.org
   - Enter: `my.roxpt.app`
   - Should resolve to Vercel IP

2. **Command Line**
   ```bash
   # Check my.roxpt.app
   dig my.roxpt.app
   
   # Check roxpt.app
   dig roxpt.app
   ```

3. **Simple Test**
   - Open incognito browser
   - Visit: `https://my.roxpt.app`
   - If it loads → ✅ DNS working!

---

## Part 4️⃣: Verify SSL Certificates

Vercel will automatically provision SSL certificates once DNS is configured.

### **Check SSL Status in Vercel**

1. Go to project → **Settings** → **Domains**
2. Each domain should show:
   - ✅ Valid Configuration
   - 🔒 SSL Certificate: **Active**

**If SSL is pending:**
- Wait 5-10 minutes
- Vercel auto-provisions via Let's Encrypt
- Check Cloudflare proxy is OFF (gray cloud)

---

## 🎯 **Quick Reference: DNS Records Summary**

Copy/paste these into Cloudflare:

```
Type: CNAME
Name: @
Target: cname.vercel-dns.com
Proxy: OFF (gray cloud)
TTL: Auto

Type: CNAME
Name: my
Target: cname.vercel-dns.com
Proxy: OFF (gray cloud)
TTL: Auto
```

---

## ✅ **Final Checklist**

### **Vercel**
- [ ] Training app deployed (`frank-rox`)
- [ ] Marketing site deployed (`roxpt-marketing`)
- [ ] Domain `my.roxpt.app` added to training app
- [ ] Domain `roxpt.app` added to marketing site
- [ ] Environment variables set for training app
- [ ] Both deployments show green status

### **Cloudflare**
- [ ] CNAME record for `@` pointing to `cname.vercel-dns.com`
- [ ] CNAME record for `my` pointing to `cname.vercel-dns.com`
- [ ] Both records have **gray cloud** (proxy OFF)
- [ ] SSL/TLS mode set to "Full (strict)"
- [ ] "Always Use HTTPS" enabled

### **Testing**
- [ ] `https://roxpt.app` loads marketing site
- [ ] `https://my.roxpt.app` loads training app
- [ ] SSL certificate valid (🔒 in browser)
- [ ] Login redirects work between sites
- [ ] No mixed content warnings

---

## 🆘 **Troubleshooting**

### **Problem: DNS not resolving**
**Solution:**
1. Check Cloudflare proxy is OFF (gray cloud)
2. Verify CNAME target is `cname.vercel-dns.com` (not project URL)
3. Wait 30 minutes for propagation
4. Clear browser cache / try incognito

### **Problem: SSL certificate error**
**Solution:**
1. Ensure Cloudflare SSL mode is "Full (strict)"
2. Turn OFF Cloudflare proxy (gray cloud)
3. Wait 10 minutes for Vercel to provision cert
4. Check in Vercel: Settings → Domains → SSL status

### **Problem: "Too Many Redirects" error**
**Solution:**
1. Cloudflare SSL mode must be "Full (strict)" (not "Flexible")
2. Turn OFF Cloudflare proxy
3. Clear browser cache

### **Problem: Marketing site not loading**
**Solution:**
1. Check you pushed `roxpt-marketing` to GitHub
2. Verify Vercel build succeeded (check build logs)
3. Check domain is added in Vercel settings
4. Verify DNS CNAME record exists

### **Problem: Training app API calls failing**
**Solution:**
1. Check environment variables in Vercel
2. Update Google Sheets API allowed referrers:
   - Go to: Google Cloud Console
   - APIs & Services → Credentials
   - Edit API key
   - Add: `https://my.roxpt.app/*`
3. Update Apps Script CORS (if using):
   - Add `https://my.roxpt.app` to allowed origins

---

## 📚 **Documentation Links**

- **Vercel Domains**: https://vercel.com/docs/concepts/projects/domains
- **Cloudflare DNS**: https://developers.cloudflare.com/dns/
- **DNS Propagation Checker**: https://dnschecker.org
- **SSL Test**: https://www.ssllabs.com/ssltest/

---

## 🚀 **Next Steps After Setup**

1. **Update Mobile App** (Capacitor):
   ```typescript
   // capacitor.config.ts
   server: {
     url: 'https://my.roxpt.app'
   }
   ```

2. **Update Google Sheets API** (if restricted):
   - Add `https://my.roxpt.app/*` to allowed referrers

3. **Test User Flow**:
   - User visits `roxpt.app`
   - Clicks "Start Training"
   - Redirects to `my.roxpt.app/login`
   - Logs in → Training app loads
   - Clicks logout → Redirects back to `roxpt.app`

4. **Set Up Analytics** (optional):
   - Google Analytics
   - Vercel Analytics
   - Plausible

5. **Monitor Performance**:
   - Vercel Dashboard → Analytics
   - Check load times
   - Monitor error rates

---

## ⚡ **Pro Tips**

1. **Use Vercel Preview URLs** to test before changing DNS
2. **Keep Cloudflare proxy OFF** - Vercel handles CDN + SSL
3. **Environment variables** - Set in Vercel, not in code
4. **Git branches** - Vercel auto-deploys `main` branch
5. **Redeploy** if env vars change: Settings → Deployments → Redeploy

---

**Estimated Total Time**: 30-60 minutes (including DNS propagation)

Good luck! 🎉

