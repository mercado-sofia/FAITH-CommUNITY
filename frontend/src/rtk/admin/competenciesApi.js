//competenciessApi.js

import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const competenciesApi = createApi({
  reducerPath: 'competenciesApi',
  baseQuery: createBaseQuery('/api', false),
  endpoints: (builder) => ({
    getAllCompetencies: builder.query({
      query: () => 'competencies',
    }),
    getCompetenciesByOrg: builder.query({
      query: (organization_id) => `competencies/${organization_id}`,
    }),
  }),
});

export const { useGetAllCompetenciesQuery, useGetCompetenciesByOrgQuery } = competenciesApi;
