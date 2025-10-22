# 🎨 Marketing Site Template for roxpt.app

## Quick Setup (5 minutes)

### Option 1: Create with Next.js (Recommended)

```bash
# In a NEW folder (outside frank-rox)
npx create-next-app@latest roxpt-marketing --typescript --tailwind --app

cd roxpt-marketing
npm install framer-motion lucide-react
```

---

## File Structure

```
roxpt-marketing/
├── app/
│   ├── page.tsx              # Homepage
│   ├── pricing/
│   │   └── page.tsx          # Pricing page
│   ├── login/
│   │   └── page.tsx          # Redirect to my.roxpt.app
│   └── layout.tsx            # Root layout
├── components/
│   ├── Hero.tsx              # Hero section
│   ├── Features.tsx          # Features grid
│   ├── Pricing.tsx           # Pricing cards
│   ├── CTA.tsx               # Call-to-action
│   └── Footer.tsx            # Footer
├── public/
│   ├── hero-workout.jpg      # Main hero image
│   └── logo.svg              # RoxPT logo
└── tailwind.config.ts
```

---

## Code Templates

### 1. Homepage (`app/page.tsx`)

```tsx
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
```

### 2. Hero Component (`components/Hero.tsx`)

```tsx
'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/hero-workout.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        <motion.h1 
          className="text-5xl md:text-7xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Train for <span className="text-[#FFCC00]">HYROX</span>
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl mb-8 text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Personalized training plans built by athletes, tuned for you
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-4 justify-center"
        >
          <a 
            href="https://my.roxpt.app/login"
            className="bg-[#FFCC00] text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 transition-all flex items-center gap-2"
          >
            Start Training <ArrowRight className="w-5 h-5" />
          </a>
          
          <a 
            href="#features"
            className="border-2 border-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-black transition-all"
          >
            Learn More
          </a>
        </motion.div>
      </div>
    </section>
  );
}
```

### 3. Features Component (`components/Features.tsx`)

```tsx
import { Flame, Target, LineChart, Users } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Personalized Plans',
    description: 'Training programs tailored to your fitness level and HYROX goals'
  },
  {
    icon: Flame,
    title: 'Track Progress',
    description: 'Log every workout and watch your performance improve over time'
  },
  {
    icon: LineChart,
    title: 'PT Check-Ins',
    description: 'Regular coaching feedback to optimize your training'
  },
  {
    icon: Users,
    title: 'HYROX-Specific',
    description: 'Exercises and workouts designed specifically for HYROX success'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-4 bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
          Everything you need to <span className="text-[#FFCC00]">dominate HYROX</span>
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="text-center p-6 bg-black rounded-xl border border-zinc-800 hover:border-[#FFCC00] transition-all">
              <feature.icon className="w-12 h-12 mx-auto mb-4 text-[#FFCC00]" />
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 4. CTA Component (`components/CTA.tsx`)

```tsx
export default function CTA() {
  return (
    <section className="py-24 px-4 bg-[#FFCC00]">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
          Ready to start training?
        </h2>
        <p className="text-xl text-black/80 mb-8">
          Join hundreds of athletes training smarter for HYROX
        </p>
        <a 
          href="https://my.roxpt.app/login"
          className="inline-block bg-black text-white px-12 py-4 rounded-full font-bold text-lg hover:bg-zinc-800 transition-all"
        >
          Get Started Today
        </a>
      </div>
    </section>
  );
}
```

### 5. Footer Component (`components/Footer.tsx`)

```tsx
export default function Footer() {
  return (
    <footer className="bg-black border-t border-zinc-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-xl mb-4">RoxPT</h3>
            <p className="text-gray-400">
              Professional HYROX training programs designed for athletes of all levels
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="https://my.roxpt.app/login" className="hover:text-white">Login</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/about" className="hover:text-white">About</a></li>
              <li><a href="/contact" className="hover:text-white">Contact</a></li>
              <li><a href="/terms" className="hover:text-white">Terms</a></li>
              <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-zinc-800 pt-8 text-center text-gray-400">
          <p>&copy; 2025 RoxPT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

### 6. Login Redirect Page (`app/login/page.tsx`)

```tsx
'use client';

import { useEffect } from 'react';

export default function LoginRedirect() {
  useEffect(() => {
    // Redirect to app
    window.location.href = 'https://my.roxpt.app/login';
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#FFCC00] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-xl">Redirecting to login...</p>
      </div>
    </div>
  );
}
```

### 7. Pricing Page (`app/pricing/page.tsx`)

```tsx
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Monthly',
    price: '£29',
    period: '/month',
    features: [
      'Personalized training plans',
      'Exercise library & demos',
      'Progress tracking',
      'PT check-ins (bi-weekly)',
      'Mobile app access'
    ]
  },
  {
    name: 'Annual',
    price: '£249',
    period: '/year',
    badge: 'SAVE 28%',
    features: [
      'Everything in Monthly',
      '2 months free',
      'Priority PT support',
      'Race day strategy guide',
      'Nutrition templates'
    ]
  }
];

export default function Pricing() {
  return (
    <main className="min-h-screen bg-black text-white py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-4">
          Simple, Transparent <span className="text-[#FFCC00]">Pricing</span>
        </h1>
        <p className="text-xl text-center text-gray-400 mb-16">
          Choose the plan that works for you
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <div 
              key={i}
              className={`bg-zinc-900 rounded-2xl p-8 border-2 ${
                plan.badge ? 'border-[#FFCC00]' : 'border-zinc-800'
              } relative`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFCC00] text-black px-4 py-1 rounded-full text-sm font-bold">
                  {plan.badge}
                </div>
              )}
              
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold">{plan.price}</span>
                <span className="text-gray-400">{plan.period}</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[#FFCC00] flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <a
                href="https://my.roxpt.app/login"
                className={`block text-center py-4 rounded-full font-bold transition-all ${
                  plan.badge 
                    ? 'bg-[#FFCC00] text-black hover:bg-yellow-400' 
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
```

---

## Tailwind Config (`tailwind.config.ts`)

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        yellow: {
          400: '#FFCC00',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

---

## Deploy to Vercel

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial marketing site"
git remote add origin https://github.com/yourusername/roxpt-marketing.git
git push -u origin main

# 2. Import to Vercel
# Go to vercel.com → New Project → Import roxpt-marketing
# Add domain: roxpt.app

# 3. Done! 🎉
```

---

## Customization

### Change Colors:
Replace `#FFCC00` with your brand color throughout

### Add Images:
Place in `/public/` folder and reference as `/image-name.jpg`

### Add Analytics:
Install `@vercel/analytics`:
```bash
npm install @vercel/analytics
```

Then in `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Next Steps

1. ✅ Create marketing site with this template
2. 🎨 Customize with your brand assets
3. 📸 Add hero images and screenshots
4. 🚀 Deploy to Vercel with `roxpt.app` domain
5. 🔗 Test redirect flow to `my.roxpt.app`

