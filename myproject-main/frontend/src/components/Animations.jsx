export function PageShell({ children }) {
  return <div className="app-shell">{children}</div>;
}

export function GlowOrbs() {
  return (
    <div className="glow-orbs" aria-hidden="true">
      <span className="orb orb-one" />
      <span className="orb orb-two" />
      <span className="orb orb-three" />
      <span className="grid-overlay" />
    </div>
  );
}

export function Reveal({ children, className = '' }) {
  return <div className={`reveal ${className}`.trim()}>{children}</div>;
}

export function AnimatedButton({ children, className = '', ...props }) {
  return (
    <button className={`animated-button ${className}`.trim()} {...props}>
      <span>{children}</span>
    </button>
  );
}
