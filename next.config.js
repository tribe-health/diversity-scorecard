/** @type {import('next').NextConfig} */
export default {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
      path: 'path-browserify'
    };

    // Handle binary files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource'
    });

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: '*.mypinata.cloud',
      }
    ],
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          }
        ],
      }
    ];
  }
}; 