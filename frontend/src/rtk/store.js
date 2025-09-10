import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query/react"

import { applyApi } from "./(public)/applyApi"
import { programsApi } from "./(public)/programsApi"
import { organizationsApi } from "./(public)/organizationsApi"
import { messagesApi } from "./(public)/messagesApi"
import { userNotificationsApi } from "./(public)/userNotificationsApi"
import { advocaciesApi } from "./admin/advocaciesApi"
import { competenciesApi } from "./admin/competenciesApi"
import { headsApi } from "./admin/headsApi"
import { organizationApi } from "./admin/organizationApi"
import { approvalApi } from "./admin/approvalApi"
import { submissionApi } from "./admin/submissionApi"
import { volunteersApi } from "./admin/volunteersApi"
import { adminProgramsApi } from "./admin/adminProgramsApi"
import { inboxApi } from "./admin/inboxApi"
import { manageProfilesApi } from "./superadmin/manageProfilesApi"
import { faqApi } from "./superadmin/faqApi"
import { superadminProgramsApi } from "./superadmin/programsApi"
import { dashboardApi } from "./superadmin/dashboardApi"
import { notificationsApi } from "./admin/notificationsApi"
import adminReducer from "./superadmin/adminSlice"

export const store = configureStore({
  reducer: {
    admin: adminReducer,
    [applyApi.reducerPath]: applyApi.reducer,
    [programsApi.reducerPath]: programsApi.reducer,
    [organizationsApi.reducerPath]: organizationsApi.reducer,
    [messagesApi.reducerPath]: messagesApi.reducer,
    [userNotificationsApi.reducerPath]: userNotificationsApi.reducer,
    [advocaciesApi.reducerPath]: advocaciesApi.reducer,
    [competenciesApi.reducerPath]: competenciesApi.reducer,
    [headsApi.reducerPath]: headsApi.reducer,
    [organizationApi.reducerPath]: organizationApi.reducer,
    [approvalApi.reducerPath]: approvalApi.reducer,
    [submissionApi.reducerPath]: submissionApi.reducer,
    [volunteersApi.reducerPath]: volunteersApi.reducer,
    [adminProgramsApi.reducerPath]: adminProgramsApi.reducer,
    [inboxApi.reducerPath]: inboxApi.reducer,
    [manageProfilesApi.reducerPath]: manageProfilesApi.reducer,
    [faqApi.reducerPath]: faqApi.reducer,
    [superadminProgramsApi.reducerPath]: superadminProgramsApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      applyApi.middleware,
      programsApi.middleware,
      organizationsApi.middleware,
      messagesApi.middleware,
      userNotificationsApi.middleware,
      advocaciesApi.middleware,
      competenciesApi.middleware,
      headsApi.middleware,
      organizationApi.middleware,
      approvalApi.middleware,
      submissionApi.middleware,
      volunteersApi.middleware,
      adminProgramsApi.middleware,
      inboxApi.middleware,
      manageProfilesApi.middleware,
      faqApi.middleware,
      superadminProgramsApi.middleware,
      dashboardApi.middleware,
      notificationsApi.middleware,
    ),
})

setupListeners(store.dispatch)
export default store
