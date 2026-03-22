import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedButton } from './Animations';
import { apiJson } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      const data = await apiJson('/api/login', 'POST', form);
      login(data.user, data.token);
      setStatus({ loading: false, error: '', success: 'Login successful. Launching feed.' });
      navigate('/feed');
    } catch (error) {
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
