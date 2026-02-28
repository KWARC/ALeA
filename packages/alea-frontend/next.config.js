//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');
const { withSentryConfig } = require('@sentry/nextjs');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    // Set this to true if you would like to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  i18n: {
    locales: ['en', 'de'],
    defaultLocale: 'en',
  },
  modularizeImports: {
    // https://github.com/vercel/next.js/issues/46756
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },
  webpack: (config, options) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fix for markdown-it v14 module resolution
    // markdown-it v14 uses ES modules but Next.js SSR needs CommonJS
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    config.resolve.alias['markdown-it'] = require.resolve('markdown-it/dist/index.cjs.js');

    return config;
  },
  experimental: {
    middlewareClientMaxBodySize: 2 * 1024 * 1024 * 1024, // 2GB
  },
};

const withSentry = (config) =>
  withSentryConfig(config, {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: 'alea-m4',
    project: 'alea-nextjs',
    //publicRuntimeConfig
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    // transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: '/monitoring',

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  });

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
  withSentry,
];

module.exports = composePlugins(...plugins)(nextConfig);
