export class AuthService {
  public authenticate(): void {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      if (chrome.runtime.lastError || !token) {
        console.error(chrome.runtime.lastError);
        return;
      }
      // Use the token to authenticate with your backend
      fetch("https://your-backend.com/auth/google", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("User authenticated:", data);
        })
        .catch((error) => {
          console.error("Error during authentication:", error);
        });
    });
  }
}
