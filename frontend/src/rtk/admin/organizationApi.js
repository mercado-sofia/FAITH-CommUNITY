//organizationsApi.js

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api/` : '/api/';
};

export const organizationApi = createApi({
  reducerPath: 'organizationApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
  }),
  endpoints: (builder) => ({
    getAllOrganizations: builder.query({
      query: () => 'organization/all',
    }),
    getOrganizationById: builder.query({
      query: (id) => `organization/${id}`,
    }),
  }),
});

export const { useGetAllOrganizationsQuery, useGetOrganizationByIdQuery } = organizationApi;
