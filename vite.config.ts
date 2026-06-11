// Workspace-root Vite Task config (replaces the nx "includedScripts" root targets).
// Run with `vp run <task>` from the repo root, e.g. `vp run test:knip`.
export default {
  run: {
    tasks: {
      'test:sherif': {
        command: 'sherif -i typescript -p "./integrations/*" -p "./examples/*"',
      },
      'test:knip': {
        command: 'knip --treat-config-hints-as-errors',
        input: [{ auto: true }, '!node_modules/.cache/**'],
      },
      'test:docs': {
        command: 'node scripts/verify-links.ts',
      },
      'test:size': {
        command: 'size-limit',
        dependsOn: ['@tanstack/react-query#build'],
        input: [{ auto: true }, '!node_modules/.cache/**'],
      },
    },
  },
}
