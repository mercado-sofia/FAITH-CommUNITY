//organizationsApi.js

import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const organizationApi = createApi({
  reducerPath: 'organizationApi',
  baseQuery: createBaseQuery('/api', false),
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
