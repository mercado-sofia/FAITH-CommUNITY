import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query/react"

import { applyApi } from "./(public)/applyApi"
import { advocaciesApi } from "./admin/advocaciesApi"
import { competenciesApi } from "./admin/competenciesApi"
import { headsApi } from "./admin/headsApi"
import { organizationApi } from "./admin/organizationApi"
import { approvalApi } from "./admin/approvalApi"
import { submissionApi } from "./admin/submissionApi"
import { manageProfilesApi } from "./superadmin/manageProfilesApi"
import adminReducer from "./superadmin/adminSlice"

export const store = configureStore({
  reducer: {
    admin: adminReducer,
    [applyApi.reducerPath]: applyApi.reducer,
    [advocaciesApi.reducerPath]: advocaciesApi.reducer,
    [competenciesApi.reducerPath]: competenciesApi.reducer,
    [headsApi.reducerPath]: headsApi.reducer,
    [organizationApi.reducerPath]: organizationApi.reducer,
    [approvalApi.reducerPath]: approvalApi.reducer,
    [submissionApi.reducerPath]: submissionApi.reducer,
    [manageProfilesApi.reducerPath]: manageProfilesApi.reducer,
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
      manageProfilesApi.middleware,
    ),
})

setupListeners(store.dispatch)
export default store
