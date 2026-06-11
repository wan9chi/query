import { defineConfig } from 'vitest/config'

import packageJson from './package.json'

const viteConfig = defineConfig({
  // fix from https://github.com/vitest-dev/vitest/issues/6992#issuecomment-2509408660
  resolve: {
    conditions: ['@tanstack/custom-condition'],
  },
  environments: {
    ssr: {
      resolve: {
        conditions: ['@tanstack/custom-condition'],
      },
    },
  },
  test: {
    name: packageJson.name,
    dir: './src',
    watch: false,
    globals: true,
    coverage: {
      enabled: !!process.env.CI,
      provider: 'istanbul',
      include: ['src/**/*.{js,ts,cjs,mjs,jsx,tsx}'],
    },
    typecheck: { enabled: true },
    restoreMocks: true,
  },
})

export default {
  ...viteConfig,
  run: {
    tasks: {
      'test:eslint': {
        command: 'eslint --concurrency=auto ./src',
      },
      'test:lib': {
        command: 'vitest',
        env: ['CI'],
        input: [
          {
            pattern: '!node_modules/**/*.tsbuildinfo',
            base: 'workspace',
          },
          {
            auto: true,
          },
          '!coverage/**',
          '!**/*.tsbuildinfo',
          '!node_modules/.vite-temp/**',
          '!node_modules/.vite/**',
          {
            pattern: '!node_modules/.vite-temp/**',
            base: 'workspace',
          },
          {
            pattern: '!node_modules/.vite/**',
            base: 'workspace',
          },
        ],
        output: ['coverage/**'],
      },
    },
  },
} as Record<string, unknown>
