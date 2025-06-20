import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query/react";

import { applyApi } from "./(public)/applyApi";
import { advocaciesApi } from "./admin/advocaciesApi";
import { competenciesApi } from "./admin/competenciesApi";
import { headsApi } from "./admin/headsApi";
import { organizationApi } from "./admin/organizationApi";
import { approvalApi } from './admin/approvalApi';
import { submissionApi } from './admin/submissionApi';


export const store = configureStore({
  reducer: {
    [applyApi.reducerPath]: applyApi.reducer,
    [advocaciesApi.reducerPath]: advocaciesApi.reducer,
    [competenciesApi.reducerPath]: competenciesApi.reducer,
    [headsApi.reducerPath]: headsApi.reducer,
    [organizationApi.reducerPath]: organizationApi.reducer,
    [approvalApi.reducerPath]: approvalApi.reducer,
    [submissionApi.reducerPath]: submissionApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      applyApi.middleware,
      advocaciesApi.middleware,
      competenciesApi.middleware,
      headsApi.middleware,
      organizationApi.middleware,
      approvalApi.middleware,
      submissionApi.middleware,
    ),
});

setupListeners(store.dispatch);
export default store;
