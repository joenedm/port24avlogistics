import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Monitor, Package, Users, FileText, Scan, BarChart3, ArrowRight, X } from 'lucide-react';

const MODULES = [
  { icon: Monitor, label: 'Show Management', description: 'Plan and track live events end-to-end', path: '/shows' },
  { icon: Package, label: 'Inventory Control', description: 'Manage all your AV equipment assets', path: '/assets' },
  { icon: Users, label: 'Crew Operations', description: 'Schedule crew and manage bookings', path: '/crew-dashboard' },
  { icon: FileText, label: 'Quotes & Invoices', description: 'Build quotes and issue invoices', path: '/quotes' },
  { icon: Scan, label: 'Scan & Check-out', description: 'QR-based gear tracking on the floor', path: '/scan' },
  { icon: BarChart3, label: 'Mission Control', description: 'Live dashboard across all projects', path: '/mission-control' },
];

export default function DemoMode() {
  const navigate = useNavigate();

  const handleEnter = (path) => {
    sessionStorage.setItem('port24_demo_mode', '1');
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-foreground">Port <span className="text-primary">24</span></span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">DEMO</span>
        </div>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" /> Exit Demo
        </Link>
      </header>

      {/* Hero */}
      <div className="text-center px-8 pt-16 pb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Explore Port 24</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          This is a sandboxed environment. Browse freely — no account required.
        </p>
      </div>

      {/* Module Grid */}
      <div className="flex-1 px-8 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(({ icon: Icon, label, description, path }) => (
            <button
              key={path}
              onClick={() => handleEnter(path)}
              className="group text-left p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-card/80 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{label}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Ready to get started?{' '}
          <Link to="/signin" className="text-primary hover:underline">Sign in</Link>
          {' '}or{' '}
          <Link to="/" className="text-primary hover:underline">learn more</Link>.
        </p>
      </div>
    </div>
  );
}