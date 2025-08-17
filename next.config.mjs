/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for ChunkLoadError in Next.js 15
  experimental: {
    optimizePackageImports: ['@heroui/react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  
  // Webpack configuration to handle module resolution issues
  webpack: (config, { isServer }) => {
    // Fix for potential module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Add extension resolution order
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];

    return config;
  },

  // Transpile packages that might cause issues
  transpilePackages: ['@heroui/react', '@heroui/theme'],
  
  // Disable static optimization for problematic pages
  staticPageGenerationTimeout: 1000,
};

export default nextConfig;
