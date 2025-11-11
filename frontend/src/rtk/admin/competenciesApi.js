//competenciessApi.js

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const competenciesApi = createApi({
  reducerPath: 'competenciesApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/` }),
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
