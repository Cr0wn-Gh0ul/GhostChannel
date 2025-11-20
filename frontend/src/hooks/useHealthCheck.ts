/**
 * Health Check Hook
 * 
 * Monitors backend server health status.
 * Polls /health endpoint every 30 seconds.
 * 
 * @returns Object with online status and last check timestamp
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface HealthStatus {
  online: boolean;
  lastCheck: Date | null;
}

export const useHealthCheck = () => {
  const [status, setStatus] = useState<HealthStatus>({
    online: true,
    lastCheck: null,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await apiClient.get('/health', { timeout: 5000 });
        setStatus({
          online: true,
          lastCheck: new Date(),
        });
      } catch (error) {
        console.error('[HealthCheck] Backend unreachable:', error);
        setStatus({
          online: false,
          lastCheck: new Date(),
        });
      }
    };

    // Check immediately on mount
    checkHealth();

    // Then check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return status;
};
