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
    loginSuperAdmin: (state) => {
      state.isAuthenticated = true
      state.token = "superadmin"
      state.admin = {
        email: "superadmin@faith.com",
        role: "superadmin",
        org: "FAITH Community System",
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
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("adminToken")
        localStorage.removeItem("adminData")
        localStorage.removeItem("token")
        localStorage.removeItem("userRole")
        document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
      }
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
    // Initialize from localStorage
    initializeAuth: (state) => {
      if (typeof window !== "undefined") {
        const adminToken = localStorage.getItem("adminToken")
        const adminData = localStorage.getItem("adminData")
        const superadminToken = localStorage.getItem("token")
        const userRole = localStorage.getItem("userRole")

        if (userRole === "superadmin" && superadminToken === "superadmin") {
          state.isAuthenticated = true
          state.token = "superadmin"
          state.admin = {
            email: "superadmin@faith.com",
            role: "superadmin",
            org: "FAITH Community System",
          }
          state.userType = "superadmin"
        } else if (adminToken && adminData) {
          try {
            state.isAuthenticated = true
            state.token = adminToken
            state.admin = JSON.parse(adminData)
            state.userType = "admin"
          } catch (error) {
            console.error("Error parsing admin data:", error)
            // Clear invalid data
            localStorage.removeItem("adminToken")
            localStorage.removeItem("adminData")
          }
        }
      }
    },
  },
})

export const { loginAdmin, loginSuperAdmin, logoutAdmin, setLoading, setError, clearError, initializeAuth } =
  adminSlice.actions

export default adminSlice.reducer

// Selectors
export const selectIsAuthenticated = (state) => state.admin.isAuthenticated
export const selectAdminToken = (state) => state.admin.token
export const selectCurrentAdmin = (state) => state.admin.admin
export const selectAdminLoading = (state) => state.admin.loading
export const selectAdminError = (state) => state.admin.error
export const selectUserType = (state) => state.admin.userType
