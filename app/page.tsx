import { usePreventRemove } from 'expo-router';
import { Text } from 'react-native';
export default function Page() {
  usePreventRemove(true, () => {});
  return (<>
    <Text>Page with unsaved changes</Text>
  </>);
}
