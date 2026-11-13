import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
export default function Page2() {
  const [dirty, setDirty] = useState(true);
  usePreventRemove(dirty, ({ data, repeat }) => {
    (globalThis as any).blockedAction = data.action.type;
    setDirty(false);           // keep prop and prevention state in sync, as the warning asks
    setTimeout(repeat, 100);
  });
  return (<>
    <Text>Page2 (sets preventRemove=false before repeat)</Text>
    <Pressable onPress={() => router.back()} testID="back"><Text>router.back()</Text></Pressable>
  </>);
}
