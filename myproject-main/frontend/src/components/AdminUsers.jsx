import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from './Animations';
import { useAuth } from '../context/AuthContext';
import { apiJson, apiRequest } from '../services/api';

function AdminUsersList({ users, token, onRefresh, setGlobalStatus }) {
  const [query, setQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => (
      user.username.toLowerCase().includes(normalizedQuery)
      || user.email.toLowerCase().includes(normalizedQuery)
    ));
  }, [query, users]);

  async function toggleUser(userId, isActive) {
    setGlobalStatus({ error: '', success: '' });
    try {
      await apiJson(`/api/users/${userId}/status`, 'PATCH', { isActive: !isActive }, token);
      setGlobalStatus({ error: '', success: `User ${isActive ? 'disabled' : 'enabled'} successfully.` });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    }
  }

  async function deleteUser(userId) {
    setGlobalStatus({ error: '', success: '' });
    try {
      await apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGlobalStatus({ error: '', success: 'User deleted successfully.' });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    }
  }

  return (
    <div className="card admin-section">
      <div className="section-header">
        <h2>All users</h2>
        <span className="status-chip">{filteredUsers.length} visible</span>
      </div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by username or email" />
      <div className="user-list">
        {filteredUsers.map((user) => (
          <article key={user.id} className="user-row user-detail-row">
            <div className="user-row-copy">
              <strong>{user.username}</strong>
              <div className="user-meta-grid">
                <p className="muted">Email: {user.email}</p>
                <p className="muted">Posts: {user.postCount ?? 0}</p>
                <p className="muted">Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
              </div>
            </div>
            <div className="button-row">
              <span className={`status-chip ${user.isActive ? '' : 'inactive-chip'}`}>{user.isActive ? 'Active' : 'Disabled'}</span>
              <button className="ghost-button" type="button" onClick={() => toggleUser(user.id, user.isActive)}>
                {user.isActive ? 'Disable' : 'Enable'}
              </button>
              <button className="danger-button" type="button" onClick={() => deleteUser(user.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AdminUsersPanel(props) {
  return <AdminUsersList {...props} />;
}

export default function AdminUsersPage() {
  const { admin, adminToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadUsers() {
    if (!adminToken) return;
    setLoading(true);

    try {
      const usersData = await apiRequest('/api/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setUsers(usersData.users || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [adminToken]);

  if (!adminToken) {
    return (
      <main className="page">
        <Reveal className="card page-header">
          <div>
            <div className="eyebrow">Admin Users</div>
            <h1>Sign in to view all users</h1>
            <p className="muted">This page is available only after authenticating through the admin dashboard.</p>
          </div>
          <div className="page-header-actions">
            <Link className="animated-button" to="/admin">Open Admin Login</Link>
          </div>
        </Reveal>
      </main>
    );
  }

  return (
    <main className="page">
      <Reveal className="card page-header">
        <div>
          <div className="eyebrow">Admin Users</div>
          <h1>All registered users in one place</h1>
          <p className="muted">
            Signed in as {admin?.username}. Review usernames, email addresses, and total posts for every user account.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="ghost-button" to="/admin">Back to Dashboard</Link>
        </div>
      </Reveal>

      {loading ? <p className="message">Loading users...</p> : null}
      {error ? <p className="message error">{error}</p> : null}
      {success ? <p className="message success">{success}</p> : null}

      <AdminUsersPanel
        users={users}
        token={adminToken}
        onRefresh={loadUsers}
        setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
          setError(nextError);
          setSuccess(nextSuccess);
        }}
      />
    </main>
  );
}
