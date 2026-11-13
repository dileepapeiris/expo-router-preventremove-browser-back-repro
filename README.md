# usePreventRemove: repeat() after a blocked browser Back replaces the history entry

Reproduction for https://github.com/expo/expo/issues/53441 on web.

Versions: Expo SDK 58, `expo` 58.0.25, `expo-router` 58.0.31, `react-native-web` 0.21.4, Chrome.

## Run

```sh
npm install
npm run web            # expo start --web --port 8099
```

Then in a second terminal, with Chrome installed:

```sh
npm run trace          # headless Chrome, prints the browser history after each step
```

Or do it by hand: open http://localhost:8099, click **Open page**, press the browser **Back**
button, then press **Forward**.

## Steps, expected, actual

The app is a root `<Stack />`, a home screen with a `Link` to `/page`, and `/page` with
`usePreventRemove(true, ...)`. The callback stands in for a "Discard changes?" dialog the user
confirms: it records `data.action.type` and calls `repeat()`.

1. Open `/`, click **Open page**. URL `/page`, browser history `[/, /page]`.
2. Press browser **Back**. `usePreventRemove` blocks it, the callback calls `repeat()`.
3. Press browser **Forward**.

**Expected:** after step 2 the browser sits on `/` with `/page` as the forward entry, so step 3
reopens `/page`. That is what happens when the page leaves through `router.back()` instead.

**Actual:** the blocked action is `RESET`. After `repeat()` the screen shows `/`, but the browser
stays on the second entry and its URL is replaced with `/`. History becomes `[/, /]`, Forward
does nothing, and `/page` can no longer be reached through the history.

## Recorded trace

`media/trace.txt`, from `npm run trace` (Chrome, `Page.getNavigationHistory`, the initial
`about:blank` entry left out):

```
browser Back, usePreventRemove + repeat():
  after Link               {"path":"/page","blocked":null,"history":["/","/page"],"index":1}
  after leaving            {"path":"/","blocked":"RESET","history":["/","/"],"index":1}
  after browser Forward    {"path":"/","blocked":"RESET","history":["/","/"],"index":1}
router.back(), usePreventRemove + repeat() (control):
  after Link               {"path":"/page","blocked":null,"history":["/","/page"],"index":1}
  after leaving            {"path":"/","blocked":"GO_BACK","history":["/","/page"],"index":0}
  after browser Forward    {"path":"/page","blocked":"GO_BACK","history":["/","/page"],"index":1}
browser Back, preventRemove set to false before repeat():
  after Link               {"path":"/page2","blocked":null,"history":["/","/page2"],"index":1}
  after leaving            {"path":"/","blocked":"RESET","history":["/","/"],"index":1}
  after browser Forward    {"path":"/","blocked":"RESET","history":["/","/"],"index":1}
browser Back, page without the hook (control):
  after Link               {"path":"/plain","blocked":null,"history":["/","/plain"],"index":1}
  after leaving            {"path":"/","blocked":null,"history":["/","/plain"],"index":0}
  after browser Forward    {"path":"/plain","blocked":null,"history":["/","/plain"],"index":1}
```

## Controls

| Page | Leaves by | History after leaving | Forward |
| --- | --- | --- | --- |
| `/page`, hook + `repeat()` | browser Back | `[/, /]`, index 1 | **stays on `/`** |
| `/page`, hook + `repeat()` | `router.back()` | `[/, /page]`, index 0 | `/page` |
| `/page2`, hook, `preventRemove` set to `false` before `repeat()` | browser Back | `[/, /]`, index 1 | **stays on `/`** |
| `/plain`, no hook | browser Back | `[/, /plain]`, index 0 | `/plain` |

So browser Back is fine without the hook and fine when the page leaves through the router. Only
`repeat()` after a blocked browser Back corrupts the history, and clearing `preventRemove` first
(as the runtime warning asks) does not change it.

## Likely cause

`packages/expo-router/src/global-state/browserHistory.ts`: when a popstate restore is prevented,
`restoreTrackedEntry` moves the browser forward again to the entry that matches the UI, and the
action handed to the callback is the `RESET` built by `createResetIntent`. `repeat()` dispatches
that `RESET` as an ordinary action. `applyRouterHistoryAction` only moves the browser for `push`
and `pop`, so the `RESET` falls through to `selectAndUpdateHistoryEntry(history, history.index, ...)`,
which replaces the current entry's URL instead of going back to the entry the user asked for.
