import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import './index.css';
import { AppShell } from './components/AppShell';
import { FeedbackProvider } from './components/feedback';
import { NewProjectProvider } from './components/NewProjectModal';
import { Button, Card, EmptyState } from './components/ui';
import { HubPage } from './pages/HubPage';
import { ProjectPage } from './pages/ProjectPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ActivityPage } from './pages/ActivityPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => count < 2 && !/not found/i.test((error as Error).message),
    },
  },
});

function NotFound() {
  const navigate = useNavigate();
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="Page not found"
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Go to projects
          </Button>
        }
      >
        That page doesn’t exist.
      </EmptyState>
    </Card>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <FeedbackProvider>
          <NewProjectProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<HubPage />} />
                <Route path="/projects/:id" element={<ProjectPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </NewProjectProvider>
        </FeedbackProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
