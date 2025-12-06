import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inline server-side environment variables at build time for Amplify SSR
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
};

export default nextConfig;
