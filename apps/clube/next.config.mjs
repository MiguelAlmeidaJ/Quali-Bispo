/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/admin', destination: 'http://127.0.0.1:3003/admin' },
      { source: '/admin/:path*', destination: 'http://127.0.0.1:3003/admin/:path*' },
    ];
  },
};
export default nextConfig;
