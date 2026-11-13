/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/v1/catalog', destination: 'http://127.0.0.1:4002/v1/catalog' },
      { source: '/v1/partners', destination: 'http://127.0.0.1:4002/v1/partners' },
      { source: '/v1/branding', destination: 'http://127.0.0.1:4002/v1/branding' },
      { source: '/v1/branding/:path*', destination: 'http://127.0.0.1:4002/v1/branding/:path*' },
      { source: '/admin', destination: 'http://127.0.0.1:3003/admin' },
      { source: '/admin/:path*', destination: 'http://127.0.0.1:3003/admin/:path*' },
    ];
  },
};
export default nextConfig;
