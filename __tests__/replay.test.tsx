// Drives expo-router's navigation reducer the way the app does: a root navigator whose only
// route holds the layout Stack. Fails on expo-router 58.0.31, passes after `npm run fix`.
import { act, renderHook } from '@testing-library/react-native';

import { StackRouter } from '../node_modules/expo-router/build/react-navigation/routers';
import { useNavigationTreeReducer } from '../node_modules/expo-router/build/global-state/useNavigationTreeReducer';

jest.mock('../node_modules/expo-router/build/global-state/getPathForState', () => ({
  getPathForState: (state: any) => {
    const focused = state.routes[state.index];
    const child = focused?.state;
    return child ? `/${child.routes[child.index].name}` : `/${focused.name}`;
  },
}));

const names = ['index', 'page'];
const child: any = {
  stale: false, type: 'stack', key: 'child', routeKeySeq: 0, index: 0,
  routeNames: names, routes: [{ key: 'index', name: 'index' }],
};
const root: any = {
  stale: false, type: 'stack', key: 'root', routeKeySeq: 0, index: 0,
  routeNames: ['layout'], routes: [{ key: 'layout', name: 'layout', state: child }],
};

function entry(routeNames: string[]) {
  const router = StackRouter({});
  return {
    reduce: (state: any, action: any) =>
      router.getStateForAction(state, action, { routeNames, routeGetIdList: {} }),
    getBrowserHistoryForRouteFocus: (p: any, n: any, c: any) =>
      router.getBrowserHistoryForRouteFocus?.(p, n, c),
    shouldActionChangeFocus: () => false,
    getStateForRouteFocus: (state: any) => state,
  };
}
const registry = new Map([['root', entry(['layout'])], ['child', entry(names)]]);
const browserEvents = (r: any) =>
  r.result.current.report?.events.filter((e: any) => e.type === 'browser-history');

test('repeat() after a blocked browser Back moves the browser back to the restored entry', async () => {
  const prevented = new Set<string>();
  const result = await renderHook(() =>
    useNavigationTreeReducer({ initialState: root, registry, routesWithRemovalPrevented: prevented } as any)
  );
  const initialEntry: any = browserEvents(result)[0];

  // Link to /page.
  await act(() => result.result.current.handleAction({ type: 'PUSH', target: 'child', payload: { name: 'page' } }));
  expect(browserEvents(result).at(-1)).toMatchObject({ op: 'push', path: '/page' });
  const pageKey = result.result.current.state.routes[0].state!.routes[1]!.key!;
  prevented.add(pageKey); // usePreventRemove(true) on /page

  // Browser Back to the first entry: prevented, browser moved forward again.
  await act(() =>
    result.result.current.processIntent({ type: 'BROWSER_HISTORY_CHANGED', actionId: 0, payload: { id: initialEntry.entryId, path: '/index' } } as any)
  );
  const preventedEvent: any = result.result.current.report!.events.findLast((e: any) => e.type === 'prevented-routes');
  expect(preventedEvent).toMatchObject({ routeKeys: [pageKey], action: { type: 'RESET' } });
  expect(browserEvents(result).at(-1)).toMatchObject({ op: 'go', delta: 1 });

  // The dialog is confirmed: repeat() disables prevention and dispatches the same action.
  prevented.delete(pageKey);
  const before = result.result.current.report!.events.length;
  await act(() => result.result.current.handleAction(preventedEvent.action));
  const after = result.result.current.report!.events.slice(before).filter((e: any) => e.type === 'browser-history');

  expect(result.result.current.state.routes[0].state!.routes.map((r: any) => r.name)).toEqual(['index']);
  expect(after).toEqual([
    expect.objectContaining({ op: 'go', delta: -1 }),
    expect.objectContaining({ op: 'replace', path: '/index' }),
  ]);
});
