document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const usernameInput = document.getElementById("username-input");
    const keyInput = document.getElementById("key-input");
    const errorBanner = document.getElementById("error-banner");
    const errorText = document.getElementById("error-text");
    const submitBtn = document.getElementById("submit-btn");
    const btnHelpToggle = document.getElementById("btn-help-toggle");
    const helpBox = document.getElementById("help-box");

    // Toggle help drawer info
    btnHelpToggle.addEventListener("click", () => {
        helpBox.classList.toggle("hidden");
    });

    // Check if session is already active
    const activeSession = localStorage.getItem("pepflick_session");
    if (activeSession) {
        try {
            const parsed = JSON.parse(activeSession);
            if (parsed.expire && Date.now() < new Date(parsed.expire).getTime()) {
                // If already logged in and not expired, redirect to protected workspace instantly
                window.location.href = "main.html";
            } else {
                localStorage.removeItem("pepflick_session");
            }
        } catch (e) {
            console.error("Stale session error:", e);
        }
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const key = keyInput.value.trim();

        if (!username || !key) {
            showError("Please fill out all fields.");
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verifying Access Key...
        `;
        hideError();

        try {
            // Real Github Repo endpoint: NotPepsiii/cmxa3
            const url = "https://raw.githubusercontent.com/NotPepsiii/cmxa3/main/keys.json";
            
            let response;
            try {
                // Bypass caching to ensure we fetch the freshest Discord bot updates
                response = await fetch(url, { cache: "no-store" });
            } catch (networkErr) {
                console.error("Network fetch failed:", networkErr);
                showError("keys.json not loaded");
                return;
            }
            
            if (!response.ok) {
                console.error(`Fetch HTTP error: ${response.status}`);
                showError("keys.json not loaded");
                return;
            }

            let data;
            try {
                data = await response.json();
            } catch (parseErr) {
                console.error("JSON parsing failed:", parseErr);
                showError("keys.json not loaded");
                return;
            }

            // DEBUG LOGGING: Log the full JSON to console
            console.log("DEBUG: Full JSON data returned from GitHub:", data);

            if (!data || typeof data !== 'object') {
                showError("keys.json not loaded");
                return;
            }

            if (!data.users) {
                showError("users object missing in keys.json");
                return;
            }

            // DEBUG LOGGING: Log all registered keys
            console.log("DEBUG: All registered usernames found in keys.json:", Object.keys(data.users));

            const users = data.users;

            // Check if entered username exists as a key in json.users
            const userRecord = users[username];

            if (!userRecord) {
                console.warn(`DEBUG: Username "${username}" was not found in the users list.`);
                showError("Your key has been revoked.");
                return;
            }

            // 2. Secret Key Match Check
            if (userRecord.key !== key) {
                showError("Incorrect access key. Please retrieve it from the Discord bot.");
                return;
            }

            // 3. Expiration Check
            const expireDate = new Date(userRecord.expire).getTime();
            if (isNaN(expireDate)) {
                showError("Server error: Expiration date is misconfigured.");
                return;
            }

            if (Date.now() > expireDate) {
                showError(`This access key expired on ${userRecord.expire}. Ask the bot for a new key.`);
                return;
            }

            // Authentication succeeded! Store session state in localStorage
            localStorage.setItem("pepflick_session", JSON.stringify({
                username: username,
                expire: userRecord.expire
            }));

            // Redirect to protected dashboard workspace
            window.location.href = "main.html";

        } catch (err) {
            console.error("Fetch Error:", err);
            showError(`Access verification failed: ${err.message || "Network request timed out."}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <span>Unlock PepFlick</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            `;
        }
    });

    function showError(message) {
        errorText.textContent = message;
        errorBanner.classList.remove("hidden");
    }

    function hideError() {
        errorBanner.classList.add("hidden");
    }
});
