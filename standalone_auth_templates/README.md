# PepFlick+ Frontend Key Validation Ecosystem

This directory contains the fully implemented, production-ready **PepFlick key validation and authentication system**. It is designed to work seamlessly with your **Discord bot** and **GitHub Pages repository**.

## 📁 File Structure

```text
/standalone_auth_templates/
├── index.html       # The premium login page (requests PepFlick username & Access Key)
├── main.html        # The protected content page (guarded via Javascript router)
├── css/
│   └── style.css    # Custom styles & focus highlights
└── js/
    ├── login.js     # Fetches keys.json from Github Raw CDN, validates credentials, checks expiry
    └── protect.js   # Airtight script injected in <head> to block unauthorized users
```

---

## ⚙️ How the Ecosystem Works

1. **Discord Key Generation**:
   Your Discord bot receives commands like `/key username expire`. When run, it commits a new JSON entry into `keys.json` in your repository (`NotPepsiii/cmxa3`).
   The JSON structure expected in `keys.json` is:
   ```json
   {
     "users": {
       "username123": {
         "key": "RANDOMKEY",
         "expire": "2026-12-31"
       }
     }
   }
   ```

2. **Secure Fetching & Validation**:
   When a user visits `index.html`, the frontend performs a `fetch()` call to:
   `https://raw.githubusercontent.com/NotPepsiii/cmxa3/main/keys.json`
   
   To bypass caching and guarantee real-time access checks, the request includes `{ cache: "no-store" }` in its headers. This ensures that as soon as your Discord bot commits a key, the user can log in immediately.

3. **Validation Logic**:
   - **Step A**: Checks if the entered username exists under the `users` object.
   - **Step B**: Checks if the entered key matches the saved key value.
   - **Step C**: Parses the stored `expire` string as a date. If `Date.now() > expireDate.getTime()`, access is rejected with an expired error.

4. **Airtight Page Protection**:
   `main.html` includes `js/protect.js` at the absolute top of its `<head>`. Because this script runs synchronously before any content loads:
   - It intercepts loading immediately if the session is empty or expired.
   - It redirects invalid viewers instantly back to `index.html`.
   - It prevents any layout flicker or element exposure to malicious visitors.

---

## 🚀 Deployment Instructions for GitHub Pages

To deploy this key validation system onto your live GitHub Pages site:

1. **Upload the Files**:
   Upload the contents of `/standalone_auth_templates/` directly into your GitHub Pages branch root (e.g., `gh-pages` or the root of your `main` branch).

2. **Verification URL**:
   Ensure your raw github repository is public so that your raw database file `keys.json` is accessible via:
   `https://raw.githubusercontent.com/NotPepsiii/cmxa3/main/keys.json`

3. **Test with your Discord Bot**:
   - Run the `/key` command to generate a test user in your server (e.g., username `pepsi_tester`, key `PEPSI12345`, expiry `2027-01-01`).
   - Open your deployed PepFlick login page, enter the credentials, and unlock your protected dashboard workspace in real time!
