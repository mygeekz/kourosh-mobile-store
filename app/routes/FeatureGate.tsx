import React from 'react';

import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';

const Forbidden = React.lazy(() => import('../../pages/Forbidden'));

type FeatureGateProps = {
  feature: string;
  children: React.ReactElement;
};

/**
 * Feature flag guard used by the route manifest.
 *
 * Keep this guard close to routing so business pages stay unaware of feature
 * availability policy. The Forbidden page is lazy-loaded inside the app-level
 * Suspense boundary from AppRoutes.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children }) => {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(feature) ? children : <Forbidden />;
};
