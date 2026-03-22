import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedButton, Reveal } from './Animations';
import { apiForm, apiJson, apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const defaultCompose = {
  title: '',
  caption: '',
  hashtags: '',
  location: '',
  postType: 'text',
  anonymous: false,
  organizationId: '',
  imageUrl: '',
};

const defaultNotice = {
  title: 'Official notice',
  caption: '',
  hashtags: '',
  location: '',
  organizationId: '',
};

const defaultOrganization = {
  kind: 'club',
  name: '',
  description: '',
};

function AdminLoginForm() {
  const { loginAdmin } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '' });

    try {
      const data = await apiJson('/api/admin/login', 'POST', form);
      loginAdmin(data.admin, data.token);
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  }

  return (
    <main className="page">
      <Reveal className="card admin-login-card">
        <div className="eyebrow">Admin Access</div>
        <h1>Authenticate for the control dashboard</h1>
        <p className="muted">Use the admin account to manage posts, notices, users, and campus organizations.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Username
            <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          </label>
          <AnimatedButton type="submit" disabled={status.loading}>
            {status.loading ? 'Verifying...' : 'Open Dashboard'}
          </AnimatedButton>
        </form>
        {status.error ? <p className="message error">{status.error}</p> : null}
      </Reveal>
    </main>
  );
}

function DashboardStat({ label, value, tone = '' }) {
  return (
    <article className={`metric-card admin-metric-card ${tone}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PostComposer({ organizations, token, onPublished, setGlobalStatus }) {
  const [form, setForm] = useState(defaultCompose);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setGlobalStatus({ error: '', success: '' });

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
    if (file) payload.append('image', file);

    try {
      await apiForm('/api/admin/posts', payload, token);
      setForm(defaultCompose);
      setFile(null);
      setGlobalStatus({ error: '', success: 'Admin post published successfully.' });
      await onPublished();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card admin-section">
      <div className="section-header">
        <h2>Create snaps and posts</h2>
        <span className="status-chip">Text, media, or anonymous</span>
      </div>
      <form className="form-stack" onSubmit={handleSubmit}>
        <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
        <textarea rows="5" value={form.caption} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} placeholder="Write the post text or caption" />
        <input value={form.hashtags} onChange={(event) => setForm((current) => ({ ...current, hashtags: event.target.value }))} placeholder="#campus #event" />
        <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
        <input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Optional external media URL" />
        <div className="two-column admin-form-grid">
          <label>
            Post type
            <select value={form.postType} onChange={(event) => setForm((current) => ({ ...current, postType: event.target.value }))}>
              <option value="text">Text post</option>
              <option value="media">Media post</option>
              <option value="notice">Notice-style post</option>
            </select>
          </label>
          <label>
            Organization
            <select value={form.organizationId} onChange={(event) => setForm((current) => ({ ...current, organizationId: event.target.value }))}>
              <option value="">No organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.kind}: {organization.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={form.anonymous} onChange={(event) => setForm((current) => ({ ...current, anonymous: event.target.checked }))} />
          <span>Post anonymously</span>
        </label>
        <label>
          Upload media
          <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <div className="admin-helper-copy">
          <span className="status-chip">Visible as Admin</span>
          <span className="status-chip admin-chip">Toggle anonymous for hidden identity</span>
          <span className="status-chip notice-chip">Text-only posts are supported</span>
        </div>
        <AnimatedButton type="submit" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish Admin Post'}
        </AnimatedButton>
      </form>
    </div>
  );
}

function NoticeComposer({ organizations, token, onPublished, setGlobalStatus }) {
  const [form, setForm] = useState(defaultNotice);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setGlobalStatus({ error: '', success: '' });

    try {
      await apiJson('/api/admin/notices', 'POST', form, token);
      setForm(defaultNotice);
      setGlobalStatus({ error: '', success: 'Official notice published to the feed.' });
      await onPublished();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card admin-section">
      <div className="section-header">
        <h2>Publish official notices</h2>
        <span className="status-chip notice-chip">Distinct in feed</span>
      </div>
      <form className="form-stack" onSubmit={handleSubmit}>
        <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Notice title" />
        <textarea rows="5" value={form.caption} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} placeholder="Official announcement text" />
        <input value={form.hashtags} onChange={(event) => setForm((current) => ({ ...current, hashtags: event.target.value }))} placeholder="#exam #deadline #notice" />
        <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
        <select value={form.organizationId} onChange={(event) => setForm((current) => ({ ...current, organizationId: event.target.value }))}>
          <option value="">No organization</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.kind}: {organization.name}
            </option>
          ))}
        </select>
        <AnimatedButton type="submit" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish Notice'}
        </AnimatedButton>
      </form>
    </div>
  );
}

function OrganizationManager({ organizations, token, onRefresh, setGlobalStatus }) {
  const [form, setForm] = useState(defaultOrganization);
  const [editingId, setEditingId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitOrganization(event) {
    event.preventDefault();
    setSubmitting(true);
    setGlobalStatus({ error: '', success: '' });

    try {
      if (editingId) {
        await apiJson(`/api/admin/organizations/${editingId}`, 'PUT', form, token);
        setGlobalStatus({ error: '', success: 'Organization updated successfully.' });
      } else {
        await apiJson('/api/admin/organizations', 'POST', form, token);
        setGlobalStatus({ error: '', success: 'Organization created successfully.' });
      }
      setForm(defaultOrganization);
      setEditingId('');
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteOrganization(id) {
    setGlobalStatus({ error: '', success: '' });
    try {
      await apiRequest(`/api/admin/organizations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (editingId === id) {
        setEditingId('');
        setForm(defaultOrganization);
      }
      setGlobalStatus({ error: '', success: 'Organization deleted successfully.' });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    }
  }

  function startEditing(organization) {
    setEditingId(organization.id);
    setForm({
      kind: organization.kind,
      name: organization.name,
      description: organization.description || '',
    });
  }

  return (
    <div className="card admin-section">
      <div className="section-header">
        <h2>Manage clubs, associations, and departments</h2>
        {editingId ? <span className="status-chip">Editing organization</span> : null}
      </div>
      <form className="form-stack" onSubmit={submitOrganization}>
        <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}>
          <option value="club">Club</option>
          <option value="association">Association</option>
          <option value="department">Department</option>
        </select>
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Organization name" />
        <textarea rows="3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
        <div className="button-row">
          <AnimatedButton type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Update Organization' : 'Create Organization'}
          </AnimatedButton>
          {editingId ? (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setEditingId('');
                setForm(defaultOrganization);
              }}
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="user-list">
        {organizations.map((organization) => (
          <article key={organization.id} className="user-row">
            <div>
              <strong>{organization.kind}: {organization.name}</strong>
              <p className="muted">{organization.description || 'No description yet'}</p>
            </div>
            <div className="button-row">
              <button className="ghost-button" type="button" onClick={() => startEditing(organization)}>Edit</button>
              <button className="danger-button" type="button" onClick={() => deleteOrganization(organization.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RequestSection({ title, requests, token, approvePath, rejectPath, nameField, onRefresh, setGlobalStatus }) {
  async function approveRequest(id) {
    try {
      await apiJson(`${approvePath}/${id}/approve`, 'POST', {}, token);
      setGlobalStatus({ error: '', success: `${title} approved successfully.` });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    }
  }

  async function rejectRequest(id) {
    try {
      await apiJson(`${rejectPath}/${id}/reject`, 'POST', {}, token);
      setGlobalStatus({ error: '', success: `${title} rejected successfully.` });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    }
  }

  return (
    <div className="card admin-section">
      <div className="section-header">
        <h2>{title}</h2>
        <span className="status-chip">{requests.length} total</span>
      </div>
      <div className="user-list">
        {requests.map((request) => (
          <article key={request.id} className="user-row">
            <div>
              <strong>{request[nameField]}</strong>
              <p className="muted">{request.name} · {request.email} · {request.phoneNumber}</p>
              <p className="muted">{request.departmentName}</p>
              <p className="muted">{request.description}</p>
              <p className="muted">Status: {request.status}</p>
            </div>
            {request.status === 'pending' ? (
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => approveRequest(request.id)}>Approve</button>
                <button className="danger-button" type="button" onClick={() => rejectRequest(request.id)}>Reject</button>
              </div>
            ) : (
              <span className={`status-chip ${request.status === 'approved' ? '' : 'inactive-chip'}`}>
                {request.status}
              </span>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function QuerySection({ queries, token, onRefresh, setGlobalStatus }) {
  async function toggleResolved(query) {
    try {
      await apiRequest(`/api/admin/queries/${query.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isResolved: !query.isResolved }),
      });
      setGlobalStatus({ error: '', success: `Query marked as ${query.isResolved ? 'open' : 'resolved'}.` });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    }
  }

  return (
    <div className="card admin-section">
      <div className="section-header">
        <h2>Queries</h2>
        <span className="status-chip">{queries.length} total</span>
      </div>
      <div className="user-list">
        {queries.map((query) => (
          <article key={query.id} className="user-row">
            <div>
              <strong>{query.name}</strong>
              <p className="muted">{query.email} · {query.phoneNumber}</p>
              <p className="muted">{query.message}</p>
              <p className="muted">{new Date(query.createdAt).toLocaleString()}</p>
            </div>
            <div className="button-row">
              <span className={`status-chip ${query.isResolved ? '' : 'inactive-chip'}`}>
                {query.isResolved ? 'Resolved' : 'Open'}
              </span>
              <button className="ghost-button" type="button" onClick={() => toggleResolved(query)}>
                {query.isResolved ? 'Mark Open' : 'Mark Resolved'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PostEditor({ post, organizations, token, onRefresh, setGlobalStatus }) {
  const [form, setForm] = useState({
    title: post.title || '',
    caption: post.caption || '',
    hashtags: (post.hashtags || []).join(' '),
    location: post.location || '',
    postType: post.postType || 'text',
    anonymous: Boolean(post.isAnonymous),
    imageUrl: post.imageUrl || '',
    organizationId: post.organizationId || '',
    removeMedia: false,
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function savePost() {
    setBusy(true);
    setGlobalStatus({ error: '', success: '' });

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
    if (file) payload.append('image', file);

    try {
      await apiForm(`/api/admin/posts/${post.id}`, payload, token, 'PUT');
      setGlobalStatus({ error: '', success: 'Post updated successfully.' });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    setBusy(true);
    setGlobalStatus({ error: '', success: '' });

    try {
      await apiRequest(`/api/admin/posts/${post.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGlobalStatus({ error: '', success: 'Post deleted successfully.' });
      await onRefresh();
    } catch (error) {
      setGlobalStatus({ error: error.message, success: '' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card admin-card">
      {post.imageUrl ? <img className="admin-snap-image" src={post.imageUrl} alt={post.title || post.caption || 'Post'} /> : null}
      <div className="admin-card-copy">
        <div className="feed-post-title-row">
          <strong>{post.authorType === 'admin' ? 'Admin' : post.username}</strong>
          <div className="post-chip-row">
            <span className="status-chip">{post.postType}</span>
            {post.authorType === 'admin' ? <span className="status-chip admin-chip">Admin</span> : null}
            {post.isAnonymous ? <span className="status-chip">Anonymous</span> : null}
          </div>
        </div>
        <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
        <textarea rows="4" value={form.caption} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} placeholder="Post text" />
        <input value={form.hashtags} onChange={(event) => setForm((current) => ({ ...current, hashtags: event.target.value }))} placeholder="#tags" />
        <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
        <input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Media reference URL (optional)" />
        <div className="two-column admin-form-grid">
          <label>
            Post type
            <select value={form.postType} onChange={(event) => setForm((current) => ({ ...current, postType: event.target.value }))}>
              <option value="media">Media</option>
              <option value="text">Text</option>
              <option value="notice">Notice</option>
            </select>
          </label>
          <label>
            Organization
            <select value={form.organizationId} onChange={(event) => setForm((current) => ({ ...current, organizationId: event.target.value }))}>
              <option value="">No organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.kind}: {organization.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={form.anonymous} onChange={(event) => setForm((current) => ({ ...current, anonymous: event.target.checked }))} />
          <span>Post anonymously</span>
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={form.removeMedia} onChange={(event) => setForm((current) => ({ ...current, removeMedia: event.target.checked }))} />
          <span>Remove current media</span>
        </label>
        <label>
          Replace media
          <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <div className="button-row">
          <button className="ghost-button" type="button" onClick={savePost} disabled={busy}>
            {busy ? 'Saving...' : 'Update Post'}
          </button>
          <button className="danger-button" type="button" onClick={deletePost} disabled={busy}>
            {busy ? 'Working...' : 'Delete Post'}
          </button>
        </div>
      </div>
    </article>
  );
}

function PostManager({ posts, organizations, token, onRefresh, setGlobalStatus }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      if (filter !== 'all' && post.postType !== filter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        post.title,
        post.caption,
        post.username,
        post.organizationName,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [filter, posts, query]);

  return (
    <section className="admin-section">
      <div className="section-header">
        <h2>Post management</h2>
        <span className="status-chip">{filteredPosts.length} results</span>
      </div>
      <div className="two-column admin-form-grid">
        <label>
          Filter
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All posts</option>
            <option value="text">Text posts</option>
            <option value="media">Media posts</option>
            <option value="notice">Notices</option>
          </select>
        </label>
        <label>
          Search
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts, captions, organizations" />
        </label>
      </div>
      <div className="admin-snaps">
        {filteredPosts.map((post) => (
          <PostEditor
            key={post.id}
            post={post}
            organizations={organizations}
            token={token}
            onRefresh={onRefresh}
            setGlobalStatus={setGlobalStatus}
          />
        ))}
      </div>
    </section>
  );
}

export default function Admin() {
  const { admin, adminToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [associationRequests, setAssociationRequests] = useState([]);
  const [clubRequests, setClubRequests] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadDashboard() {
    if (!adminToken) return;
    setLoading(true);

    try {
      const [usersData, postsData, organizationData, associationRequestData, clubRequestData, queryData] = await Promise.all([
        apiRequest('/api/users', { headers: { Authorization: `Bearer ${adminToken}` } }),
        apiRequest('/api/admin/posts?limit=150', { headers: { Authorization: `Bearer ${adminToken}` } }),
        apiRequest('/api/admin/organizations', { headers: { Authorization: `Bearer ${adminToken}` } }),
        apiRequest('/api/admin/association-requests', { headers: { Authorization: `Bearer ${adminToken}` } }),
        apiRequest('/api/admin/club-requests', { headers: { Authorization: `Bearer ${adminToken}` } }),
        apiRequest('/api/admin/queries', { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);
      setUsers(usersData.users || []);
      setPosts(postsData.posts || []);
      setOrganizations(organizationData.organizations || []);
      setAssociationRequests(associationRequestData.requests || []);
      setClubRequests(clubRequestData.requests || []);
      setQueries(queryData.queries || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [adminToken]);

  const metrics = useMemo(() => ([
    { label: 'All posts', value: posts.length },
    { label: 'Text posts', value: posts.filter((post) => post.postType === 'text').length },
    { label: 'Media posts', value: posts.filter((post) => post.postType === 'media').length },
    { label: 'Notices', value: posts.filter((post) => post.postType === 'notice').length, tone: 'metric-notice' },
    { label: 'Users', value: users.length },
    { label: 'Organizations', value: organizations.length },
    { label: 'Association requests', value: associationRequests.filter((request) => request.status === 'pending').length },
    { label: 'Club requests', value: clubRequests.filter((request) => request.status === 'pending').length },
    { label: 'Open queries', value: queries.filter((query) => !query.isResolved).length },
  ]), [associationRequests, clubRequests, organizations.length, posts, queries, users.length]);

  if (!adminToken) {
    return <AdminLoginForm />;
  }

  return (
    <main className="page">
      <Reveal className="card page-header">
        <div>
          <div className="eyebrow">Admin Dashboard</div>
          <h1>Full control for posts, notices, users, and campus structure.</h1>
          <p className="muted">
            Signed in as {admin?.username}. This dashboard supports text posts, media uploads, anonymous posting,
            notice publishing, user moderation, and organization management without changing the existing app flow.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="animated-button" to="/users">View All Users</Link>
        </div>
      </Reveal>

      <section className="hero-metrics admin-metrics-grid">
        {metrics.map((metric) => (
          <DashboardStat key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />
        ))}
      </section>

      {loading ? <p className="message">Loading dashboard...</p> : null}
      {error ? <p className="message error">{error}</p> : null}
      {success ? <p className="message success">{success}</p> : null}

      <section className="admin-layout">
        <PostComposer
          organizations={organizations}
          token={adminToken}
          onPublished={loadDashboard}
          setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
            setError(nextError);
            setSuccess(nextSuccess);
          }}
        />
        <NoticeComposer
          organizations={organizations}
          token={adminToken}
          onPublished={loadDashboard}
          setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
            setError(nextError);
            setSuccess(nextSuccess);
          }}
        />
      </section>

      <section className="admin-layout">
        <OrganizationManager
          organizations={organizations}
          token={adminToken}
          onRefresh={loadDashboard}
          setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
            setError(nextError);
            setSuccess(nextSuccess);
          }}
        />
      </section>

      <section className="admin-layout">
        <RequestSection
          title="Association Requests"
          requests={associationRequests}
          token={adminToken}
          approvePath="/api/admin/association-requests"
          rejectPath="/api/admin/association-requests"
          nameField="associationName"
          onRefresh={loadDashboard}
          setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
            setError(nextError);
            setSuccess(nextSuccess);
          }}
        />
        <RequestSection
          title="Club Requests"
          requests={clubRequests}
          token={adminToken}
          approvePath="/api/admin/club-requests"
          rejectPath="/api/admin/club-requests"
          nameField="clubName"
          onRefresh={loadDashboard}
          setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
            setError(nextError);
            setSuccess(nextSuccess);
          }}
        />
      </section>

      <QuerySection
        queries={queries}
        token={adminToken}
        onRefresh={loadDashboard}
        setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
          setError(nextError);
          setSuccess(nextSuccess);
        }}
      />

      <PostManager
        posts={posts}
        organizations={organizations}
        token={adminToken}
        onRefresh={loadDashboard}
        setGlobalStatus={({ error: nextError, success: nextSuccess }) => {
          setError(nextError);
          setSuccess(nextSuccess);
        }}
      />
    </main>
  );
}
