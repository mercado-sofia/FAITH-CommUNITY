//headsApi.js

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const headsApi = createApi({
  reducerPath: 'headsApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/` }),
  endpoints: (builder) => ({
    getHeadsByOrg: builder.query({
      query: (organization_id) => `heads/${organization_id}`,
    }),
  }),
});

export const { useGetHeadsByOrgQuery } = headsApi;
