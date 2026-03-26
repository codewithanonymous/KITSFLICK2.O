import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedButton } from './Animations';
import { apiJson } from '../services/api';
import { enablePushNotifications } from '../services/pushNotification';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    console.log('[FE][CLICK] Login submit clicked');
    setStatus({ loading: true, error: '', success: '' });

    try {
      console.log('[FE][FLOW] Login -> /api/login');
      const data = await apiJson('/api/login', 'POST', form);
      login(data.user, data.token);
      enablePushNotifications(data.token).catch((error) => {
        console.warn('[FE][PUSH] Notification setup skipped:', error?.message || error);
      });
      console.log('[FE][FLOW] Login success, navigating to /feed');
      setStatus({ loading: false, error: '', success: 'Login successful. Launching feed.' });
      navigate('/feed');
    } catch (error) {
      console.error('[FE][FLOW] Login failed', error);
      setStatus({ loading: false, error: error.message, success: '' });
    }
  }

  return (
    <section className="auth-form-panel">
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          Username or Email
          <input
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="username or name@kitsw.ac.in"
            autoComplete="username"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="password"
            autoComplete="current-password"
            required
          />
        </label>

        <AnimatedButton type="submit" disabled={status.loading}>
          {status.loading ? 'Authenticating...' : 'Login'}
        </AnimatedButton>
      </form>

      {status.error ? <p className="message error">{status.error}</p> : null}
      {status.success ? <p className="message success">{status.success}</p> : null}
    </section>
  );
}
