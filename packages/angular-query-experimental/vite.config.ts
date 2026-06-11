import { defineConfig, mergeConfig } from 'vitest/config'
import { externalizeDeps } from 'vite-plugin-externalize-deps'
import tsconfigPaths from 'vite-tsconfig-paths'
import dts from 'vite-plugin-dts'
import packageJson from './package.json'
import type { Options } from '@tanstack/vite-config'

function ensureImportFileExtension({
  content,
  extension,
}: {
  content: string
  extension: string
}) {
  // replace e.g. `import { foo } from './foo'` with `import { foo } from './foo.js'`
  content = content.replace(
    /(im|ex)port\s[\w{}/*\s,]+from\s['"](?:\.\.?\/)+?[^.'"]+(?=['"];?)/gm,
    `$&.${extension}`,
  )

  // replace e.g. `import('./foo')` with `import('./foo.js')`
  content = content.replace(
    /import\(['"](?:\.\.?\/)+?[^.'"]+(?=['"];?)/gm,
    `$&.${extension}`,
  )
  return content
}

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
    environment: 'jsdom',
    setupFiles: ['test-setup.ts'],
    coverage: {
      enabled: !!process.env.CI,
      provider: 'istanbul',
      include: ['src/**/*'],
      exclude: ['src/__tests__/**'],
    },
    typecheck: { enabled: true },
    globals: true,
    restoreMocks: true,
  },
})

// copy from @tanstack/config/vite with changes:
// - build - lib - fileName: [name.mjs]
// - rollup - output - preserveModulesRoot: src
export const tanstackViteConfig = (options: Options) => {
  const outDir = options.outDir ?? 'dist'
  const cjs = options.cjs ?? true

  return defineConfig({
    plugins: [
      externalizeDeps({ include: options.externalDeps ?? [] }),
      tsconfigPaths({
        projects: options.tsconfigPath ? [options.tsconfigPath] : undefined,
      }),
      dts({
        outDir,
        entryRoot: options.srcDir,
        include: options.srcDir,
        exclude: options.exclude,
        tsconfigPath: options.tsconfigPath,
        compilerOptions: {
          module: 99, // ESNext
          declarationMap: false,
        },
        beforeWriteFile: (filePath, content) => {
          return {
            filePath,
            content: ensureImportFileExtension({ content, extension: 'js' }),
          }
        },
        afterDiagnostic: (diagnostics) => {
          if (diagnostics.length > 0) {
            console.error('Please fix the above type errors')
            process.exit(1)
          }
        },
      }),
    ],
    build: {
      outDir,
      minify: false,
      sourcemap: true,
      lib: {
        entry: options.entry,
        formats: cjs ? ['es', 'cjs'] : ['es'],
        fileName: () => '[name].mjs',
      },
      rollupOptions: {
        output: {
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
      },
    },
  })
}

const viteConfig = mergeConfig(
  config,
  tanstackViteConfig({
    cjs: false,
    entry: [
      './src/index.ts',
      './src/inject-queries-experimental/index.ts',
      './src/devtools-panel/index.ts',
      './src/devtools-panel/stub.ts',
      './src/devtools/index.ts',
      './src/devtools/stub.ts',
    ],
    exclude: ['src/__tests__'],
    srcDir: './src',
    tsconfigPath: 'tsconfig.prod.json',
  }),
)

export default {
  ...viteConfig,
  run: {
    tasks: {
      compile: {
        command:
          'node ../../node_modules/typescript/lib/tsc.js -p tsconfig.json',
        // tsconfig.json references both projects, but package.json only
        // depends on query-core, so there is no implicit workspace ordering
        // for query-devtools — it must be an explicit task dependency.
        dependsOn: [
          '@tanstack/query-core#compile',
          '@tanstack/query-devtools#compile',
        ],
        input: [
          {
            auto: true,
          },
          '!dist-ts/**',
          '!**/*.tsbuildinfo',
          {
            pattern: '!packages/angular-query-experimental',
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
        command:
          'pnpm pack --pack-destination .pack && publint .pack/*.tgz --strict && attw .pack/*.tgz; premove .pack',
        dependsOn: ['build'],
        input: [
          '!.pack/**',
          '!dist/README.md',
          '!dist/package.json',
          {
            auto: true,
          },
          '!**/*.tgz',
        ],
      },
      build: {
        command: 'vite build',
        // query-devtools is only an optionalDependency, which does not create
        // a workspace graph edge in vp, so the build ordering must be explicit
        // (the vite build resolves @tanstack/query-devtools' published types
        // from its build/ output).
        dependsOn: ['@tanstack/query-devtools#build'],
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
            pattern: '!packages/angular-query-experimental',
            base: 'workspace',
          },
        ],
        output: ['build/**', 'dist/**', 'dist-cjs/**'],
      },
    },
  },
} as Record<string, unknown>
