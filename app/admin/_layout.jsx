import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Admin Login' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
    </Stack>
  );
}
