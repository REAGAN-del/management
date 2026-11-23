(() => {
  const form = document.getElementById("auth-form");
  const passwordInput = document.getElementById("password");
  const submitButton = document.getElementById("auth-submit");
  const status = document.getElementById("auth-status");
  const allowedReturnPaths = new Set([
    "/",
    "/index.html",
    "/trainee.html",
    "/program.html",
    "/sessions.html",
    "/payments.html",
  ]);
  const requestedPath = new URLSearchParams(window.location.search).get("return");
  const returnTo = allowedReturnPaths.has(requestedPath) ? requestedPath : "/index.html";

  form.addEventListener("submit", async event => {
    event.preventDefault();
    status.textContent = "";
    status.classList.remove("is-error");
    submitButton.disabled = true;

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ password: passwordInput.value, returnTo }),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The server returned an invalid response. Try again.");
      }

      if (!response.ok) {
        throw new Error(result.error || "Unable to sign in.");
      }
      window.location.assign(result.redirectTo);
    } catch (error) {
      status.textContent = error.message || "Unable to connect to the sign-in server.";
      status.classList.add("is-error");
      submitButton.disabled = false;
      passwordInput.focus();
    }
  });
})();
