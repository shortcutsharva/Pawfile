import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrap } from '@/data/bootstrap';
import { runScheduledBackupIfDue } from '@/services/backup';
import { rescheduleAllReminders } from '@/services/notifications';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    bootstrap()
      .then(() => {
        if (mounted) setReady(true);
        void runScheduledBackupIfDue();
        return rescheduleAllReminders();
      })
      .catch(() => {
        if (mounted) setReady(true);
      });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runScheduledBackupIfDue();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.pine700} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="case/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="case/[id]/update" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/hearing/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]/hearing/[hearingId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="contacts/new" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});
