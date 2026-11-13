import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

type Status = { caption: string; path: string; length: number; blocked: string | null };

function read(caption: string): Status {
  if (Platform.OS !== 'web') return { caption, path: '', length: 0, blocked: null };
  return {
    caption,
    path: location.pathname,
    length: history.length,
    blocked: (globalThis as any).blockedAction ?? null,
  };
}

// Shows what the browser is doing so screenshots are self-explanatory. The test driver sets the
// caption through `globalThis.setCaption(text)`.
export function HistoryStatus() {
  const [status, setStatus] = useState<Status>(() => read('Start'));
  useEffect(() => {
    let caption = 'Start';
    const refresh = () => setStatus(read(caption));
    (globalThis as any).setCaption = (text: string) => {
      caption = text;
      refresh();
    };
    const timer = setInterval(refresh, 100);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.bar} testID="status">
      <Text style={styles.caption}>{status.caption}</Text>
      <Text style={styles.line}>
        URL path: <Text style={styles.value}>{status.path}</Text>   history.length:{' '}
        <Text style={styles.value}>{status.length}</Text>   blocked action:{' '}
        <Text style={styles.value}>{status.blocked ?? 'none'}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#1f2937', padding: 12, gap: 4 },
  caption: { color: '#fbbf24', fontSize: 18, fontWeight: '700' },
  line: { color: '#e5e7eb', fontSize: 14, fontFamily: Platform.select({ web: 'monospace', default: undefined }) },
  value: { color: '#ffffff', fontWeight: '700' },
});
