import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedButton } from './Animations';
import { apiRequest } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function authorName(post, anonymousSnapIds) {
  if (post.authorType === 'admin') return 'Admin';
  return post.isAnonymous || anonymousSnapIds.includes(post.id) ? 'Anonymous' : post.username || 'Unknown';
}

function avatarSeed(name) {
  return (name || '?').slice(0, 1).toUpperCase();
}

function mediaKind(imageUrl = '') {
  if (!imageUrl) return 'text';
  return /\.(mp4|webm|ogg)$/i.test(imageUrl) ? 'video' : 'image';
}

function formatHashtags(tags = []) {
  return tags.map((tag) => `#${tag}`);
}

function resolveMediaUrl(imageUrl = '') {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const base = String(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  if (!base) return imageUrl;

  return `${base}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

function FeedPost({
  post,
  index,
  activeIndex,
  anonymousSnapIds,
  onToggleLike,
  likedIds,
  canInteract,
}) {
  const author = authorName(post, anonymousSnapIds);
  const liked = likedIds.includes(post.id);
  const kind = mediaKind(post.imageUrl);
  const mediaUrl = resolveMediaUrl(post.imageUrl);
  const isActive = index === activeIndex;
  const hashtags = formatHashtags(post.hashtags || []);
  const isNotice = post.postType === 'notice';
  const isAdminPost = post.authorType === 'admin';
  const title = post.title || (isNotice ? 'Official notice' : 'Campus post');

  return (
    <article data-slide-index={index} className={`vertical-snap-slide ${isActive ? 'is-active' : ''}`}>
      <div className={`feed-post-card ${kind === 'text' ? 'text-feed-post' : ''} ${isNotice ? 'notice-post' : ''}`.trim()}>
        <div className="feed-post-head">
          <div className="author-row">
            <div className="avatar-badge">{avatarSeed(author)}</div>
            <div className="author-copy">
              <strong>{author}</strong>
              <p className="muted">{formatDate(post.createdAt)}</p>
            </div>
          </div>
          <div className="post-chip-row">
            {isAdminPost ? <span className="status-chip admin-chip">Admin</span> : null}
            {isNotice ? <span className="status-chip notice-chip">Notice</span> : null}
            {post.organizationName ? (
              <span className="status-chip org-chip">{post.organizationKind}: {post.organizationName}</span>
            ) : null}
          </div>
        </div>

        {post.imageUrl ? (
          <div
            className={`feed-post-media-wrap ${kind === 'image' ? 'has-blur-bg' : ''}`.trim()}
            style={kind === 'image' ? { '--media-bg-image': `url("${mediaUrl}")` } : undefined}
          >
            {kind === 'video' ? (
              <video className="feed-post-media" controls muted playsInline preload={isActive ? 'metadata' : 'none'}>
                <source src={mediaUrl} />
              </video>
            ) : (
              <img className="feed-post-media" src={mediaUrl} alt={post.title || post.caption || 'Post media'} loading="lazy" decoding="async" />
            )}
          </div>
        ) : null}

        <div className="feed-post-caption">
          <div className="feed-post-title-row">
            <strong className="feed-post-title">{title}</strong>
            <span className="status-chip">{post.postType}</span>
          </div>
          {post.caption ? <p className="feed-post-body">{post.caption}</p> : null}
          {post.location ? <span className="location-inline">{post.location}</span> : null}
          {hashtags.length ? (
            <div className="feed-hashtag-row">
              {hashtags.map((tag) => (
                <span key={`${post.id}-${tag}`} className="tag highlighted-tag">{tag}</span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="feed-post-actions">
          <div className="action-cluster">
            <button
              type="button"
              className={`action-button ${liked ? 'liked' : ''} ${!canInteract ? 'disabled-action' : ''}`.trim()}
              onClick={() => onToggleLike(post.id)}
              disabled={!canInteract}
              title={canInteract ? 'Like post' : 'Login to interact with posts'}
            >
              <span className="action-icon">{liked ? '♥' : '♡'}</span>
            </button>
            <button
              type="button"
              className={`action-button ${!canInteract ? 'disabled-action' : ''}`.trim()}
              disabled={!canInteract}
              title={canInteract ? 'Comment' : 'Login to interact with posts'}
            >
              <span className="action-icon">💬</span>
            </button>
            <button
              type="button"
              className={`action-button ${!canInteract ? 'disabled-action' : ''}`.trim()}
              disabled={!canInteract}
              title={canInteract ? 'Share' : 'Login to interact with posts'}
            >
              <span className="action-icon">📤</span>
            </button>
          </div>
          {!canInteract ? <span className="feed-guest-note">Login to interact with posts</span> : null}
        </div>
      </div>
    </article>
  );
}

export default function SnapFeed() {
  const { anonymousSnapIds, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState([]);
  const [barsHidden, setBarsHidden] = useState(false);
  const railRef = useRef(null);
  const rafRef = useRef(null);
  const previousScrollTopRef = useRef(0);
  const HIDE_SCROLL_TOP = 20;
  const REVEAL_SCROLL_TOP = 72;
  const DELTA_THRESHOLD = 2;

  const loadPosts = useCallback(async (mode = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiRequest('/api/snaps?limit=50');
      setPosts(data.snaps || []);
      setError('');
      if (mode === 'refresh' && railRef.current) {
        railRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveIndex(0);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const socket = getSocket();

    function insertPost(post) {
      setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setActiveIndex(0);
      if (railRef.current) {
        railRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    function updatePost(post) {
      setPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
    }

    function deletePost(payload) {
      setPosts((current) => current.filter((item) => item.id !== payload?.id));
      setActiveIndex((current) => Math.max(0, current - 1));
    }

    socket.on('new_snap', insertPost);
    socket.on('newSnap', insertPost);
    socket.on('snap_updated', updatePost);
    socket.on('snapUpdated', updatePost);
    socket.on('snap_deleted', deletePost);
    socket.on('snapDeleted', deletePost);

    return () => {
      socket.off('new_snap', insertPost);
      socket.off('newSnap', insertPost);
      socket.off('snap_updated', updatePost);
      socket.off('snapUpdated', updatePost);
      socket.off('snap_deleted', deletePost);
      socket.off('snapDeleted', deletePost);
    };
  }, []);

  const visiblePosts = useMemo(() => posts, [posts]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !visiblePosts.length) {
      setActiveIndex(0);
      return undefined;
    }

    function updateActiveSlide() {
      const slides = Array.from(rail.querySelectorAll('[data-slide-index]'));
      const viewportCenter = rail.scrollTop + rail.clientHeight / 2;
      let nextIndex = 0;
      let nearest = Number.POSITIVE_INFINITY;

      slides.forEach((slide, currentIndex) => {
        const center = slide.offsetTop + slide.clientHeight / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < nearest) {
          nearest = distance;
          nextIndex = currentIndex;
        }
      });

      setActiveIndex(nextIndex);
    }

    function handleScroll() {
      const currentTop = rail.scrollTop;
      const delta = currentTop - previousScrollTopRef.current;
      const scrollingDown = delta > DELTA_THRESHOLD;
      const scrollingUp = delta < -DELTA_THRESHOLD;

      setBarsHidden((currentHidden) => {
        if (currentTop <= 4) return false;
        if (!currentHidden && currentTop > HIDE_SCROLL_TOP && (scrollingDown || currentTop > HIDE_SCROLL_TOP * 2)) {
          return true;
        }
        if (currentHidden && scrollingUp && currentTop < REVEAL_SCROLL_TOP) {
          return false;
        }
        return currentHidden;
      });

      previousScrollTopRef.current = Math.max(0, currentTop);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateActiveSlide);
    }

    updateActiveSlide();
    rail.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      rail.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visiblePosts]);

  function scrollToIndex(index) {
    const rail = railRef.current;
    if (!rail) return;
    const slide = rail.querySelector(`[data-slide-index="${index}"]`);
    if (!slide) return;
    rail.scrollTo({ top: slide.offsetTop, behavior: 'smooth' });
    setActiveIndex(index);
  }

  function toggleLike(id) {
    if (!token) return;
    setLikedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <main className={`page feed-page vertical-feed-page ${barsHidden ? 'bars-hidden' : ''}`.trim()}>
      {!token ? (
        <section className={`public-feed-banner card ${barsHidden ? 'public-feed-banner-hidden' : ''}`.trim()}>
          <div className="public-feed-copy">
            <span className="eyebrow">Public Feed</span>
            <h1>Explore the campus vibe before you join.</h1>
            <p className="muted">
              Browse student posts, official notices, clubs, and real community updates. Sign up when you are ready to post,
              react, and participate.
            </p>
          </div>
          <div className="button-row public-feed-actions">
            <Link className="animated-button" to="/signup">Join Now</Link>
            <Link className="ghost-button" to="/">Back Home</Link>
          </div>
        </section>
      ) : null}

      {loading ? <p className="message">Loading feed...</p> : null}
      {error ? <p className="message error">{error}</p> : null}

      {!loading && visiblePosts.length ? (
        <section className="vertical-feed-stage">
          <div className="vertical-feed-rail" ref={railRef}>
            {visiblePosts.map((post, index) => (
              <FeedPost
                key={post.id}
                post={post}
                index={index}
                activeIndex={activeIndex}
                anonymousSnapIds={anonymousSnapIds}
                likedIds={likedIds}
                onToggleLike={toggleLike}
                canInteract={Boolean(token)}
              />
            ))}
          </div>

          <button
            type="button"
            className="feed-refresh-fab"
            onClick={() => loadPosts('refresh')}
            disabled={refreshing}
            aria-label="Refresh latest posts"
            title="Refresh latest posts"
          >
            {refreshing ? '...' : '↻'}
          </button>
        </section>
      ) : null}

      {!loading && !visiblePosts.length ? <p className="message">No posts available right now.</p> : null}
    </main>
  );
}
