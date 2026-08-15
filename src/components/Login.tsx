import React, { useState } from "react";
import { Key, User, Shield, AlertCircle, HelpCircle, Loader2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLoginSuccess: (user: { username: string; name: string; expire: string; key: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredUsername = username.trim();
    const enteredKey = key.trim();

    if (!enteredUsername || !enteredKey) {
      setError("Please fill in both fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch keys.json from the GitHub raw URL
      const rawUrl = "https://raw.githubusercontent.com/NotPepsiii/cmxa3/main/keys.json";
      let response;
      try {
        response = await fetch(rawUrl, { cache: "no-store" });
      } catch (networkErr: any) {
        console.error("Network fetch failed:", networkErr);
        setError("keys.json not loaded (Network request failed)");
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        console.error(`Fetch HTTP error: ${response.status} ${response.statusText}`);
        setError(`keys.json not loaded (HTTP status ${response.status})`);
        setLoading(false);
        return;
      }

      // Wait for fetch to complete and parse
      let json: any;
      try {
        json = await response.json();
      } catch (parseErr: any) {
        console.error("JSON parsing failed:", parseErr);
        setError("keys.json not loaded (Invalid JSON format)");
        setLoading(false);
        return;
      }

      // 2. REQUIRED DEBUG LOGGING: Log the full JSON to console so you can see what is actually returned
      console.log("DEBUG: Full JSON data returned from GitHub:", json);

      // 3. Check if json is null or undefined or if json.users exists
      if (!json || typeof json !== "object") {
        setError("keys.json not loaded (Invalid root database structure)");
        setLoading(false);
        return;
      }

      if (!json.users) {
        setError("users object missing in keys.json");
        setLoading(false);
        return;
      }

      // 4. REQUIRED DEBUG LOGGING: Log the keys of json.users so you can debug the exact strings
      console.log("DEBUG: All registered usernames found in keys.json:", Object.keys(json.users));

      // 5. Correctly check if the entered username exists as a key in json.users
      // Uses the exact path: json.users[enteredUsername]
      const userRecord = json.users[enteredUsername];

      if (!userRecord) {
        console.warn(`DEBUG: Username "${enteredUsername}" was not found in the users list.`);
        setError("Your key has been revoked.");
        setLoading(false);
        return;
      }

      // 6. Validate Key
      if (userRecord.key !== enteredKey) {
        setError("Incorrect Access Key. Please check the key given by Pepsi.");
        setLoading(false);
        return;
      }

      // 7. Validate Expiration Date (Date.now() > new Date(expire))
      const expireTime = new Date(userRecord.expire).getTime();
      const nowTime = Date.now();

      if (isNaN(expireTime)) {
        setError("Invalid expiration date format stored in database. Contact support.");
        setLoading(false);
        return;
      }

      if (nowTime > expireTime) {
        setError(`Your access key has expired on ${userRecord.expire}. Use the Discord bot to request a new key.`);
        setLoading(false);
        return;
      }

      // Success - Save to session state
      localStorage.setItem("pf_username", enteredUsername);
      localStorage.setItem("pf_key", enteredKey);
      onLoginSuccess({
        username: enteredUsername,
        name: enteredUsername, // We use the Discord username as the display name
        expire: userRecord.expire,
        key: enteredKey
      });

    } catch (err: any) {
      console.error("General login error details:", err);
      setError(`Unable to validate key: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090c] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Decorative cinematic background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#3b82f6]/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <header className="pt-8 px-6 md:px-12 max-w-7xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 select-none">
          <span className="text-xl md:text-2xl font-black text-[#e50914] tracking-wider uppercase">
            PEP<span className="text-white">FLICK</span><span className="text-amber-400 font-light ml-0.5">+</span>
          </span>
        </div>
        <button
          id="btn-login-help-toggle"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white bg-[#111216] border border-neutral-850 px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:border-neutral-700 tv-focusable"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need a Key?</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#0e0f14] border border-neutral-850 p-8 rounded-xl shadow-2xl relative"
          >
            {/* Top Security Icon */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-[#111216] border border-neutral-850 text-[#e50914] flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6" />
            </div>

            <div className="text-center mt-4 mb-8">
              <h1 className="text-xl font-extrabold text-white uppercase tracking-wider">
                Restricted Access
              </h1>
              <p className="text-xs text-neutral-400 mt-1.5">
                Please enter given username and password by Pepsi to continue using PepFlick.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-lg mb-6 flex items-start gap-2.5 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-neutral-400 mb-1.5">
                  PepFlick Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#07080b] border border-neutral-800 focus:border-[#e50914] focus:outline-none rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-600 transition-all focus:ring-1 focus:ring-[#e50914]/20 h-10 tv-focusable"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-neutral-400 mb-1.5">
                  Access Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-key"
                    type="password"
                    required
                    placeholder="Password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#07080b] border border-neutral-800 focus:border-[#e50914] focus:outline-none rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-600 transition-all focus:ring-1 focus:ring-[#e50914]/20 h-10 tv-focusable"
                  />
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#e50914] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed tv-focusable"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock PepFlick</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Support section details inside help drawer */}
            {showHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 border-t border-neutral-850 pt-4 text-left leading-relaxed text-xs text-neutral-400 space-y-2.5"
              >
                <p className="font-extrabold text-neutral-200">How do I register or get a key?</p>
                <p>
                  PepFlick keys are generated instantly via our custom **Discord bot**. Join our Discord server and use:
                </p>
                <div className="bg-[#07080b] p-2.5 rounded border border-neutral-850 font-mono text-[10px] text-amber-400 space-y-1 select-all">
                  <p>/key username expire</p>
                </div>
                <p className="text-[10.5px]">
                  Where <code className="text-white">username</code> is the name you want to use here, and <code className="text-white">expire</code> is the validity period (e.g., <code className="text-white">2026-12-31</code>).
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer / Safety Notice */}
      <footer className="py-6 px-4 text-center text-[10px] text-neutral-500 max-w-md mx-auto w-full z-10 leading-relaxed">
        <p className="font-bold text-neutral-400">PepFlick Secure Login</p>
        <p className="mt-1">
          Authorized accesses only.
        </p>
      </footer>
    </div>
  );
}
