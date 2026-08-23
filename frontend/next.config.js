/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@react-pdf-viewer/core', '@react-pdf-viewer/default-layout'],
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;
