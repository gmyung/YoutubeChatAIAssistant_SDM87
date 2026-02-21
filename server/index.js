require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const rawUri = process.env.REACT_APP_MONGODB_URI || process.env.MONGODB_URI || process.env.REACT_APP_MONGO_URI;
// Atlas often needs explicit authSource=admin for database users
const URI = rawUri && !rawUri.includes('authSource=')
  ? (rawUri.includes('?') ? rawUri.replace('?', '?authSource=admin&') : rawUri + '?authSource=admin')
  : rawUri;
const DB = 'chatapp';

let db;

async function connect() {
  try {
    const client = await MongoClient.connect(URI);
    db = client.db(DB);
    // Force one query so auth is verified at startup (not on first login)
    await db.collection('users').countDocuments();
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family:sans-serif;padding:2rem;background:#00356b;color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0">
        <div style="text-align:center">
          <h1>Chat API Server</h1>
          <p>Backend is running. Use the React app at <a href="http://localhost:3000" style="color:#ffd700">localhost:3000</a></p>
          <p><a href="/api/status" style="color:#ffd700">Check DB status</a></p>
        </div>
      </body>
    </html>
  `);
});

app.get('/api/status', async (req, res) => {
  try {
    const usersCount = await db.collection('users').countDocuments();
    const sessionsCount = await db.collection('sessions').countDocuments();
    res.json({ usersCount, sessionsCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Users ────────────────────────────────────────────────────────────────────

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });
    const name = String(username).trim().toLowerCase();
    const existing = await db.collection('users').findOne({ username: name });
    if (existing) return res.status(400).json({ error: 'Username already exists' });
    const hashed = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({
      username: name,
      password: hashed,
      email: email ? String(email).trim().toLowerCase() : null,
      firstName: firstName ? String(firstName).trim() : null,
      lastName: lastName ? String(lastName).trim() : null,
      createdAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  const name = username ? username.trim().toLowerCase() : '';
  console.log('[LOGIN] Request received for username:', name || '(empty)');
  try {
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });
    const user = await db.collection('users').findOne({ username: name });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid password' });
    res.json({
      ok: true,
      username: name,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
    });
  } catch (err) {
    console.error('[LOGIN] Error:', err.message);
    const msg =
      err.message && /bad auth|authentication failed/i.test(err.message)
        ? 'Database connection failed. Check REACT_APP_MONGODB_URI in .env (correct username/password?), then restart the server.'
        : err.message;
    res.status(500).json({ error: msg });
  }
});

// ── Sessions ─────────────────────────────────────────────────────────────────

app.get('/api/sessions', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });
    const sessions = await db
      .collection('sessions')
      .find({ username })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(
      sessions.map((s) => ({
        id: s._id.toString(),
        agent: s.agent || null,
        title: s.title || null,
        createdAt: s.createdAt,
        messageCount: (s.messages || []).length,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { username, agent } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    const { title } = req.body;
    const result = await db.collection('sessions').insertOne({
      username,
      agent: agent || null,
      title: title || null,
      createdAt: new Date().toISOString(),
      messages: [],
    });
    res.json({ id: result.insertedId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await db.collection('sessions').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/sessions/:id/title', async (req, res) => {
  try {
    const { title } = req.body;
    await db.collection('sessions').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { title } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Messages ─────────────────────────────────────────────────────────────────

app.post('/api/messages', async (req, res) => {
  try {
    const { session_id, role, content, imageData, charts, toolCalls } = req.body;
    if (!session_id || !role || content === undefined)
      return res.status(400).json({ error: 'session_id, role, content required' });
    const msg = {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...(imageData && {
        imageData: Array.isArray(imageData) ? imageData : [imageData],
      }),
      ...(charts?.length && { charts }),
      ...(toolCalls?.length && { toolCalls }),
    };
    await db.collection('sessions').updateOne(
      { _id: new ObjectId(session_id) },
      { $push: { messages: msg } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const doc = await db
      .collection('sessions')
      .findOne({ _id: new ObjectId(session_id) });
    const raw = doc?.messages || [];
    const msgs = raw.map((m, i) => {
      const arr = m.imageData
        ? Array.isArray(m.imageData)
          ? m.imageData
          : [m.imageData]
        : [];
      return {
        id: `${doc._id}-${i}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        images: arr.length
          ? arr.map((img) => ({ data: img.data, mimeType: img.mimeType }))
          : undefined,
        charts: m.charts?.length ? m.charts : undefined,
        toolCalls: m.toolCalls?.length ? m.toolCalls : undefined,
      };
    });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── YouTube channel data (metadata for channel videos) ───────────────────────
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.REACT_APP_YOUTUBE_API_KEY;

app.post('/api/youtube/channel', async (req, res) => {
  try {
    const { channelUrl, maxVideos = 10 } = req.body;
    const max = Math.min(Math.max(Number(maxVideos) || 10, 1), 100);
    if (!channelUrl || typeof channelUrl !== 'string') {
      return res.status(400).json({ error: 'channelUrl required' });
    }
    let handle = channelUrl.trim();
    const handleMatch = handle.match(/youtube\.com\/@([^/?]+)|youtube\.com\/channel\/([^/?]+)|^@?([^/?]+)$/i);
    const channelIdFromUrl = handleMatch?.[2]; // channel ID from /channel/XXX
    const handleName = handleMatch?.[1] || handleMatch?.[3] || handle.replace(/^@/, '');
    const base = 'https://www.googleapis.com/youtube/v3';
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({
        error: 'YouTube API key not set. Add YOUTUBE_API_KEY to .env',
        videos: [],
      });
    }
    let channelId = channelIdFromUrl;
    if (!channelId) {
      const chRes = await fetch(
        `${base}/channels?part=id,snippet,contentDetails&forHandle=${encodeURIComponent(handleName)}&key=${YOUTUBE_API_KEY}`
      );
      const chData = await chRes.json();
      if (chData.error) {
        return res.status(400).json({ error: chData.error.message || 'Channel not found', videos: [] });
      }
      channelId = chData.items?.[0]?.id;
      if (!channelId) {
        return res.status(404).json({ error: 'Channel not found', videos: [] });
      }
    }
    const plRes = await fetch(
      `${base}/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    const plData = await plRes.json();
    const uploadsId = plData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) {
      return res.status(400).json({ error: 'Uploads playlist not found', videos: [] });
    }
    const videoIds = [];
    let nextPageToken = '';
    do {
      const listUrl = `${base}/playlistItems?part=contentDetails,snippet&playlistId=${uploadsId}&maxResults=50&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const listRes = await fetch(listUrl);
      const listData = await listRes.json();
      const items = listData.items || [];
      for (const it of items) {
        if (it.contentDetails?.videoId) videoIds.push(it.contentDetails.videoId);
        if (videoIds.length >= max) break;
      }
      nextPageToken = listData.nextPageToken || '';
      if (videoIds.length >= max) break;
    } while (nextPageToken);
    const ids = videoIds.slice(0, max);
    if (ids.length === 0) {
      return res.json({ channelId, channelUrl, videos: [] });
    }
    const vRes = await fetch(
      `${base}/videos?part=snippet,contentDetails,statistics&id=${ids.join(',')}&key=${YOUTUBE_API_KEY}`
    );
    const vData = await vRes.json();
    const videos = (vData.items || []).map((v) => {
      const s = v.snippet || {};
      const stat = v.statistics || {};
      const dur = v.contentDetails?.duration || '';
      return {
        video_id: v.id,
        title: s.title || '',
        description: s.description || '',
        transcript: null,
        duration: dur,
        publishedAt: s.publishedAt || null,
        view_count: parseInt(stat.viewCount, 10) || 0,
        like_count: parseInt(stat.likeCount, 10) || 0,
        comment_count: parseInt(stat.commentCount, 10) || 0,
        video_url: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '',
      };
    });
    res.json({ channelId, channelUrl, videos });
  } catch (err) {
    console.error('[youtube/channel]', err);
    res.status(500).json({ error: err.message, videos: [] });
  }
});

// ── Image generation (for generateImage tool) ─────────────────────────────────
// Uses Gemini 3 Pro Image (Nano Banana Pro) via generateContent; supports text + optional anchor image.
// Fallback: Nano Banana (gemini-2.5-flash-image) if Pro is unavailable.
const IMAGE_MODEL_PRIMARY = 'gemini-3-pro-image-preview';   // Nano Banana Pro / Gemini 3 Pro Image
const IMAGE_MODEL_FALLBACK = 'gemini-2.5-flash-image';       // Nano Banana (faster)

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, imageBase64 } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt required' });
    }
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured', imageBase64: null });
    }

    const parts = [{ text: prompt.trim() }];
    if (imageBase64 && typeof imageBase64 === 'string') {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        responseMimeType: 'text/plain',
      },
    };

    let data;
    let response;
    let model = IMAGE_MODEL_PRIMARY;

    const doRequest = (modelId) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });
    };

    response = await doRequest(IMAGE_MODEL_PRIMARY);
    data = await response.json();

    if (!response.ok) {
      const tryFallback = response.status === 404 || (data?.error?.message && /not found|unavailable/i.test(data.error.message));
      if (tryFallback) {
        response = await doRequest(IMAGE_MODEL_FALLBACK);
        data = await response.json();
        model = IMAGE_MODEL_FALLBACK;
      }
    }

    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || response.statusText || 'Image generation API error';
      return res.status(response.status >= 400 ? response.status : 500).json({
        error: errMsg,
        imageBase64: null,
      });
    }

    const candidates = data.candidates || [];
    const content = candidates[0]?.content || {};
    const responseParts = content.parts || [];
    let imageBase64Out = null;
    let mimeType = 'image/png';

    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64Out = part.inlineData.data;
        mimeType = part.inlineData.mimeType || mimeType;
        break;
      }
    }

    if (!imageBase64Out) {
      console.error('[generate-image] No image in response. Model:', model, 'Keys:', Object.keys(data));
      return res.status(500).json({
        error: 'No image in response. Try again or check API key has access to image generation.',
        imageBase64: null,
      });
    }

    res.json({
      imageBase64: imageBase64Out,
      mimeType: mimeType.startsWith('image/') ? mimeType : 'image/png',
    });
  } catch (err) {
    console.error('[generate-image]', err);
    res.status(500).json({ error: err.message, imageBase64: null });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

connect()
  .then(() => {
    app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
