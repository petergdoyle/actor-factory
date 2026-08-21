/**
 * Helper to dynamically compute the FastAPI backend URL based on the current window hostname.
 * Allows seamless access from localhost as well as LAN/VLAN IP addresses (e.g. 192.168.x.x:3000).
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:8000/api/v1`;
  }
  return "http://localhost:8000/api/v1";
};
