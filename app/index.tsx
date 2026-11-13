import { Link } from 'expo-router';
import { Text } from 'react-native';
export default function Home() {
  return (<>
    <Link href="/page" testID="open"><Text>Open page</Text></Link>
    <Link href="/page2" testID="open2"><Text>Open page2</Text></Link>
    <Link href="/plain" testID="open-plain"><Text>Open plain</Text></Link>
  </>);
}
