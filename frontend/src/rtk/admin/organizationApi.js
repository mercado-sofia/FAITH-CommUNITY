//organizationsApi.js

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const organizationApi = createApi({
  reducerPath: 'organizationApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/` }),
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
