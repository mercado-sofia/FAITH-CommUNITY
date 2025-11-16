//advocaciesApi.js

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api/` : '/api/';
};

export const advocaciesApi = createApi({
  reducerPath: 'advocaciesApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
  }),
  endpoints: (builder) => ({
    getAllAdvocacies: builder.query({
      query: () => 'advocacies',
    }),
    getAdvocaciesByOrg: builder.query({
      query: (organization_id) => `advocacies/${organization_id}`,
    }),
  }),
});

export const { useGetAllAdvocaciesQuery, useGetAdvocaciesByOrgQuery } = advocaciesApi;
