import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isStandalone = process.env.OUTPUT_STANDALONE === 'true' || process.platform !== 'win32';

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  ...(isStandalone
    ? {
        output: 'standalone',
      }
    : {}),
  transpilePackages: ['@bodhai/ui', '@bodhai/engine-ts', '@bodhai/api-client'],
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const targetApiUrl =
      rawApiUrl && !rawApiUrl.includes('bodhai-api.onrender.com')
        ? rawApiUrl
        : 'https://bodhai-kqwj.onrender.com';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${targetApiUrl}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
