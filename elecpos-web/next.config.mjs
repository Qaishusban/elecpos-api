// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // لا تضف config.webpack ولا أي rules تخص CSS
  experimental: { optimizePackageImports: ['lucide-react'] }, // اختياري
};

export default nextConfig;
