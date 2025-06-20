import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const featuredProjectsApi = createApi({
  reducerPath: 'featuredProjectsApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:8080/api/admin/project' }),
  tagTypes: ['FeaturedProjects'],
  endpoints: (builder) => ({
    getFeaturedProjects: builder.query({
      query: () => '/',
      providesTags: ['FeaturedProjects'],
    }),
    
    addFeaturedProject: builder.mutation({
      query: (project) => ({
        url: '/',
        method: 'POST',
        body: project,
      }),
      invalidatesTags: ['FeaturedProjects'],
    }),

    updateFeaturedProject: builder.mutation({
      query: ({ id, ...project }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: project,
      }),
      invalidatesTags: ['FeaturedProjects'],
    }),

    deleteFeaturedProject: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FeaturedProjects'],
    }),
  }),
});

export const {
  useGetFeaturedProjectsQuery,
  useAddFeaturedProjectMutation,
  useUpdateFeaturedProjectMutation,
  useDeleteFeaturedProjectMutation,
} = featuredProjectsApi; 