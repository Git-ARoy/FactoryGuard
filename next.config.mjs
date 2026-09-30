/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: [
      'applicationinsights',
      '@azure/cosmos',
      '@azure/storage-blob',
    ],
  },
};

export default nextConfig;
