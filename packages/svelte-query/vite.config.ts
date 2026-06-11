import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { svelteTesting } from '@testing-library/svelte/vite'

import packageJson from './package.json'

const viteConfig = defineConfig({
  plugins: [svelte(), svelteTesting()],
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
    dir: './tests',
    watch: false,
    environment: 'jsdom',
    setupFiles: ['./tests/test-setup.ts'],
    coverage: {
      enabled: !!process.env.CI,
      provider: 'istanbul',
      include: ['src/**/*'],
    },
    typecheck: { enabled: true },
  },
})

export default {
  ...viteConfig,
  run: {
    tasks: {
      compile: {
        command:
          'node ../../node_modules/typescript/lib/tsc.js -p tsconfig.json',
        dependsOn: ['@tanstack/query-core#compile'],
        input: [
          {
            auto: true,
          },
          '!dist-ts/**',
          '!**/*.tsbuildinfo',
          {
            pattern: '!packages/svelte-query',
            base: 'workspace',
          },
        ],
        output: ['dist-ts/**'],
      },
      'test:eslint': {
        command: 'eslint --concurrency=auto ./src ./tests',
        dependsOn: ['compile'],
      },
      'test:types': {
        command: 'svelte-check --tsconfig ./tsconfig.json',
        dependsOn: ['compile'],
        input: [
          {
            auto: true,
          },
          '!dist-ts/**',
          '!**/*.tsbuildinfo',
          '!.svelte-kit/**',
        ],
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
      'test:build': {
        command: 'publint --strict && attw --pack',
        dependsOn: ['build'],
        input: [
          {
            auto: true,
          },
          '!**/*.tgz',
        ],
      },
      build: {
        command: 'svelte-package --input ./src --output ./dist',
        input: [
          {
            auto: true,
          },
          '!build/**',
          '!dist/**',
          '!dist-cjs/**',
          '!.svelte-kit/**',
          '!**/*.tsbuildinfo',
          '!tsup.config.bundled*',
          '!.tsup/**',
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
          {
            pattern: '!packages/svelte-query',
            base: 'workspace',
          },
        ],
        output: ['build/**', 'dist/**', 'dist-cjs/**'],
      },
    },
  },
} as Record<string, unknown>
