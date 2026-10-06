import { useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CircleAlert, Eye, EyeOff, LogIn } from 'lucide-react';
import { api } from '../lib/api';
import { useSignedIn } from '../lib/auth';
import { useConfig } from '../lib/hooks';
import { PlaceholderArt } from './art';
import { Brand } from './brand';
import { Button, Field, IconButton } from './ui';

export function LoginPage() {
  const { data: config } = useConfig();
  const signedIn = useSignedIn();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const appName = config?.appName ?? 'CAD2BIM';

  useEffect(() => {
    document.title = `Sign in · ${appName}`;
  }, [appName]);

  const login = useMutation({
    mutationFn: () => api.login(username.trim(), password),
    onSuccess: signedIn,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (username.trim() && password) login.mutate();
  };

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="relative hidden flex-1 overflow-hidden border-r border-line bg-sidebar lg:block">
        <PlaceholderArt seed="bim-hive-sign-in" className="absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/40 to-sidebar/70" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <Brand size="lg" />
          <p className="mt-6 max-w-md font-serif text-[22px] leading-snug text-ink-soft">
            Every CAD-to-BIM project, from the first drawing received to the final export, in one place.
          </p>
        </div>
      </aside>

      <main className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[520px] lg:shrink-0">
        <div className="mx-auto w-full max-w-sm">
          <Brand size="lg" className="mb-12 lg:hidden" />
          <h1 className="font-serif text-[30px] font-medium tracking-[-0.02em] text-ink">Sign in</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">to the {appName} progress tracker</p>

          {config && !config.authConfigured && (
            <div className="mt-6 border border-warn/40 bg-warn/10 px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
              Sign-in isn’t set up yet. Set <code className="text-ink">TRACKER_ADMIN_PASSWORD</code> and <code className="text-ink">TRACKER_VIEWER_PASSWORD</code> on
              the server, then restart it.
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Username">
              <input
                className="field h-11"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                maxLength={200}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  className="field h-11 pr-11"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  maxLength={500}
                />
                <IconButton
                  icon={showPassword ? EyeOff : Eye}
                  label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2"
                />
              </div>
            </Field>

            {login.error && (
              <p role="alert" className="flex items-start gap-2 border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13.5px] text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                {login.error.message}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" icon={LogIn} loading={login.isPending} disabled={!username.trim() || !password} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-8 border-t border-line pt-5 text-[13px] leading-relaxed text-faint">
            Admin accounts can create and edit projects. Viewer accounts can see everything but can’t make changes.
          </p>
        </div>
      </main>
    </div>
  );
}
