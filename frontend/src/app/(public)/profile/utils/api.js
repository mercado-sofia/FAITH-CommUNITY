// API configuration utility for profile components
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const getApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('userToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getAuthHeadersWithFormData = () => {
  const token = localStorage.getItem('userToken');
  return {
    'Authorization': `Bearer ${token}`
  };
};
