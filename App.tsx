import React from 'react';

import { BrandingBootstrap } from './app/bootstrap';
import { AppToaster, GlobalAppFeedbackBridge } from './app/feedback';
import SpaNavigationGuard from './app/runtime/SpaNavigationGuard';
import { AppRoutes } from './app/routes';
import GlobalButtonEffects from './components/GlobalButtonEffects';
import PwaInstallOverlay from './components/PwaInstallOverlay';

const App: React.FC = () => {
  return (
    <>
      <BrandingBootstrap />
      <PwaInstallOverlay />
      <SpaNavigationGuard />
      <GlobalButtonEffects />
      <GlobalAppFeedbackBridge />
      <AppToaster />
      <AppRoutes />
    </>
  );
};

export default App;
