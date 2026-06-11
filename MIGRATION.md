# Nx → Vite Task (`vp run`) migration notes

This branch replaces Nx (orchestrator + cache + nx cloud) with [Vite Task](https://viteplus.dev/guide/run) (`vp run`, part of Vite+) for the `packages/*` pipeline.

## What changed

- `nx.json`, the root `"nx"` config block, `nx`/`nx-cloud` usage in scripts are gone; each package now declares its targets as **tasks** in its `vite.config.ts` `run` block (`compile`, `build`, `test:eslint`, `test:lib`, `test:types`, `test:build`). The corresponding package.json scripts were removed (a name can't be both a script and a task); `test:lib:dev`/`clean` stay as plain uncached scripts.
- Root-level Nx "included scripts" (`test:sherif`, `test:knip`, `test:docs`, `test:size`) became root tasks in a new root `vite.config.ts`.
- Root `test:ci` is now a Vite Task **tree-model pipeline** — a chain of `vp run` phases that expand in-process into one cached task graph:
  `compile && sherif && knip && docs && eslint && lib && types && build && test:build`
- `tsc --build` → `tsc -p tsconfig.json` in `compile` tasks (see below).

## Verified results (vp 0.1.24, macOS arm64)

| pipeline | tasks | warm re-run |
|---|---|---|
| `vp run --filter './packages/*' compile` | 25 | 25/25 (100%) |
| `… build` | 34 | 34/34 (100%) |
| `… test:eslint` | 52 | 52/52 (100%) |
| `… test:lib` (vitest) | 31 | 31/31 (100%) |
| `… test:types` (8 TS versions) | 191 | 191/191 (100%) |
| `… test:build` (pack+publint+attw) | 84 | 84/84 (100%) |
| **`vp run test:ci` (everything)** | **420** | **420/420 (100%), 538s saved** |

Selective invalidation: editing `query-core/src/index.ts` re-ran query-core + the 22 dependents that bundle its source; reverting restored all but query-core's own slot to cache hits.

## Nx ↔ Vite Task translation

| nx.json | here |
|---|---|
| `targetDefaults.X.dependsOn: ["^compile"]` | implicit topological ordering of same-named tasks (pnpm `workspace:` graph) when selecting multiple packages; local prerequisites via `dependsOn: ['compile']` |
| `namedInputs.default` (`!**/*.md`) | automatic input tracking — unread files like markdown never enter the fingerprint, no config needed |
| `namedInputs.sharedGlobals` (root tsconfig, scripts/*) | automatic — fspy records actual reads of root files |
| `inputs: ["default", "^production"]` | automatic; dependents' fingerprints include the dep files they actually read (e.g. emitted `.d.ts`), giving *content-based* early cutoff that nx's hash cascade can't do |
| `outputs: ["{projectRoot}/dist-ts"]` | per-task `output: ['dist-ts/**']`, archived/restored |
| `nx run-many --targets=a,b,c` | `vp run a && vp run b && vp run c` (root script; phases expand in-process) |
| `nx affected` | **no equivalent** — `test:pr` now just runs `test:ci` (cache makes unaffected tasks ~free, but scheduling/log noise remains) |
| nx cloud remote cache | **no equivalent** (local cache only) |
| `nx watch --all` | **no equivalent**; `watch`/`dev` degrade to one-shot builds |

## Gotchas found (also fed upstream)

- **`tsc --build` is incompatible with per-package caching**: composite project references make a *downstream* compile rewrite an *upstream* package's `dist-ts` whenever mtimes/tsbuildinfo disagree (e.g. after vp restores outputs from archive) — cross-package read-write overlap, tasks never cache. Fix: `tsc -p tsconfig.json` per package and let vp's topological ordering do what `--build` did. (191/191 after the switch; with `--build` it plateaued at 94%.)
- **vitest typecheck mode** writes `…/vitest/dist/tsconfig.tmp.tsbuildinfo` inside the pnpm store → `{ pattern: '!node_modules/**/*.tsbuildinfo', base: 'workspace' }` input exclusion on `test:lib`.
- **`pnpm pack` + `prepack` lifecycle** (angular package) rewrites `dist/README.md`/`dist/package.json` → targeted input exclusions + `--pack-destination .pack`.
- **knip can't see task commands**: binaries/deps referenced only in `vite.config.ts` `run.tasks` show as unused/unlisted → `ignoreDependencies`/`ignoreBinaries` entries (publint, attw, sherif, svelte-check, vue-tsc, `vp` itself).
- **sherif** flagged an empty `devDependencies` left over from script removal.
- A failing task's output replay can be confusing while iterating: failed runs are never cached, but *stale successful* entries replay until inputs change — use `--no-cache` when debugging tool config changes that live outside tracked inputs.

## Daily commands

```bash
pnpm build               # = vp run --filter './packages/*' build
pnpm test:lib            # vitest across packages, cached
pnpm test:ci             # full 420-task pipeline
vp run -t @tanstack/react-query#build   # one package + its deps
vp run --last-details    # why did something miss?
vp cache clean
```

Not migrated: `examples/**`, `integrations/**` (nx never built these here either — they're `ignoreWorkspaces` in knip and excluded in CI), docs site. CI workflows still reference nx for affected-PR logic and would need `vp` + cache persistence (`node_modules/.vite/task-cache`) to migrate.
