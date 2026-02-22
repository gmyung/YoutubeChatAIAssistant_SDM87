# YouTube Chat AI Assistant (YoutubeChatAIAssistant_SDM87)

A React chatbot that acts as a **YouTube analyze assistant**: users can download YouTube channel video metadata, drag JSON into the chat, and use AI-powered tools to plot metrics, play videos in-chat, compute statistics, and generate images. Built with Gemini, MongoDB, and a YouTube Data API integration.

Run `npm install` and `npm start` from this directory.

---

## Implemented Features (Task Summary)

### Chat personalization
- **First Name and Last Name** were added to the Create Account form.
- Both are saved in the database (MongoDB `users` collection: `firstName`, `lastName`).
- After login, first and last name are put in the **chat context** so the AI knows who it is talking to.
- The **system prompt** (`public/prompt_chat.txt`) was changed so the AI **addresses the user by name in the first message**.

### YouTube Channel Data Download tab
- After logging in, a tab **"YouTube Channel Download"** is available next to Chat.
- Users can enter a **YouTube channel URL** (e.g. `https://www.youtube.com/@veritasium`).
- **Max videos** input (default 10, max 100) and a **Download Channel Data** button.
- On click, the app downloads metadata for the channel videos: **title, description, transcript (if available), duration, release date, view count, like count, comment count, video URL**.
- Data is returned as JSON and can be **downloaded** by the user; a **progress bar** is shown while downloading.
- Sample data for 10 videos from `https://www.youtube.com/@veritasium` is saved in **`public/`** (e.g. `veritasium_channel_10.json`, `channel_10_videos.json`) so the flow works without an API key.

### JSON chat input
- Users can **drag a JSON file** (channel data) into the chat to load it into the **conversation context**.
- The data is kept **locally** in the session so tools and code can use it later.
- The **system prompt** was updated so the AI knows how to deal with JSON files and when to use the YouTube tools.

### Required tool names (exact)

All four chat tools use these **exact names** and are described in **`public/prompt_chat.txt`**:

| Tool name | Purpose |
|-----------|--------|
| **generateImage** | Image generation from a text prompt and an optional anchor image. |
| **plot_metric_vs_time** | Plot any numeric field (views, likes, comments, etc.) vs time for channel videos. |
| **play_video** | Play a video from channel data (title + thumbnail; video can open in a new tab or play embedded in chat). |
| **compute_stats_json** | Mean, median, std, min, max for any numeric field in the channel JSON. |

---

## Task Instructions (Reference)

### Chat Tool: generateImage
- Lets the user **generate an image** in the chat from a **text prompt** and an **anchor image** (dragged in).
- The image is **displayed in the chat**.
- User can **download** the image and **click to enlarge** it.
- Described in **`prompt_chat.txt`**.

### Chat Tool: plot_metric_vs_time
- Lets the user **plot any numeric field** (views, likes, comments, etc.) **vs time** for the channel videos via chat.
- The plot is a **React component** displayed in the chat.
- **Click to enlarge**; download button was optional (implemented as enlarge only per later preference).
- Described in **`prompt_chat.txt`**.

### Chat Tool: play_video
- When the user asks to **"play" or "open"** a video from the loaded channel data, the app shows a **clickable card** with **video title and thumbnail**.
- Video can **open in a new tab** on YouTube or **play embedded** in the chat (iframe).
- User can specify the video by **title** (e.g. "play the asbestos video"), **ordinal** (e.g. "play the first video"), or **"most viewed"**.
- Described in **`prompt_chat.txt`**.

### Chat Tool: compute_stats_json
- Computes **mean, median, std, min, max** for any numeric field in the channel JSON (e.g. `view_count`, `like_count`, `comment_count`, `duration`).
- Used when the user asks for **statistics, average, or distribution** of a numeric column.
- Described in **`prompt_chat.txt`**.

### Prompt engineering
- The system prompt in **`prompt_chat.txt`** was updated so the AI is a **YouTube analyze assistant**.
- It explains that the AI **receives JSON files** of YouTube channel data.
- It explains that the AI has **access to tools** to analyze the data and generate content (including the four tools above).

---

## MongoDB Troubleshooting

### "bad auth : authentication failed"
- This message comes from **MongoDB Atlas**, not from your app login (e.g. username "GM21").
- It means the **connection string** in `.env` (e.g. `REACT_APP_MONGODB_URI`) has the wrong **database user** or **password** for Atlas.

**What to do:**
1. In **MongoDB Atlas** → **Database Access** → open your database user (e.g. `chatadmin2`).
2. Ensure the **password** matches exactly what you have in `.env` (no extra spaces; if you changed it in Atlas, update `.env` and restart the server).
3. Add **`?authSource=admin`** to the end of your connection string in `.env`:
   ```env
   REACT_APP_MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?authSource=admin
   ```
4. **Restart the server** after any `.env` change (env is read only at startup).
5. If the password has special characters (`@`, `#`, `:`, `/`, `%`), **URL-encode** them in the URI (e.g. `@` → `%40`).

### "Invalid scheme, expected connection string to start with mongodb:// or mongodb+srv://"
- The value of `REACT_APP_MONGODB_URI` in `.env` is wrong or mangled (e.g. leftover placeholder text).
- Fix: set it to **only** the connection string, for example:
  ```env
  REACT_APP_MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?authSource=admin
  ```

### Login still shows "bad auth" after fixing `.env`
- Often an **old server process** is still running on port 3001 with the old env.
- **Stop all** `npm start` / Node processes, then:
  ```bash
  lsof -ti :3001 | xargs kill -9
  ```
  Then start the app again with `npm start` from this directory.

### Confirm MongoDB user and auth database
- In Atlas → **Database Access** → your user → check **Authentication Database**.
- It should be **"Atlas admin"** (the `admin` database). If it's something else, either change it to Atlas admin or set `authSource` in the URI to that database.

---

## Running the App

From this directory:

```bash
npm install
npm start
```

- **Frontend:** http://localhost:3000  
- **Backend:** http://localhost:3001  

Create a `.env` file in this directory with at least:
- `REACT_APP_GEMINI_API_KEY` – from [Google AI Studio](https://aistudio.google.com/apikey)
- `REACT_APP_MONGODB_URI` – MongoDB Atlas connection string (with `?authSource=admin` if needed)
- `YOUTUBE_API_KEY` – (optional) for the YouTube Channel Download tab; from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### Option 2: Separate terminals (for development)

**Terminal 1 — Backend:**
```bash
npm run server
```

**Terminal 2 — Frontend:**
```bash
npm run client
```

### Verify Backend

- http://localhost:3001 – Server status page  
- http://localhost:3001/api/status – JSON with `usersCount` and `sessionsCount`

---

## API Keys & Environment Variables

| Variable | Required | Where used | Description |
|----------|----------|------------|-------------|
| `REACT_APP_GEMINI_API_KEY` | Yes | Frontend (baked in at build) | Google Gemini API key. Get one at [Google AI Studio](https://aistudio.google.com/apikey). |
| `REACT_APP_MONGODB_URI` | Yes | Backend | MongoDB Atlas connection string. Use `?authSource=admin` if needed. |
| `REACT_APP_API_URL` | Production only | Frontend | Full URL of the backend, e.g. `https://your-backend.onrender.com`. Leave blank for local dev. |
| `YOUTUBE_API_KEY` | For YouTube tab | Backend | YouTube Data API v3 key. [Google Cloud Console](https://console.cloud.google.com/apis/credentials). |

The backend also accepts `MONGODB_URI` or `REACT_APP_MONGO_URI` as the MongoDB connection string.

---

## Deploying to Render

The repo includes a `render.yaml` Blueprint that configures both the backend (Web Service) and frontend (Static Site) in one file.

### Step-by-step

**1. Deploy the backend first**

Go to [render.com](https://render.com) → New → **Web Service** → connect your GitHub repo.

| Setting | Value |
|---------|-------|
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `node server/index.js` |

Add this environment variable in the Render dashboard:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |

Once deployed, copy the backend URL (e.g. `https://chatapp-backend.onrender.com`).

**2. Deploy the frontend**

New → **Static Site** → same repo.

| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build` |
| Publish Directory | `build` |

Add these environment variables:

| Variable | Value |
|----------|-------|
| `REACT_APP_GEMINI_API_KEY` | Your Gemini API key |
| `REACT_APP_API_URL` | Backend URL from step 1 |

> **Important:** `REACT_APP_*` variables are baked into the bundle at build time. If you change them, trigger a new deploy of the static site.

**Or use the Blueprint** – New → **Blueprint** → connect your repo. You'll be prompted for `MONGODB_URI`, `REACT_APP_GEMINI_API_KEY`, `REACT_APP_API_URL` after creation. You may need to set `REACT_APP_API_URL` and re-deploy the static site after the first run.

### Free tier cold starts

Render's free plan spins down after 15 minutes of inactivity. First request after sleep can take ~30 seconds.

---

## Dependencies

All packages are installed via `npm install`. Key dependencies:

### Frontend

| Package | Purpose |
|---------|---------|
| `react`, `react-dom` | UI framework |
| `react-scripts` | Create React App build tooling |
| `@google/generative-ai` | Gemini API client (chat, function calling, search grounding) |
| `react-markdown` | Render markdown in AI responses |
| `remark-gfm` | GitHub-flavored markdown |
| `recharts` | Charts (e.g. metric vs time) |

### Backend

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and REST API |
| `mongodb` | MongoDB driver for Node.js |
| `bcryptjs` | Password hashing |
| `cors` | Cross-origin request headers |
| `dotenv` | Load `.env` variables |

### Dev / Tooling

| Package | Purpose |
|---------|---------|
| `concurrently` | Run frontend and backend with a single `npm start` |

---

## Chat System Prompt

The AI's system instructions are loaded from **`public/prompt_chat.txt`**. Edit this file to change the assistant's behavior. Changes take effect on the next message; no rebuild needed.
