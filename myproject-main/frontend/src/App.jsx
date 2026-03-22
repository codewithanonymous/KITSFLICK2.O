import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import SnapFeed from './components/SnapFeed';
import Upload from './components/Upload';
import Admin from './components/Admin';
import AdminUsersPage from './components/AdminUsers';
import Login from './components/Login';
import SignUp from './components/SignUp';
import BunkPlanner from './components/BunkPlanner';
import { GlowOrbs, PageShell, Reveal } from './components/Animations';
import {
  AboutPage,
  AssociationPage,
  ContactPage,
  DisclaimerPage,
  FAQPage,
  LandingPage,
  PrivacyPage,
  PublicFooter,
  SACPage,
  TermsPage,
} from './components/PublicPages';
import { AuthProvider, useAuth } from './context/AuthContext';

function AuthGate({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AuthPageShell({ title, eyebrow, description, children }) {
  return (
    <main className="public-page auth-page">
      <section className="public-section auth-stage">
        <Reveal className="card auth-shell-card">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
          {children}
        </Reveal>
      </section>
    </main>
  );
}

function LoginPage() {
  return (
    <AuthPageShell
      eyebrow="Login"
      title="Continue your campus journey"
      description="Sign in here for student access. Admin accounts should use the dedicated Admin page instead of the user login form."
    >
      <Login />
    </AuthPageShell>
  );
}

function SignUpPage() {
  return (
    <AuthPageShell
      eyebrow="Sign Up"
      title="Create your KITSFLICK account"
      description="Join with your campus identity and participate in a trusted student-first platform."
    >
      <SignUp />
    </AuthPageShell>
  );
}

function AppBody() {
  const location = useLocation();
  const publicOnlyFooterRoutes = ['/', '/about', '/contact', '/faq', '/privacy', '/terms', '/disclaimer'];
  const showFooter = publicOnlyFooterRoutes.includes(location.pathname);

  return (
    <PageShell>
      <GlowOrbs />
      <NavBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/sac" element={<SACPage />} />
        <Route path="/association" element={<AssociationPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/bunk-planner"
          element={(
            <AuthGate>
              <BunkPlanner />
            </AuthGate>
          )}
        />
        <Route path="/feed" element={<SnapFeed />} />
        <Route path="/feed.html" element={<Navigate to="/feed" replace />} />
        <Route
          path="/upload"
          element={(
            <AuthGate>
              <Upload />
            </AuthGate>
          )}
        />
        <Route path="/upload.html" element={<Navigate to="/upload" replace />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/users" element={<AdminUsersPage />} />
        <Route path="/admin/users" element={<Navigate to="/users" replace />} />
        <Route path="/admin.html" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showFooter ? <PublicFooter /> : null}
    </PageShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppBody />
    </AuthProvider>
  );
}
