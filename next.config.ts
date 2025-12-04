import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose server-side environment variables to the runtime
  serverRuntimeConfig: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
  // Make these available during build and runtime
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
};

export default nextConfig;
