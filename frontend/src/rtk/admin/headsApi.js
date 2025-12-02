//headsApi.js

import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const headsApi = createApi({
  reducerPath: 'headsApi',
  baseQuery: createBaseQuery('/api', false),
  endpoints: (builder) => ({
    getHeadsByOrg: builder.query({
      query: (organization_id) => `heads/${organization_id}`,
    }),
  }),
});

export const { useGetHeadsByOrgQuery } = headsApi;
