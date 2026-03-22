import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedButton, Reveal } from './Animations';
import { apiForm, apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LOCATIONS = [
  'Canteen',
  'Library',
  'CSE Block',
  'Civil Block',
  'EC Block',
  'EEE Block',
  'Indoor Stadium',
  'KITSW Grounds',
  'Administrative Block',
  'Auditorium',
  'Campus Wide',
];

export default function Upload() {
  const navigate = useNavigate();
  const { token, markAnonymous } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    title: '',
    caption: '',
    hashtags: '',
    location: LOCATIONS[0],
    anonymous: false,
    postAs: 'personal',
    organizationId: '',
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  useEffect(() => {
    let active = true;
    async function loadOrganizations() {
      try {
        const data = await apiRequest('/api/me/organizations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) {
          setOrganizations(data.organizations || []);
        }
      } catch {
        if (active) {
          setOrganizations([]);
        }
      }
    }

    if (token) {
      loadOrganizations();
    }

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();

    const hasText = form.title.trim() || form.caption.trim();
    if (!files.length && !hasText) {
      setStatus({ loading: false, error: 'Add text or choose at least one image.', success: '' });
      return;
    }

    const payload = new FormData();
    files.forEach((file) => payload.append('images', file));
    payload.append('title', form.title);
    payload.append('caption', form.caption);
    payload.append('hashtags', form.hashtags);
    payload.append('location', form.location);
    payload.append('anonymous', String(form.anonymous));
    payload.append('postType', files.length ? 'media' : 'text');
    payload.append('postAs', form.postAs === 'anonymous' ? 'personal' : form.postAs);
    payload.append('organizationId', form.postAs === 'organization' ? form.organizationId : '');

    setStatus({ loading: true, error: '', success: '' });

    try {
      const data = await apiForm('/api/upload', payload, token);
      if (form.anonymous && Array.isArray(data.snaps)) {
        markAnonymous(data.snaps.map((snap) => snap.id));
      }

      setStatus({
        loading: false,
        error: '',
        success: `Published ${data.uploadedCount || files.length || 1} post(s). Redirecting to feed...`,
      });

      setFiles([]);
      setTimeout(() => navigate('/feed'), 700);
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  }

  return (
    <main className="page">
      <Reveal className="card page-header">
        <div>
          <div className="eyebrow">Create Post</div>
          <h1>Publish text updates or image posts without changing your flow.</h1>
          <p className="muted">
            Media posts still work as before, and now you can also share text-only updates in the same feed.
          </p>
        </div>
      </Reveal>

      <section className="upload-layout">
        <form className="card upload-form" onSubmit={handleSubmit}>
          <label className="dropzone">
            <span className="eyebrow">Optional Media</span>
            <strong>Drop image files or click to browse</strong>
            <p className="muted">Leave this empty to publish a text-only post.</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
          </label>

          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Short headline for your update"
            />
          </label>

          <label>
            Post text
            <textarea
              rows="6"
              value={form.caption}
              onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))}
              placeholder="What should the campus know?"
            />
          </label>

          <label>
            Hashtags
            <input
              value={form.hashtags}
              onChange={(event) => setForm((current) => ({ ...current, hashtags: event.target.value }))}
              placeholder="#campus #event #update"
            />
          </label>

          <label>
            Location
            <select
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            >
              {LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="toggle-row">
            <span>Posting identity</span>
            <select
              value={form.postAs}
              onChange={(event) => setForm((current) => ({
                ...current,
                postAs: event.target.value,
                anonymous: event.target.value === 'anonymous',
                organizationId: event.target.value === 'organization' ? current.organizationId : '',
              }))}
            >
              <option value="personal">Personal</option>
              <option value="anonymous">Anonymous</option>
              {organizations.length ? <option value="organization">Association / Club</option> : null}
            </select>
          </label>

          {form.postAs === 'organization' ? (
            <label>
              Association / Club
              <select
                value={form.organizationId}
                onChange={(event) => setForm((current) => ({ ...current, organizationId: event.target.value }))}
                required
              >
                <option value="">Choose identity</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.kind}: {organization.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <AnimatedButton type="submit" disabled={status.loading}>
            {status.loading ? 'Publishing...' : files.length ? 'Publish Media Post' : 'Publish Text Post'}
          </AnimatedButton>

          {status.error ? <p className="message error">{status.error}</p> : null}
          {status.success ? <p className="message success">{status.success}</p> : null}
        </form>

        <div className="card preview-panel">
          <div className="eyebrow">Preview</div>
          <h2>{files.length ? 'Media queue' : 'Text post preview'}</h2>
          {files.length ? (
            <div className="preview-grid">
              {previews.map(({ file, url }) => (
                <figure key={`${file.name}-${file.lastModified}`} className="preview-item">
                  <img src={url} alt={file.name} />
                  <figcaption>{file.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="text-preview-card">
              <strong>{form.title || 'Untitled post'}</strong>
              <p>{form.caption || 'Your text-only post preview will appear here.'}</p>
              <span className="status-chip">{form.anonymous ? 'Anonymous' : 'Named post'}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
