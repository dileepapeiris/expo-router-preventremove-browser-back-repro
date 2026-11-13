import { usePreventRemove } from 'expo-router';
import { Text } from 'react-native';
export default function Page() {
  usePreventRemove(true, ({ data, repeat }) => {
    (globalThis as any).blockedAction = data.action.type;
    setTimeout(repeat, 100);
  });
  return (<>
    <Text>Page with unsaved changes</Text>
  </>);
}
