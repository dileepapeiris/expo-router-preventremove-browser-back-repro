import { usePreventRemove } from 'expo-router';
import { Text } from 'react-native';
export default function Page() {
  usePreventRemove(true, ({ data }) => {
    (globalThis as any).blockedAction = data.action.type;
  });
  return (<>
    <Text>Page with unsaved changes</Text>
  </>);
}
