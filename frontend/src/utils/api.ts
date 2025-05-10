import axios from "axios";

const API_URL = "https://meme-gen-hub.vercel.app/api";
// Flag to prevent redirect loops
let isRedirecting = false;

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to check if token is expired or invalid
const isTokenExpired = (token: string): boolean => {
  try {
    // Basic validation: token should be a JWT with 3 parts
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.log("Token does not have 3 parts");
      return true;
    }

    // Check expiration
    const payload = JSON.parse(atob(parts[1]));

    // Validate payload has required fields
    if (!payload.userId) {
      console.log("Token missing userId");
      return true;
    }

    if (!payload.exp) {
      console.log("Token missing expiration");
      return true;
    }

    const isExpired = payload.exp * 1000 < Date.now();
    if (isExpired) {
      console.log("Token is expired");
    }

    return isExpired;
  } catch (e) {
    console.error("Token validation error:", e);
    return true;
  }
};

// Helper to validate MongoDB ObjectId format
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Add request logging
api.interceptors.request.use(
  (config) => {
    // Add token to request if available
    const token = localStorage.getItem("token");
    if (token) {
      // Check if token is valid before adding it to the request
      if (!isTokenExpired(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Clear invalid token
        console.log("Clearing expired token");
        localStorage.removeItem("token");
      }
    }

    // Log the request URL and method
    console.log(
      `API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      {
        params: config.params,
        hasAuth: config.headers.Authorization ? "Yes" : "No",
      }
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response logging
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`API Response: ${response.status} ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      hasData: response.data ? "Yes" : "No",
    });
    return response;
  },
  (error) => {
    // Log error responses
    if (error.response) {
      console.error(
        `API Error: ${error.response.status} ${error.config?.url}`,
        {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params,
          },
        }
      );
    } else if (error.request) {
      console.error("API Error: No response received", error.request);
    } else {
      console.error("API Error:", error.message);
    }

    // Continue with existing error handling
    // Prevent redirect loops
    if (isRedirecting) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized or 403 Forbidden
    if (
      [401, 403].includes(error.response?.status) &&
      typeof window !== "undefined"
    ) {
      console.log(
        `Received ${error.response?.status} error:`,
        error.response?.data
      );

      // Clear token if it exists
      if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
      }

      // Set redirecting flag to prevent loops
      isRedirecting = true;

      // Redirect to login if unauthorized
      window.location.href = `/auth/signin?redirect=${window.location.pathname}`;
      return Promise.reject(new Error("Authentication required"));
    }

    // Handle 400 Bad Request that might be related to authentication
    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message || "";
      console.log("400 error message:", errorMessage);

      if (
        errorMessage.includes("Invalid") &&
        (errorMessage.includes("user ID") || errorMessage.includes("ID format"))
      ) {
        console.log("Invalid ID format detected, likely an auth issue");

        // Clear token if it exists
        if (localStorage.getItem("token")) {
          localStorage.removeItem("token");
        }

        // Only redirect if we're not already on the signin page
        if (
          !window.location.pathname.includes("/auth/signin") &&
          !isRedirecting
        ) {
          isRedirecting = true;
          window.location.href = `/auth/signin?redirect=${window.location.pathname}`;
          return Promise.reject(new Error("Invalid authentication"));
        }
      }
    }

    // Handle 404 Not Found for specific API endpoints related to authentication
    if (error.response?.status === 404) {
      const url = error.config?.url || "";
      if (url.includes("/votes/") || url.includes("/comments/")) {
        // For guest users trying to access protected resources, redirect to login
        if (
          !localStorage.getItem("token") &&
          typeof window !== "undefined" &&
          !isRedirecting
        ) {
          isRedirecting = true;
          window.location.href = `/auth/signin?redirect=${window.location.pathname}`;
          return Promise.reject(new Error("Authentication required"));
        }
      }
    }

    // Reset redirecting flag after a short delay
    setTimeout(() => {
      isRedirecting = false;
    }, 2000);

    return Promise.reject(error);
  }
);

export default api;
