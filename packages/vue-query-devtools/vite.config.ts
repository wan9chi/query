import { defineConfig, mergeConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { tanstackViteConfig } from '@tanstack/vite-config'

import packageJson from './package.json'

const config = defineConfig({
  plugins: [vue()],
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
    environment: 'jsdom',
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
    entry: ['src/index.ts', 'src/production.ts'],
    srcDir: 'src',
  }),
)

export default {
  ...viteConfig,
  run: {
    tasks: {
      compile: {
        // NOT `vue-tsc --build`: this package pins TypeScript 5.8.3 for vue-tsc,
        // and tsc/vue-tsc `--build` rebuilds referenced sibling projects in place
        // whenever their .tsbuildinfo was stamped by a different TS version,
        // which makes every dependent task permanently uncacheable
        // (read-write overlap). `-p` mode type-checks against the already-built
        // dist-ts of the references (guaranteed fresh via dependsOn) without
        // rebuilding them.
        command: 'vue-tsc -p tsconfig.json',
        dependsOn: [
          '@tanstack/query-devtools#compile',
          '@tanstack/vue-query#compile',
        ],
        input: [
          {
            auto: true,
          },
          '!dist-ts/**',
          '!**/*.tsbuildinfo',
          '!node_modules/.vue-global-types/**',
          {
            pattern: '!packages/vue-query-devtools',
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
        // see `compile` for why this is not `vue-tsc --build`; noEmit keeps
        // this a pure typecheck so it never rewrites dist-ts
        command:
          'vue-tsc -p tsconfig.json --composite false --emitDeclarationOnly false --noEmit',
        dependsOn: ['compile'],
        input: [
          {
            auto: true,
          },
          '!dist-ts/**',
          '!**/*.tsbuildinfo',
          '!node_modules/.vue-global-types/**',
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
          '!node_modules/.vue-global-types/**',
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
        command: 'vite build',
        dependsOn: ['compile'],
        input: [
          {
            auto: true,
          },
          '!build/**',
          '!dist/**',
          '!dist-cjs/**',
          '!.svelte-kit/**',
          '!**/*.tsbuildinfo',
          '!node_modules/.vue-global-types/**',
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
            pattern: '!packages/vue-query-devtools',
            base: 'workspace',
          },
        ],
        output: ['build/**', 'dist/**', 'dist-cjs/**'],
      },
    },
  },
} as Record<string, unknown>
