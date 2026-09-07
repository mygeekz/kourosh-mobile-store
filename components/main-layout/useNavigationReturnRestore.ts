import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  getNavigationReturnRestoreRecord,
  restoreNavigationAnchorPosition,
} from '../../utils/navigationReturnContext';

export const useNavigationReturnRestore = () => {
  const location = useLocation();

  React.useEffect(() => {
    const record = getNavigationReturnRestoreRecord(location.state);
    if (!record) return;
    return restoreNavigationAnchorPosition(record);
  }, [location.key, location.state]);
};
