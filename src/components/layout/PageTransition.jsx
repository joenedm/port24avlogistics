import React from 'react';
import { motion } from 'framer-motion';

export default function PageTransition({ children, location }) {
  return (
    <motion.div
      key={location?.pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}