import { Link } from 'expo-router';
import { Text } from 'react-native';
export default function Home() {
  return (<>
    <Link href="/page" testID="open"><Text>Open page</Text></Link>
    <Link href="/plain" testID="open-plain"><Text>Open plain</Text></Link>
  </>);
}
