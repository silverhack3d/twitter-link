# Twitter Profile Updater

This project is a Next.js SSR (Server Side Rendering) app that lets you update your Twitter profile using OAuth 1.0A

---

## 🚀 Deploying to Vercel

### 1. **Clone the Repository**

```bash
git clone https://github.com/silverhack3d/twitter-link.git
cd twitter-profile
```

---

### 2. **Create a PostgreSQL Database**

- You can use [Neon](https://neon.tech/), [Supabase](https://supabase.com/), [Railway](https://railway.app/), or any PostgreSQL provider.
- **Tip:** Vercel allows you to integrate Neon directly from the Vercel dashboard. This will automatically create a database and add the required environment variables to your project.
    - In your Vercel project, go to the **Integrations** tab, search for **Neon**, and follow the prompts to connect.
- If you use another provider, copy your database connection string (e.g., `postgres://user:password@host:port/dbname`).

---

### 3. **Create a Twitter App**

- Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/projects-and-apps).
- Create a new app and generate **OAuth 1.0A** credentials.
- Set the callback URL to:
  ```
  https://<your-vercel-domain>/api/auth/callback
  ```
- Note your **API Key** and **API Secret Key**.

---

### 4. **Configure Environment Variables**

In Vercel, go to your project settings → **Environment Variables** and add:

| Name                      | Value (example)                        |
|---------------------------|----------------------------------------|
| `DATABASE_URL`            | `postgres://user:pass@host:port/db`    |
| `TWITTER_CLIENT_ID`       | Your Twitter API Key                   |
| `TWITTER_CLIENT_SECRET`   | Your Twitter API Secret                |
| `TWITTER_API_CREDENTIALS` | Stringified JSON of `{clientId, clientSecret}` |

Stringified JSON looks like this: `'[{"clientId":"","clientSecret":""}]'`

---

### 5. **Customize Profile Settings**

Edit `src/profile.json` to set your name, description, and other profile options.

#### Example `src/profile.json` and Options

```json
{
  "name": "Custom Name",                // Display name
  "url": "https://twitter.com/YourProfile",
  "description": "Custom description",
  "location": "Custom Location",
  "tweets": [                           // List of tweets to post (chosen randomly)
    {
      "text": "My awesome tweet text #{count}", // Text, {count} is replaced
      "image": "image_{count}.png"           // Optional image path, must be in `public` folder
    }
  ],
  "retweetIds": ["1234567890123456789"],  // List of Tweet IDs to retweet (as string)
  "useRandomDescriptions": false,       // If true, picks a random description from 'descriptions'
  "descriptions": [                     // List of possible descriptions (used if above is true)
    "Custom description 1",
    "Custom description 2",
    "Custom description 3"
  ],
  "includePaddedCountInName": true      // If true, adds a count to the name
}
```

**Options:**

- `name`: String. Your Twitter display name.
- `url`: String. Your profile or website URL.
- `description`: String. Main profile description.
- `location`: String. Location field.
- `tweets`: Array of objects. Each object has `text` (string) and optional `image` (string) (must be in `public` folder). The app will rotate through these tweets. Use `{count}` as a placeholder for the count.
- `retweetIds`: Array of strings. Tweet IDs (as strings) that the app should attempt to retweet
- `useRandomDescriptions`: Boolean. If true, randomly selects a description from `descriptions` array.
- `descriptions`: Array of strings. Possible descriptions to use if `useRandomDescriptions` is true.
- `includePaddedCountInName`: Boolean. If true, appends a padded count to your display name.

---

### 6. **Upload to a Private GitHub Repository**

1. Go to [GitHub.com](https://github.com/) and sign in.
2. Click the **+** icon in the top right and select **New repository**.
3. Enter a repository name (e.g., `twitter-link`), set the repository to **Private**, and click **Create repository**.
4. On the new repository page, click **Add file** > **Upload files**.
5. Drag and drop all the files and folders from your local `twitter-link` project folder into the upload area, or click **choose your files** to select them.
6. Scroll down, add a commit message (e.g., "Initial commit"), and click **Commit changes**.
7. Your code is now uploaded to your private GitHub repository and ready to be imported to Vercel.

---

### 7. **Deploy to Vercel**

If you haven't already, import your repo to [Vercel](https://vercel.com/import/git).

---

### 8. **Add Avatar & Banner**

- Create `public` directory in the root directory, where all files like `package.json` etc. are.
- Place `avatar.png` and `banner.png` in the public directory.
- These will be uploaded to Twitter profile if present.

---

## ⚠️ Notes

- Make sure your Vercel project is set to use Node.js 18+ (default is fine).
- All secrets must be set in Vercel's environment variables for production.
- Posting tweets/retweeting counts towards 500 writes per month limit.