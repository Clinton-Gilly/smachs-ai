/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  async rewrites() {
    const rawUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const backendUrl = rawUrl.trim().replace(/\/api\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
