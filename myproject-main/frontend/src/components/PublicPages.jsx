import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from './Animations';
import { apiJson } from '../services/api';
import { useAuth } from '../context/AuthContext';
import aboutImage from '../../aboutimage.jpg';

const featureCards = [
  {
    title: 'Public feed access',
    description: 'Let visitors explore campus stories, official notices, clubs, and student moments before they join.',
  },
  {
    title: 'Anonymous or named posting',
    description: 'Students can post with their identity or share thoughts anonymously when the moment calls for it.',
  },
  {
    title: 'Clubs, departments, and notices',
    description: 'Keep organizations, announcements, and student conversations together in one modern campus feed.',
  },
];

const faqItems = [
  {
    question: 'Can people browse before signing up?',
    answer: 'Yes. The public feed is open so visitors can understand the platform before creating an account.',
  },
  {
    question: 'Are anonymous posts supported?',
    answer: 'Yes. Anonymous posting is available, while moderation still protects the community experience.',
  },
  {
    question: 'What appears in the feed?',
    answer: 'Student posts, media updates, official notices, and organization activity all appear in the same timeline.',
  },
];

function FeedPreviewPhone() {
  return (
    <Reveal className="hero-visual-shell">
      <div className="floating-icon icon-heart" aria-hidden="true">❤</div>
      <div className="floating-icon icon-chat" aria-hidden="true">💬</div>
      <div className="floating-icon icon-camera" aria-hidden="true">📸</div>
      <div className="phone-preview card">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="preview-feed-header">
            <span className="status-chip">Live campus feed</span>
            <span className="status-chip notice-chip">Notice</span>
          </div>

          <article className="phone-post phone-post-highlight">
            <div className="phone-post-head">
              <strong>KITSFLICK</strong>
              <span>Just now</span>
            </div>
            <h3>Campus stories, student voices, official updates.</h3>
            <p>Post anonymously or with your name, explore campus updates, clubs, and real student conversations.</p>
          </article>

          <article className="phone-post">
            <div className="phone-post-head">
              <strong>Photography Club</strong>
              <span>2m ago</span>
            </div>
            <p>Golden hour walk tonight near the main block. New members are welcome.</p>
            <div className="phone-tags">
              <span>#club</span>
              <span>#events</span>
            </div>
          </article>

          <article className="phone-post">
            <div className="phone-post-head">
              <strong>Anonymous</strong>
              <span>8m ago</span>
            </div>
            <p>Library discussion rooms are finally open again and the evening crowd is loving it.</p>
            <div className="phone-actions">
              <span>❤ 24</span>
              <span>💬 8</span>
            </div>
          </article>
        </div>
      </div>
    </Reveal>
  );
}

function PublicHero() {
  return (
    <section className="landing-hero landing-hero-premium">
      <Reveal className="hero-copy hero-copy-premium">
        <span className="eyebrow">Clean campus communication</span>
        <h1>Campus stories, student voices, official updates.</h1>
        <p className="hero-tagline">A clean, modern feed for real student life.</p>
        <p className="hero-description">
          Post anonymously or with your name, explore campus updates, clubs, and real student conversations.
        </p>

        <div className="hero-cta-stack">
          <Link className="animated-button hero-primary-cta" to="/signup">Get Started</Link>
          <Link className="ghost-button hero-secondary-cta" to="/signup">Join Now</Link>
        </div>

        <div className="trust-strip">
          <span className="status-chip">Built for Students</span>
          <span className="status-chip">Secure & Anonymous Posting Available</span>
          <span className="status-chip">Trusted Campus Platform</span>
        </div>
      </Reveal>

      <FeedPreviewPhone />
    </section>
  );
}

function CampusVisualSection() {
  return (
    <section className="public-section campus-showcase-section">
      <Reveal className="campus-showcase-shell">
        <figure className="campus-showcase-media">
          <img
            src="/kitspic.jpg"
            alt="KITS campus grounds with students, greenery, and academic spaces"
            loading="lazy"
            decoding="async"
          />
          <div className="campus-showcase-overlay" aria-hidden="true" />
        </figure>

        <div className="campus-showcase-highlight">
          <span className="status-chip">Campus stories in motion</span>
          <p>Built around real spaces, real voices, and the energy students live every day.</p>
        </div>

        <div className="card campus-showcase-copy">
          <span className="eyebrow">Campus Experience</span>
          <h2>Experience Our Campus</h2>
          <p>
            Where innovation meets environment, KITSFLICK turns everyday campus moments into a premium,
            connected story for students, clubs, and communities.
          </p>
          <div className="button-row campus-showcase-actions">
            <Link className="animated-button" to="/about">Explore More</Link>
            <Link className="ghost-button" to="/feed">View Live Feed</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="public-section">
      <div className="section-heading">
        <span className="eyebrow">Why it works</span>
        <h2>Everything important stays clear, fast, and campus-first.</h2>
      </div>
      <div className="feature-grid">
        {featureCards.map((feature) => (
          <Reveal key={feature.title} className="card feature-card premium-feature-card">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function AboutPreview() {
  return (
    <section className="public-section two-column">
      <Reveal className="section-card card">
        <span className="eyebrow">What KITSFLICK does</span>
        <h2>One place for daily campus life.</h2>
        <p>
          KITSFLICK combines public feed browsing, student expression, organization updates, and official notices in one
          motion-friendly experience that feels like a real product from the first visit.
        </p>
      </Reveal>

      <Reveal className="section-card card tone-card">
        <span className="eyebrow">Built for clarity</span>
        <ul className="feature-list">
          <li>Fast public feed browsing</li>
          <li>Thumb-friendly mobile layout</li>
          <li>Anonymous or named student posts</li>
          <li>Structured notices and organization visibility</li>
        </ul>
      </Reveal>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="public-section">
      <div className="section-heading">
        <span className="eyebrow">FAQ</span>
        <h2>Quick answers for visitors and students.</h2>
      </div>
      <div className="faq-list">
        {faqItems.map((item) => (
          <Reveal key={item.question} className="card faq-item">
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <main className="public-page landing-page">
      <PublicHero />
      <CampusVisualSection />
      <AboutPreview />
      <FeatureSection />
      <FAQSection />
    </main>
  );
}

export function AboutPage() {
  return (
    <main className="public-page">
      <section className="public-section about-section">
        <Reveal className="about-section-shell">
          <figure className="about-media">
            <img
              src={aboutImage}
              alt="Students and campus spaces representing the KITSFLICK community"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="card about-content">
            <span className="eyebrow">About Us</span>
            <h1>Who We Are</h1>
            <p>
              KITSFLICK is a campus-first platform built to keep students, clubs, and departments connected.
              We turn everyday moments into a trusted, premium feed that feels modern, safe, and community-driven.
            </p>
            <ul className="about-highlights">
              <li>Clear, verified campus updates and notices</li>
              <li>Student-first posting with anonymous options</li>
              <li>Modern, mobile-ready experience across devices</li>
            </ul>
            <div className="button-row about-actions">
              <Link className="animated-button" to="/signup">Learn More</Link>
              <Link className="ghost-button" to="/feed">View Feed</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

function RequestForm({ title, description, submitLabel, endpoint, organizationFieldLabel, organizationFieldKey, requesterUserId }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    departmentName: '',
    [organizationFieldKey]: '',
    description: '',
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      await apiJson(endpoint, 'POST', { ...form, requesterUserId });
      setForm({
        name: '',
        email: '',
        phoneNumber: '',
        departmentName: '',
        [organizationFieldKey]: '',
        description: '',
      });
      setStatus({ loading: false, error: '', success: `${title} submitted successfully.` });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  }

  return (
    <Reveal className="card section-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <form className="form-stack compact-form" onSubmit={handleSubmit}>
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" required />
        <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" required />
        <input value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="Phone Number" required />
        <input value={form.departmentName} onChange={(event) => setForm((current) => ({ ...current, departmentName: event.target.value }))} placeholder="Department Name" required />
        <input value={form[organizationFieldKey]} onChange={(event) => setForm((current) => ({ ...current, [organizationFieldKey]: event.target.value }))} placeholder={organizationFieldLabel} required />
        <textarea rows="4" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description / Purpose" required />
        <button className="animated-button" type="submit" disabled={status.loading}>
          {status.loading ? 'Submitting...' : submitLabel}
        </button>
      </form>
      {status.error ? <p className="message error">{status.error}</p> : null}
      {status.success ? <p className="message success">{status.success}</p> : null}
    </Reveal>
  );
}

export function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', message: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      await apiJson('/api/queries', 'POST', { ...form, requesterUserId: user?.id || '' });
      setForm({ name: '', email: '', phoneNumber: '', message: '' });
      setStatus({ loading: false, error: '', success: 'Your query has been submitted to the admin team.' });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  }

  return (
    <main className="public-page">
      <section className="public-section">
        <div className="section-heading">
          <span className="eyebrow">Contact</span>
          <h1>Questions, feedback, or collaboration ideas</h1>
        </div>
        <div className="contact-grid">
          <Reveal className="card section-card">
            <h3>Support</h3>
            <p>Email: support@kitsflick.com</p>
            <p>Use this for platform help, moderation concerns, and account support.</p>
          </Reveal>
          <Reveal className="card section-card">
            <h3>Campus Partnerships</h3>
            <p>Email: hello@kitsflick.com</p>
            <p>Use this for department updates, club onboarding, and public notice requests.</p>
          </Reveal>
        </div>
        <Reveal className="card section-card wide-card">
          <h3>Contact / Queries</h3>
          <p>Send your query directly to the admin dashboard for review and response tracking.</p>
          <form className="form-stack compact-form" onSubmit={handleSubmit}>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" required />
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" required />
            <input value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="Phone Number" required />
            <textarea rows="5" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Query / Message" required />
            <button className="animated-button" type="submit" disabled={status.loading}>
              {status.loading ? 'Sending...' : 'Submit Query'}
            </button>
          </form>
          {status.error ? <p className="message error">{status.error}</p> : null}
          {status.success ? <p className="message success">{status.success}</p> : null}
        </Reveal>
      </section>
    </main>
  );
}

function SimpleInfoPage({ eyebrow, title, description, bullets }) {
  return (
    <main className="public-page">
      <section className="public-section">
        <Reveal className="card section-card wide-card">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <ul className="feature-list">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </Reveal>
      </section>
    </main>
  );
}

export function SACPage() {
  const { user } = useAuth();
  return (
    <main className="public-page">
      <section className="public-section">
        <Reveal className="card section-card wide-card">
          <span className="eyebrow">SAC</span>
          <h1>Student Activity Center requests and coordination</h1>
          <p>
            Use SAC to submit new association or club requests for your department. Approved requests will appear
            in the platform and can be used for identity-based posting after admin approval.
          </p>
        </Reveal>

        <div className="contact-grid">
          <RequestForm
            title="Request Association"
            description="Submit an association request directly through SAC for departmental approval and platform onboarding."
            submitLabel="Request Association"
            endpoint="/api/association-requests"
            organizationFieldLabel="Association Name"
            organizationFieldKey="associationName"
            requesterUserId={user?.id || ''}
          />
          <RequestForm
            title="Request Club"
            description="Submit a new club request through SAC so the admin team can review, approve, and create it."
            submitLabel="Request Club"
            endpoint="/api/club-requests"
            organizationFieldLabel="Club Name"
            organizationFieldKey="clubName"
            requesterUserId={user?.id || ''}
          />
        </div>
      </section>
    </main>
  );
}

export function AssociationPage() {
  const { user } = useAuth();
  return (
    <main className="public-page">
      <section className="public-section">
        <Reveal className="card section-card wide-card">
          <span className="eyebrow">Association</span>
          <h1>Association information and community coordination</h1>
          <p>This section now lets students request new associations and clubs for their departments while keeping community coordination easy to find.</p>
        </Reveal>
        <div className="contact-grid">
          <RequestForm
            title="Request Association"
            description="Submit a request for a new department association. Approved requests are turned into real posting identities in the platform."
            submitLabel="Request Association"
            endpoint="/api/association-requests"
            organizationFieldLabel="Association Name"
            organizationFieldKey="associationName"
            requesterUserId={user?.id || ''}
          />
          <RequestForm
            title="Request Club"
            description="Submit a request for a new club. Approved club requests are available for identity-based posting in the main feed."
            submitLabel="Request Club"
            endpoint="/api/club-requests"
            organizationFieldLabel="Club Name"
            organizationFieldKey="clubName"
            requesterUserId={user?.id || ''}
          />
        </div>
      </section>
    </main>
  );
}

export function FAQPage() {
  return (
    <main className="public-page">
      <FAQSection />
    </main>
  );
}

export function PrivacyPage() {
  return (
    <main className="public-page">
      <section className="public-section">
        <Reveal className="card section-card wide-card legal-card">
          <span className="eyebrow">Privacy Policy</span>
          <h1>How KITSFLICK handles user information</h1>
          <p>Registration details, post data, and session details are used only to operate the platform, authenticate users, and support moderation.</p>
          <p>Anonymous posting hides identity publicly, but platform safeguards and moderation still apply.</p>
        </Reveal>
      </section>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="public-page">
      <section className="public-section">
        <Reveal className="card section-card wide-card legal-card">
          <span className="eyebrow">Terms & Conditions</span>
          <h1>Simple rules for a healthy student platform</h1>
          <p>Use KITSFLICK responsibly, communicate respectfully, and avoid harmful, misleading, or abusive content.</p>
          <p>Anonymous posting is supported, but all users remain accountable for what they publish.</p>
        </Reveal>
      </section>
    </main>
  );
}

export function DisclaimerPage() {
  return (
    <main className="public-page">
      <section className="public-section">
        <Reveal className="card section-card wide-card legal-card">
          <span className="eyebrow">Disclaimer</span>
          <h1>Public content may reflect student opinions</h1>
          <p>KITSFLICK hosts campus conversation and does not automatically represent official institutional positions.</p>
          <p>For critical academic or administrative decisions, users should still confirm details through official channels.</p>
        </Reveal>
      </section>
    </main>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="footer-grid">
        <div>
          <strong>KITSFLICK</strong>
          <p>Clean, modern campus communication for students, organizations, and notices.</p>
        </div>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/disclaimer">Disclaimer</Link>
        </div>
      </div>
      <p className="footer-copy">Copyright © 2026 KITSFLICK. All rights reserved.</p>
    </footer>
  );
}
