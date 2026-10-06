import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { FeedbackProvider } from './components/feedback';
import { LoginPage } from './components/LoginPage';
import { NewProjectProvider } from './components/NewProjectModal';
import { PageLoader } from './components/ui';
import { Dashboard } from './dashboard/Dashboard';
import { ApiError } from './lib/api';
import { AuthGate } from './lib/auth';
import { SelectionProvider } from './lib/selection';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      // Client errors (signed out, view-only, not found) won't fix themselves on retry.
      retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status < 500),
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGate signIn={<LoginPage />} loading={<PageLoader className="min-h-dvh bg-canvas" />}>
        <SelectionProvider>
          <FeedbackProvider>
            <NewProjectProvider>
              <Dashboard />
            </NewProjectProvider>
          </FeedbackProvider>
        </SelectionProvider>
      </AuthGate>
    </QueryClientProvider>
  </StrictMode>,
);
