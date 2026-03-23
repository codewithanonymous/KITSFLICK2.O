import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedButton } from './Animations';
import { apiJson } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    console.log('[FE][CLICK] SignUp submit clicked');
    setStatus({ loading: true, error: '', success: '' });

    try {
      console.log('[FE][FLOW] SignUp -> /api/register');
      await apiJson('/api/register', 'POST', form);
      console.log('[FE][FLOW] SignUp success -> /api/login');
      const loginData = await apiJson('/api/login', 'POST', {
        username: form.username,
        password: form.password,
      });

      login(loginData.user, loginData.token);
      console.log('[FE][FLOW] SignUp auto-login success, navigating to /feed');
      setStatus({ loading: false, error: '', success: 'Account created. Redirecting to your feed.' });
      navigate('/feed');
    } catch (error) {
      console.error('[FE][FLOW] SignUp failed', error);
      setStatus({ loading: false, error: error.message, success: '' });
    }
  }

  return (
    <section className="auth-form-panel">
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="choose a username"
            autoComplete="username"
            required
          />
        </label>

        <label>
          College Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="name@kitsw.ac.in"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="create a password"
            autoComplete="new-password"
            required
          />
        </label>

        <AnimatedButton type="submit" disabled={status.loading}>
          {status.loading ? 'Creating account...' : 'Sign Up'}
        </AnimatedButton>
      </form>

      {status.error ? <p className="message error">{status.error}</p> : null}
      {status.success ? <p className="message success">{status.success}</p> : null}
    </section>
  );
}
