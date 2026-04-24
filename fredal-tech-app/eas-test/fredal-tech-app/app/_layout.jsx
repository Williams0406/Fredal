// app/_layout.jsx
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2, retry: 1 } },
});

function AuthGuard() {
  const { user, isLoading, loadUser } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadUser().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || isLoading) return;

    const firstSegment = segments[0];
    const inAuth = firstSegment === '(auth)' || firstSegment === 'login' || pathname === '/login';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)/');
    }
  }, [ready, user, isLoading, segments, pathname]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
    </QueryClientProvider>
  );
}