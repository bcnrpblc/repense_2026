/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  webpack: (config, { isServer }) => {
    // Exclude Prisma from client bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      config.externals = config.externals || [];
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
        'prisma': 'commonjs prisma',
      });
    }
    return config;
  },
}

module.exports = nextConfig
