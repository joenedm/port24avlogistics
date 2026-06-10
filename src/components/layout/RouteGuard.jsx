// RouteGuard — simplified, no crew redirects
import React from 'react';

export default function RouteGuard({ children }) {
  // Auth enforcement is temporarily disabled for recovery.
  // All authenticated users can access all routes.
  return children;
}