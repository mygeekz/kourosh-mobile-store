import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileBottomNavActivePillProps {
  active: boolean;
}

export const MobileBottomNavActivePill: React.FC<MobileBottomNavActivePillProps> = ({ active }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        layoutId="bottomNavActivePill"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1 h-1 w-5 -translate-x-1/2 rounded-full bg-primary"
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        initial={{ opacity: 0, scaleX: 0.45 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0, scaleX: 0.45 }}
      />
    )}
  </AnimatePresence>
);
