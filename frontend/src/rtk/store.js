import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query/react"

import { applyApi } from "./(public)/applyApi"
import { programsApi } from "./(public)/programsApi"
import { organizationsApi } from "./(public)/organizationsApi"
import { advocaciesApi } from "./admin/advocaciesApi"
import { competenciesApi } from "./admin/competenciesApi"
import { headsApi } from "./admin/headsApi"
import { organizationApi } from "./admin/organizationApi"
import { approvalApi } from "./admin/approvalApi"
import { submissionApi } from "./admin/submissionApi"
import { volunteersApi } from "./admin/volunteersApi"
import { adminProgramsApi } from "./admin/adminProgramsApi"
import { manageProfilesApi } from "./superadmin/manageProfilesApi"
import { faqApi } from "./superadmin/faqApi"
import adminReducer from "./superadmin/adminSlice"

export const store = configureStore({
  reducer: {
    admin: adminReducer,
    [applyApi.reducerPath]: applyApi.reducer,
    [programsApi.reducerPath]: programsApi.reducer,
    [organizationsApi.reducerPath]: organizationsApi.reducer,
    [advocaciesApi.reducerPath]: advocaciesApi.reducer,
    [competenciesApi.reducerPath]: competenciesApi.reducer,
    [headsApi.reducerPath]: headsApi.reducer,
    [organizationApi.reducerPath]: organizationApi.reducer,
    [approvalApi.reducerPath]: approvalApi.reducer,
    [submissionApi.reducerPath]: submissionApi.reducer,
    [volunteersApi.reducerPath]: volunteersApi.reducer,
    [adminProgramsApi.reducerPath]: adminProgramsApi.reducer,
    [manageProfilesApi.reducerPath]: manageProfilesApi.reducer,
    [faqApi.reducerPath]: faqApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      applyApi.middleware,
      programsApi.middleware,
      organizationsApi.middleware,
      advocaciesApi.middleware,
      competenciesApi.middleware,
      headsApi.middleware,
      organizationApi.middleware,
      approvalApi.middleware,
      submissionApi.middleware,
      volunteersApi.middleware,
      adminProgramsApi.middleware,
      manageProfilesApi.middleware,
      faqApi.middleware,
    ),
})

setupListeners(store.dispatch)
export default store
