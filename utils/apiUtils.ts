// utils/apiUtils.ts

/**
 * Returns headers for API requests, including Authorization if a token is provided.
 * @param token The authentication token.
 * @param isFormData If true, Content-Type will not be set (useful for FormData uploads).
 * @returns HeadersInit object.
 */
export const getAuthHeaders = (token: string | null, isFormData: boolean = false): HeadersInit => {
  const headers: HeadersInit = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};
