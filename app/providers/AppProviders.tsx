import React from 'react';
import { HashRouter } from 'react-router-dom';

import AppErrorBoundary from '../../components/AppErrorBoundary';
import SmartTooltipLayer from '../../components/SmartTooltipLayer';
import { AuthProvider } from '../../contexts/AuthContext';
import { ConfirmProvider } from '../../contexts/ConfirmContext';
import { FavoritesProvider } from '../../contexts/FavoritesContext';
import { FeatureFlagsProvider } from '../../contexts/FeatureFlagsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

type AppProvidersProps = {
  children: React.ReactNode;
};

/**
 * Root provider composition for the client app.
 *
 * Keep the nesting order aligned with the legacy index.tsx tree unless a
 * dedicated provider audit proves a safer order. Several contexts depend on
 * router/theme/auth availability during initial render.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider>
          <FavoritesProvider>
            <FeatureFlagsProvider>
              <ConfirmProvider>
                <AppErrorBoundary>
                  {children}
                  <SmartTooltipLayer />
                </AppErrorBoundary>
              </ConfirmProvider>
            </FeatureFlagsProvider>
          </FavoritesProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  );
};
