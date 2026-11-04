import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';

export function Login() {
  const { login } = useAuth();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(secret);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in.');
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">P</span>
          <span>
            Pawfile
            <small>Operations dashboard</small>
          </span>
        </div>
        <p className="muted">
          Sign in with the shared secret configured as <code>APP_SHARED_SECRET</code> on the
          server.
        </p>
        <form onSubmit={(event) => void submit(event)} className="login-form">
          <label className="field">
            <span>Shared secret</span>
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="At least 16 characters"
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Open dashboard'}
          </button>
        </form>
        <p className="muted small">
          Read-only access to cases, contacts, hearings, documents, and activity.
        </p>
      </div>
    </div>
  );
}
