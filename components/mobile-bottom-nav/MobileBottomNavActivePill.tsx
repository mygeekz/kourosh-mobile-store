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
        className="absolute inset-x-2 top-2 bottom-2 rounded-xl bg-primary/10"
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
    )}
  </AnimatePresence>
);
