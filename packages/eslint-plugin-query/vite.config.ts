import { defineConfig, mergeConfig } from 'vitest/config'
import { tanstackViteConfig } from '@tanstack/vite-config'

import packageJson from './package.json'

const config = defineConfig({
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
      include: ['src/**/*'],
      exclude: ['src/__tests__/**'],
    },
    typecheck: { enabled: true },
    restoreMocks: true,
  },
})

const viteConfig = mergeConfig(
  config,
  tanstackViteConfig({
    entry: './src/index.ts',
    srcDir: './src',
    exclude: ['./src/__tests__'],
  }),
)

export default {
  ...viteConfig,
  run: {
    tasks: {
      compile: {
        command:
          'node ../../node_modules/typescript/lib/tsc.js -p tsconfig.json',
        input: [
          {
            auto: true,
          },
          '!dist-ts/**',
          '!**/*.tsbuildinfo',
          {
            pattern: '!packages/eslint-plugin-query',
            base: 'workspace',
          },
        ],
        output: ['dist-ts/**'],
      },
      'test:eslint': {
        command: 'eslint --concurrency=auto ./src',
        dependsOn: ['compile'],
      },
      'test:types': {
        command: [
          'node ../../node_modules/typescript54/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript55/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript56/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript57/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript58/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript59/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript60/lib/tsc.js -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
        ],
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
        command: 'tsup --tsconfig tsconfig.prod.json',
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
            pattern: '!packages/eslint-plugin-query',
            base: 'workspace',
          },
        ],
        output: ['build/**', 'dist/**', 'dist-cjs/**'],
      },
    },
  },
} as Record<string, unknown>
