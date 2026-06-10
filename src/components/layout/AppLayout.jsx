import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import RouteGuard from './RouteGuard';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import BackButton from '@/components/shared/BackButton';

const HOME_ROUTES = ['/', '/dashboard'];

function BackButtonBar() {
  const location = useLocation();
  const isHome = HOME_ROUTES.includes(location.pathname);
  if (isHome) return null;
  return <BackButton fallback="/" />;
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
      <main className="md:ml-60 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-8">
          <BackButtonBar />
          <RouteGuard>
            <motion.div
              key={useLocation().pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </RouteGuard>
        </div>
      </main>
    </div>
  );
}