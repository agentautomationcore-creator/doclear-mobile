import { useState, useEffect, useCallback } from 'react';
import { getNetworkStatus, type NetworkStatus } from '../lib/offline';

export function useNetwork() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
  });

  const refresh = useCallback(async () => {
    const networkStatus = await getNetworkStatus();
    setStatus(networkStatus);
  }, []);

  useEffect(() => {
    refresh();

    // Poll every 10 seconds for connectivity changes
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    isOnline: status.isConnected && status.isInternetReachable,
    isOffline: !status.isConnected || !status.isInternetReachable,
    networkType: status.type,
    refresh,
  };
}
