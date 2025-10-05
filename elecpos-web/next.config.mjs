/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  // لو الريبو monorepo وهذا هو مجلد التطبيق:
  // outputFileTracingRoot: __dirname, // غالبًا ما تحتاجهاش، فقط لو التحذير مزعج
}
export default nextConfig
