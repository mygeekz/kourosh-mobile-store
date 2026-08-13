import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import { MainLayout } from '../../components/shell';
import ProtectedRoute from '../../components/ProtectedRoute';
import PublicRoute from '../../components/PublicRoute';
import RoleProtectedRoute from '../../components/RoleProtectedRoute';
import AppLoadingScreen from '../../components/AppLoadingScreen';
import * as Page from './lazyPages';
import {
  mainLayoutCatchAllRoute,
  mainLayoutRoutes,
  printRoutes,
  publicRoutes,
  reportRoutes,
  reportsAllowedRoles,
  reportsLayoutRoute,
  roleRouteGroups,
  rootCatchAllRoute,
} from './routeManifest';
import { renderRoleRouteGroup, renderRouteDefinitions } from './routeRenderer';

const RouteFallback: React.FC = () => <AppLoadingScreen />;

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicRoute />}>
          {renderRouteDefinitions(publicRoutes, 'public')}
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/print" element={<Page.PrintLayout />}>
            {renderRouteDefinitions(printRoutes, 'print')}
          </Route>

          <Route element={<MainLayout />}>
            {renderRouteDefinitions(mainLayoutRoutes, 'main-layout')}
            {roleRouteGroups.map(renderRoleRouteGroup)}

            <Route element={<RoleProtectedRoute allowedRoles={reportsAllowedRoles} />}>
              <Route
                path={reportsLayoutRoute.path}
                element={reportsLayoutRoute.element}
              >
                {renderRouteDefinitions(reportRoutes, 'reports-layout')}
              </Route>
            </Route>

            {renderRouteDefinitions([mainLayoutCatchAllRoute], 'main-layout-catch-all')}
          </Route>
        </Route>

        {renderRouteDefinitions([rootCatchAllRoute], 'root-catch-all')}
      </Routes>
    </Suspense>
  );
};
