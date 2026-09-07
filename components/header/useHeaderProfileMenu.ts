import { useEffect, useRef, useState } from 'react';

export const useHeaderProfileMenu = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const toggleProfileMenu = () => setIsProfileMenuOpen((isOpen) => !isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const targetElement = target instanceof Element ? target : target.parentElement;
      if (targetElement?.closest('[data-ui-header-profile-menu="true"]')) return;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return {
    isProfileMenuOpen,
    profileMenuRef,
    toggleProfileMenu,
  };
};
