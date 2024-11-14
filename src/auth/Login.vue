<script setup lang="ts">
import { ref } from "vue";

// Types
interface GoogleAuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  message?: string; // Added for error handling
}

// State
const error = ref("");
const isLoading = ref(false);

// API Base URL
const API_BASE_URL = "http://localhost:1991";

const handleGoogleLogin = async () => {
  try {
    isLoading.value = true;
    error.value = "";

    const clientId =
      "34932676923-luth1cmkkhoqhq3kaoealqj2poosaln4.apps.googleusercontent.com";
    const redirectUri = chrome.identity.getRedirectURL("oauth2");
    const scope = "email profile";
    const responseType = "token";

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `response_type=${responseType}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}`;

    console.log("Auth URL:", authUrl);

    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      async (redirectUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          throw new Error(chrome.runtime.lastError.message);
        }

        if (!redirectUrl) {
          throw new Error("Google login failed - No redirect URL");
        }

        console.log("Redirect URL:", redirectUrl);

        const accessToken = new URLSearchParams(
          new URL(redirectUrl).hash.substring(1)
        ).get("access_token");

        if (!accessToken) {
          throw new Error("No access token received");
        }

        // Get user data using the success endpoint
        const response = await fetch(
          `${API_BASE_URL}/auth/success?token=${accessToken}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = (await response.json()) as GoogleAuthResponse;

        if (!response.ok) {
          throw new Error(data.message || "Google authentication failed");
        }

        // Store authentication data
        try {
          chrome.storage.local.set(
            {
              authToken: data.token,
              user: data.user,
            },
            () => {
              chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS" });
            }
          );
        } catch (error) {
          localStorage.setItem("authToken", JSON.stringify(data));
          chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS" });
        }

        // Check user data
        const userResponse = await fetch(`${API_BASE_URL}/auth/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.token}`,
            "Content-Type": "application/json",
          },
        });

        if (!userResponse.ok) {
          console.error("Failed to get user data");
          throw new Error("Failed to get user data");
        }

        const userData = await userResponse.json();
        console.log("User data:", userData);
      }
    );
  } catch (err) {
    console.error("Google login error:", err);
    error.value =
      err instanceof Error
        ? err.message
        : "An error occurred during Google login";
  } finally {
    isLoading.value = false;
  }
};

// Function to check authentication status
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/user`, {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const userData = await response.json();

      try {
        chrome.storage.local.set(
          {
            user: userData,
          },
          () => {
            chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS" });
          }
        );
      } catch (error) {
        localStorage.setItem("authToken", JSON.stringify(userData));
        chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS" });
      }
    }
  } catch (err) {
    console.error("Auth check error:", err);
  }
};

// Check auth status on component mount
checkAuthStatus();
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1>Welcome Back</h1>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="card">
        <div class="oauth-section">
          <button
            type="button"
            @click="handleGoogleLogin"
            class="google-button"
            :disabled="isLoading"
          >
            {{ isLoading ? "Connecting..." : "Continue with Google" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  width: 350px;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.login-box {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.card {
  padding: 2em;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
  font-size: 24px;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 16px;
}

.oauth-section {
  margin-top: 16px;
}

.google-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.google-button:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}
</style>
