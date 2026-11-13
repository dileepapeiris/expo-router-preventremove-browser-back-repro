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

