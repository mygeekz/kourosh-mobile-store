import React from "react";
import { Navigate } from "react-router-dom";

// Keep existing bookmarks working; the four primary destinations now live in the dock.
export const PartnerMore: React.FC = () => <Navigate to="/account" replace />;
