import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env (both .env and process.env)
  const env = loadEnv(mode, process.cwd(), "");
  // Bridge non-VITE_* to VITE_* so you can use the same names everywhere
  const defineVars = {
    __VITE_STRAVA_CLIENT_ID__: JSON.stringify(env.VITE_STRAVA_CLIENT_ID || env.STRAVA_CLIENT_ID || ""),
    __VITE_STRAVA_REDIRECT_URI__: JSON.stringify(env.VITE_STRAVA_REDIRECT_URI || env.STRAVA_REDIRECT_URI || ""),
    // Supabase: allow using SUPABASE_URL / NEXT_PUBLIC_* without duplicating as VITE_*
    __VITE_SUPABASE_URL__: JSON.stringify(
      env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ""
    ),
    __VITE_SUPABASE_ANON_KEY__: JSON.stringify(
      env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""
    ),
    // Google AI (only model name - API key is server-side only)
    __VITE_GOOGLE_AI_MODEL__: JSON.stringify(env.VITE_GOOGLE_AI_MODEL || env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp"),
  };

  return {
  server: {
    host: "::",
    port: 8081,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "android-chrome-192x192.png", "android-chrome-512x512.png", "apple-touch-icon.png"],
      manifest: {
        name: "RoxPT - Hyrox Training",
        short_name: "RoxPT",
        description: "Your personalized Hyrox training programme. Built for Hyrox. Tuned for You.",
        theme_color: "#FFCC00",
        background_color: "#000000",
        display: "standalone",
        scope: "/",
        start_url: "/",
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
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sheets\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "google-sheets-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(jpg|jpeg|png|gif|webp|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  define: defineVars,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@capacitor/haptics": path.resolve(__dirname, "./src/utils/hapticsBridge.ts"),
    },
  },
  };
});
