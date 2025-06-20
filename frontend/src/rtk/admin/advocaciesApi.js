//advocaciesApi.js

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const advocaciesApi = createApi({
  reducerPath: 'advocaciesApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:8080/api/' }),
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
