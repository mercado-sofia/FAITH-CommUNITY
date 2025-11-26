import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query/react"

// Public APIs
import {
  applyApi,
  programsApi,
  organizationsApi,
  messagesApi,
  userNotificationsApi,
} from "./(public)"

// Admin APIs
import {
  advocaciesApi,
  competenciesApi,
  headsApi,
  organizationApi,
  approvalApi,
  submissionApi,
  volunteersApi,
  adminProgramsApi,
  inboxApi,
  notificationsApi,
} from "./admin"

// Superadmin APIs
import {
  adminApi,
  invitationsApi,
  faqApi,
  superadminProgramsApi,
  superadminHighlightsApi,
  dashboardApi,
  superadminNotificationsApi,
  adminReducer,
} from "./superadmin"

// Collect all API modules for auto-registration
const apiModules = [
  // Public APIs
  applyApi,
  programsApi,
  organizationsApi,
  messagesApi,
  userNotificationsApi,
  // Admin APIs
  advocaciesApi,
  competenciesApi,
  headsApi,
  organizationApi,
  approvalApi,
  submissionApi,
  volunteersApi,
  adminProgramsApi,
  inboxApi,
  notificationsApi,
  // Superadmin APIs
  adminApi,
  invitationsApi,
  faqApi,
  superadminProgramsApi,
  superadminHighlightsApi,
  dashboardApi,
  superadminNotificationsApi,
]

// Auto-generate reducers from API modules
const apiReducers = Object.fromEntries(
  apiModules.map((api) => [api.reducerPath, api.reducer])
)

// Auto-generate middleware from API modules
const apiMiddleware = apiModules.map((api) => api.middleware)

export const store = configureStore({
  reducer: {
    admin: adminReducer,
    ...apiReducers,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...apiMiddleware),
})

setupListeners(store.dispatch)
export default store