// Applies the proposed expo-router fix to the installed expo-router 58.0.31 build (node_modules),
// so the "after" behaviour can be checked without building the monorepo. Source change:
// packages/expo-router/src/global-state/browserHistory.ts and useNavigationTreeReducer.ts.
// Usage: node scripts/apply-fix.mjs [--revert]
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Resolves expo-router from the current working directory, the app whose build gets the fix.
const require = createRequire(process.cwd() + '/');
const dir = require.resolve('expo-router/package.json').replace(/package\.json$/, 'build/global-state/');
const files = {
  browserHistory: dir + 'browserHistory.js',
  reducer: dir + 'useNavigationTreeReducer.js',
};
const revert = process.argv.includes('--revert');

for (const file of Object.values(files)) {
  if (revert) {
    if (existsSync(file + '.orig')) copyFileSync(file + '.orig', file);
    continue;
  }
  if (!existsSync(file + '.orig')) copyFileSync(file, file + '.orig');
}
if (revert) {
  console.log('reverted');
  process.exit(0);
}

if (readFileSync(files.browserHistory, 'utf8').includes('applyReplayedRestore')) {
  console.log('fix already applied to', dir);
  process.exit(0);
}

function replaceOnce(file, from, to) {
  const source = readFileSync(file, 'utf8');
  if (!source.includes(from)) throw new Error(`pattern not found in ${file}:\n${from}`);
  writeFileSync(file, source.replace(from, to));
}

// browserHistory.js: tag the restore reset with the tracked entry id, add applyReplayedRestore.
replaceOnce(
  files.browserHistory,
  `reduce(result, createResetIntent(trackedEntry.state))`,
  `reduce(result, createResetIntent(trackedEntry.state, trackedEntry.id))`
);
replaceOnce(
  files.browserHistory,
  /function createResetIntent\(state\) \{[\s\S]*?\n\}\n/.exec(readFileSync(files.browserHistory, 'utf8'))[0],
  `function createResetIntent(state, restoredEntryId) {
    const action = restoredEntryId === undefined
        ? { type: 'RESET', payload: state, target: state.key }
        : { type: 'RESET', payload: state, target: state.key, browserHistoryEntryId: restoredEntryId };
    return { type: 'ACTION', payload: { action } };
}
function isRestoreAction(action) {
    return action.type === 'RESET' && typeof action.browserHistoryEntryId === 'string';
}
function applyReplayedRestore(history, nextState, config, action) {
    if (!isRestoreAction(action)) {
        return undefined;
    }
    const index = history.entries.findIndex((entry) => entry.id === action.browserHistoryEntryId);
    if (index === -1) {
        return undefined;
    }
    const path = (0, _getPathForState.getPathForState)(nextState, config.linking);
    return selectAndUpdateHistoryEntry(history, index, nextState, path);
}
exports.applyReplayedRestore = applyReplayedRestore;
`
);

// useNavigationTreeReducer.js: project a replayed restore before falling back to the router's instruction.
replaceOnce(
  files.reducer,
  `const projected = operation.type === 'NAVIGATOR_UNMOUNTED' || operation.type === 'NAVIGATOR_CHANGED' ? (0, _browserHistory.updateCurrentHistoryEntry)(next.history, next.state, config) : (0, _browserHistory.applyRouterHistoryAction)(next.history, next.state, config, next.browserHistoryAction);`,
  `let projected;
    if (operation.type === 'NAVIGATOR_UNMOUNTED' || operation.type === 'NAVIGATOR_CHANGED') {
        projected = (0, _browserHistory.updateCurrentHistoryEntry)(next.history, next.state, config);
    } else {
        if (operation.type === 'ACTION') {
            projected = (0, _browserHistory.applyReplayedRestore)(next.history, next.state, config, operation.payload.action);
        }
        projected ??= (0, _browserHistory.applyRouterHistoryAction)(next.history, next.state, config, next.browserHistoryAction);
    }`
);
console.log('fix applied to', dir);
