// 🔒 PepFlick+ Instant Client-Side Router Guard firewall with active Discord database checks
(async function () {
    const pfUsername = localStorage.getItem("pf_username");
    const pfKey = localStorage.getItem("pf_key");

    if (!pfUsername || !pfKey) {
        // No active session keys found, clear store and redirect
        localStorage.removeItem("pepflick_session");
        localStorage.removeItem("pf_username");
        localStorage.removeItem("pf_key");
        window.location.replace("index.html");
        return;
    }

    try {
        // 1. Fetch keys.json on every load to make sure they haven't been revoked
        const url = "https://raw.githubusercontent.com/NotPepsiii/cmxa3/main/keys.json";
        const response = await fetch(url, { cache: "no-store" });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch database keys (HTTP ${response.status})`);
        }

        const json = await response.json();
        if (!json || typeof json !== "object" || !json.users) {
            throw new Error("Invalid remote database structure");
        }

        // 2. If the username does NOT exist in keys.json → clear localStorage and redirect to login
        const userRecord = json.users[pfUsername];
        if (!userRecord) {
            console.warn(`Access revoked: User "${pfUsername}" was deleted from the bot database.`);
            localStorage.removeItem("pepflick_session");
            localStorage.removeItem("pf_username");
            localStorage.removeItem("pf_key");
            window.location.replace("index.html");
            return;
        }

        // 3. If the key in keys.json does NOT match pf_key → clear localStorage and redirect to login
        if (userRecord.key !== pfKey) {
            console.warn(`Access revoked: Key mismatch for "${pfUsername}".`);
            localStorage.removeItem("pepflick_session");
            localStorage.removeItem("pf_username");
            localStorage.removeItem("pf_key");
            window.location.replace("index.html");
            return;
        }

        // 4. If the expiration date in keys.json is in the past → clear localStorage and redirect to login
        const expireTime = new Date(userRecord.expire).getTime();
        const now = Date.now();
        if (isNaN(expireTime) || now > expireTime) {
            console.warn(`Access revoked: Key for "${pfUsername}" has expired on ${userRecord.expire}.`);
            localStorage.removeItem("pepflick_session");
            localStorage.removeItem("pf_username");
            localStorage.removeItem("pf_key");
            window.location.replace("index.html");
            return;
        }

        // Access authorized! Let the page render naturally.
        console.log(`%cPepFlick Guard: Session re-verified for ${pfUsername}.`, "color: #10b981; font-weight: bold;");

    } catch (e) {
        console.error("Session security check failed:", e);
        localStorage.removeItem("pepflick_session");
        localStorage.removeItem("pf_username");
        localStorage.removeItem("pf_key");
        window.location.replace("index.html");
    }
})();
