/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      'applicationinsights',
      '@azure/cosmos',
      '@azure/storage-blob',
    ],
  },
};

export default nextConfig;
