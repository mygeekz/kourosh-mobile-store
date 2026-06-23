import React from 'react';
import { Route } from 'react-router-dom';

import RoleProtectedRoute from '../../components/RoleProtectedRoute';
import type { AppRouteDefinition, RoleRouteGroup } from './routeManifest';

const routeKey = (route: AppRouteDefinition, fallback: string): string => {
  if (route.index) return `${fallback}:index`;
  return `${fallback}:${route.path}`;
};

export const renderRouteDefinitions = (
  routes: AppRouteDefinition[],
  groupId: string,
): React.ReactElement[] => routes.map((route, index) => {
  const key = routeKey(route, `${groupId}:${index}`);

  if (route.index) {
    return <Route key={key} index element={route.element} />;
  }

  return <Route key={key} path={route.path} element={route.element} />;
});

export const renderRoleRouteGroup = (group: RoleRouteGroup): React.ReactElement => (
  <Route
    key={group.id}
    element={<RoleProtectedRoute allowedRoles={group.allowedRoles} />}
  >
    {renderRouteDefinitions(group.routes, group.id)}
  </Route>
);
