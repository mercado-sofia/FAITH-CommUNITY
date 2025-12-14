import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  isAuthenticated: false,
  token: null,
  admin: null,
  loading: false,
  error: null,
  userType: null, // 'admin' or 'superadmin'
}

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    loginAdmin: (state, action) => {
      state.isAuthenticated = true
      state.token = action.payload.token
      state.admin = action.payload.admin
      state.userType = "admin"
      state.error = null
    },
    loginSuperAdmin: (state, action) => {
      state.isAuthenticated = true
      state.token = action.payload.token || "superadmin"
      state.admin = action.payload.superadmin || {
        email: "faithcommunityfaces@gmail.com",
        role: "superadmin",
        org: "FACES",
        orgName: "FACES Community System",
      }
      state.userType = "superadmin"
      state.error = null
    },
    logoutAdmin: (state) => {
      state.isAuthenticated = false
      state.token = null
      state.admin = null
      state.userType = null
      state.error = null
      // Note: localStorage cleanup is now handled by authService
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    // Update admin email in Redux store
    updateAdminEmail: (state, action) => {
      if (state.admin) {
        state.admin.email = action.payload.email
        // Also update localStorage to keep it in sync
        if (typeof window !== "undefined") {
          const adminData = localStorage.getItem("adminData")
          if (adminData) {
            try {
              const parsedData = JSON.parse(adminData)
              parsedData.email = action.payload.email
              localStorage.setItem("adminData", JSON.stringify(parsedData))
            } catch (error) {
            }
          }
        }
      }
    },
    // Update admin organization data in Redux store
    updateAdminOrg: (state, action) => {
      if (state.admin) {
        state.admin.org = action.payload.org
        state.admin.orgName = action.payload.orgName
        // Also update localStorage to keep it in sync
        if (typeof window !== "undefined") {
          const adminData = localStorage.getItem("adminData")
          if (adminData) {
            try {
              const parsedData = JSON.parse(adminData)
              parsedData.org = action.payload.org
              parsedData.orgName = action.payload.orgName
              localStorage.setItem("adminData", JSON.stringify(parsedData))
            } catch (error) {
            }
          }
        }
      }
    },
    // Update admin organization logo in Redux store
    updateAdminLogo: (state, action) => {
      if (state.admin) {
        state.admin.logo = action.payload.logo
        // Also update localStorage to keep it in sync
        if (typeof window !== "undefined") {
          const adminData = localStorage.getItem("adminData")
          if (adminData) {
            try {
              const parsedData = JSON.parse(adminData)
              parsedData.logo = action.payload.logo
              localStorage.setItem("adminData", JSON.stringify(parsedData))
            } catch (error) {
            }
          }
        }
      }
    },
    // Initialize from localStorage (tokens are now in httpOnly cookies, not localStorage)
    initializeAuth: (state) => {
      if (typeof window !== "undefined") {
        const adminData = localStorage.getItem("adminData")
        const superadminData = localStorage.getItem("superAdminData")
        const userRole = typeof document !== 'undefined' ? 
          (document.cookie.includes('userRole=superadmin') ? 'superadmin' : 
           document.cookie.includes('userRole=admin') ? 'admin' : null) : null

        // Check for superadmin authentication (token is in httpOnly cookie)
        if (userRole === "superadmin" && superadminData) {
          try {
            state.isAuthenticated = true
            state.token = null // Tokens are in httpOnly cookies, not accessible to JS
            state.admin = JSON.parse(superadminData)
            state.userType = "superadmin"
          } catch (error) {
            // Invalid data - reset state
            state.isAuthenticated = false
            state.token = null
            state.admin = null
            state.userType = null
            state.error = "Invalid authentication data"
          }
        } else if (userRole === "admin" && adminData) {
          try {
            state.isAuthenticated = true
            state.token = null // Tokens are in httpOnly cookies, not accessible to JS
            state.admin = JSON.parse(adminData)
            state.userType = "admin"
          } catch (error) {
            // Reset state to unauthenticated - cleanup will be handled by layout
            state.isAuthenticated = false;
            state.token = null;
            state.admin = null;
            state.userType = null;
            state.error = "Invalid authentication data";
          }
        } else {
          // No valid authentication found
          state.isAuthenticated = false
          state.token = null
          state.admin = null
          state.userType = null
        }
      }
    },
  },
})

export const { loginAdmin, loginSuperAdmin, logoutAdmin, setLoading, setError, clearError, initializeAuth, updateAdminEmail, updateAdminOrg, updateAdminLogo } =
  adminSlice.actions

export default adminSlice.reducer

// Selectors
export const selectIsAuthenticated = (state) => state.admin.isAuthenticated
export const selectAdminToken = (state) => state.admin.token
export const selectCurrentAdmin = (state) => state.admin.admin
export const selectCurrentSuperAdmin = (state) => state.admin.userType === 'superadmin' ? state.admin.admin : null
export const selectAdminLoading = (state) => state.admin.loading
export const selectAdminError = (state) => state.admin.error
export const selectUserType = (state) => state.admin.userType
