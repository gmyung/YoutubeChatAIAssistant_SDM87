# Requirements Verification Checklist

Verified against the functional requirements (Chat Tools + Prompt engineering).

---

## 4. Chat Tool: `generateImage` ✅

| Requirement | Status | Location |
|-------------|--------|----------|
| Create image in chat from **text prompt** | ✅ | Server calls Imagen API with prompt; Chat sends prompt to backend |
| **Anchor image** (user can drag in) | ✅ | Chat accepts image attachments; first image passed as `imageBase64` to `/api/generate-image` |
| **Display** generated image in chat | ✅ | `GeneratedImageBlock` in Chat.js renders `chart._chartType === 'generated_image'` |
| **Download** the image | ✅ | `<a href={src} download="generated-image.png">` in GeneratedImageBlock |
| **Click to enlarge** | ✅ | `enlarged` state + overlay with full-size image, click outside to close |
| Described in `prompt_chat.txt` | ✅ | Lines 39–40: purpose, input (prompt + optional anchor), display/download/enlarge |

---

## 5. Chat Tool: `plot_metric_vs_time` ✅

| Requirement | Status | Location |
|-------------|--------|----------|
| Plot **numeric field vs time** (views, likes, comments, etc.) | ✅ | `youtubeTools.js`: `plot_metric_vs_time` uses `metric_field` and `time_field` |
| Plot shown as **React component** in chat | ✅ | `MetricVsTimeChart` (Recharts LineChart) rendered in Chat.js when `_chartType === 'metric_vs_time'` |
| **Click to enlarge** | ✅ | `MetricVsTimeChart.js`: chart area clickable, opens modal overlay |
| **Download** in enlarged view | ✅ | Modal footer has "Download" button (exports chart as SVG) |
| Described in `prompt_chat.txt` | ✅ | Lines 41–42: purpose, parameters, display/enlarge/download |

---

## 6. Chat Tool: `play_video` ✅

| Requirement | Status | Location |
|-------------|--------|----------|
| Trigger: user asks to **"play" or "open"** a video from channel data | ✅ | Tool description in prompt + `youtubeTools.js` `play_video` |
| **Clickable card** with **title + thumbnail** | ✅ | Chat.js: `.play-video-card` with `chart.video.thumbnail` and `chart.video.title` |
| **Click opens video in new tab** | ✅ | `<a href={chart.video.url} target="_blank" rel="noreferrer">` |
| Specify by **title** (e.g. "play the asbestos video") | ✅ | `youtubeTools.js`: `rows.find(r => title.includes(sel))` |
| Specify by **ordinal** (e.g. "first video", "video 3") | ✅ | `youtubeTools.js`: `^\d+$` → `rows[idx]` |
| Specify by **"most viewed"** | ✅ | `youtubeTools.js`: sort by `viewKey`, take first |
| Described in `prompt_chat.txt` | ✅ | Lines 43–44: purpose, triggers, selection options, card behavior |

---

## 7. Chat Tool: `compute_stats_json` ✅

| Requirement | Status | Location |
|-------------|--------|----------|
| Compute **mean, median, std, min, max** | ✅ | `youtubeTools.js`: `compute_stats_json` returns all five |
| For any **numeric field** in channel JSON | ✅ | Parameters: `field` (e.g. view_count, like_count, comment_count, duration) |
| Trigger: user asks for **statistics, average, distribution** | ✅ | prompt_chat.txt line 45 + tool description |
| Described in `prompt_chat.txt` | ✅ | Lines 45–46 |

---

## 8. Prompt engineering ✅

| Requirement | Status | Location |
|-------------|--------|----------|
| System prompt updated in **`prompt_chat.txt`** | ✅ | Full file |
| AI is a **"YouTube analyze assistant"** | ✅ | Line 17: "Third, you are a YouTube analyze assistant." |
| Explain that AI **receives JSON files** of YouTube channel data | ✅ | Line 17: "Users may drag in a JSON file containing YouTube channel data..." |
| Explain **tools** to **analyze data and generate content** | ✅ | Line 17: "You have access to tools to analyze this data and generate content." |
| Tool names and behavior described | ✅ | Lines 33–46: YOUTUBE CHANNEL JSON AND TOOLS with generateImage, plot_metric_vs_time, play_video, compute_stats_json |

---

## Summary

All listed requirements are implemented and match the spec. The app:

- Uses the four tools with the **exact names** required.
- Implements **generateImage** (text prompt + optional anchor image, display, download, enlarge) and calls the Imagen API.
- Implements **plot_metric_vs_time** (React line chart, click to enlarge, download).
- Implements **play_video** (clickable title+thumbnail card, new tab; selection by title, ordinal, or "most viewed").
- Implements **compute_stats_json** (mean, median, std, min, max for any numeric field).
- Keeps **prompt_chat.txt** updated with YouTube assistant role, JSON data explanation, and tool descriptions.
