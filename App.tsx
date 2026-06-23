import React from 'react';

import { BrandingBootstrap } from './app/bootstrap';
import { AppToaster, GlobalAppFeedbackBridge } from './app/feedback';
import { AppRoutes } from './app/routes';
import GlobalButtonEffects from './components/GlobalButtonEffects';
import PwaInstallOverlay from './components/PwaInstallOverlay';
import { StyleProvider } from './contexts/StyleContext';

const App: React.FC = () => {
  return (
    <StyleProvider>
      <BrandingBootstrap />
      <PwaInstallOverlay />
      <GlobalButtonEffects />
      <GlobalAppFeedbackBridge />
      <AppToaster />
      <AppRoutes />
    </StyleProvider>
  );
};

export default App;
