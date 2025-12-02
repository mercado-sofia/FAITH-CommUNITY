//advocaciesApi.js

import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const advocaciesApi = createApi({
  reducerPath: 'advocaciesApi',
  baseQuery: createBaseQuery('/api', false),
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
