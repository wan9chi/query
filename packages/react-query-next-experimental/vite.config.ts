import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const viteConfig = defineConfig({
  plugins: [react()],
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
})

export default {
  ...viteConfig,
  run: {
    tasks: {
      compile: {
        command:
          'node ../../node_modules/typescript/lib/tsc.js -p tsconfig.json',
        dependsOn: ['@tanstack/react-query#compile'],
        input: [
          {
            auto: true,
          },
          '!dist-ts/**',
          '!**/*.tsbuildinfo',
          {
            pattern: '!packages/react-query-next-experimental',
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
          'node ../../node_modules/typescript54/lib/tsc.js -p tsconfig.legacy.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript55/lib/tsc.js -p tsconfig.legacy.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript56/lib/tsc.js -p tsconfig.legacy.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript57/lib/tsc.js -p tsconfig.legacy.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript58/lib/tsc.js -p tsconfig.legacy.json --composite false --emitDeclarationOnly false --noEmit',
          'node ../../node_modules/typescript59/lib/tsc.js -p tsconfig.legacy.json --composite false --emitDeclarationOnly false --noEmit',
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
            pattern: '!packages/react-query-next-experimental',
            base: 'workspace',
          },
        ],
        output: ['build/**', 'dist/**', 'dist-cjs/**'],
      },
    },
  },
} as Record<string, unknown>
