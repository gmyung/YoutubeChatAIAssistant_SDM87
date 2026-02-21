// Tool declarations for YouTube channel JSON analysis and image generation.
// Use exact names: generateImage, plot_metric_vs_time, play_video, compute_stats_json.

export const YOUTUBE_TOOL_DECLARATIONS = [
  {
    name: 'generateImage',
    description:
      'Generate an image from a text prompt and an optional anchor/reference image. Use when the user asks to create, generate, or draw an image. The user may attach an image for style or reference. Returns the generated image to display in chat (user can download and click to enlarge).',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: {
          type: 'STRING',
          description: 'Text description of the image to generate.',
        },
        useAnchorImage: {
          type: 'BOOLEAN',
          description: 'True if the user provided an anchor/reference image to guide style or content. The image is sent separately in the conversation.',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'plot_metric_vs_time',
    description:
      'Plot any numeric field (views, likes, comments, duration, etc.) vs time for the channel videos. Use when the user asks to plot, visualize, or see how a metric changes over time (e.g. "plot views over time", "graph likes by date"). Returns chart data for display; user can click to enlarge and download.',
    parameters: {
      type: 'OBJECT',
      properties: {
        metric_field: {
          type: 'STRING',
          description: 'Name of the numeric field to plot on the y-axis (e.g. view_count, like_count, comment_count, duration). Use the exact key as in the channel JSON.',
        },
        time_field: {
          type: 'STRING',
          description: 'Name of the date/time field for the x-axis (e.g. publishedAt, release_date). Optional; default is the first date-like field in the data.',
        },
      },
      required: ['metric_field'],
    },
  },
  {
    name: 'play_video',
    description:
      'Play or open a YouTube video from the loaded channel data. Use when the user asks to "play", "open", or "watch" a video. The user can specify which video by: title (e.g. "the asbestos video"), ordinal (e.g. "first video", "video 3"), or "most viewed". Returns a clickable card with title and thumbnail; clicking opens the video in a new tab.',
    parameters: {
      type: 'OBJECT',
      properties: {
        selection: {
          type: 'STRING',
          description: 'How to select the video: a partial title match (e.g. "asbestos"), an ordinal (e.g. "1" for first, "3" for third), or "most viewed" for the video with highest view count.',
        },
      },
      required: ['selection'],
    },
  },
  {
    name: 'compute_stats_json',
    description:
      'Compute mean, median, std, min, and max for any numeric field in the channel JSON (e.g. view_count, like_count, comment_count, duration). Use when the user asks for statistics, average, distribution, or summary of a numeric column.',
    parameters: {
      type: 'OBJECT',
      properties: {
        field: {
          type: 'STRING',
          description: 'Exact name of the numeric field in the channel JSON (e.g. view_count, like_count, comment_count, duration).',
        },
      },
      required: ['field'],
    },
  },
];

// Resolve numeric or date field name to actual key in first row
function resolveField(rows, name) {
  if (!rows?.length || !name) return name;
  const keys = Object.keys(rows[0]);
  if (keys.includes(name)) return name;
  const norm = (s) => s.toLowerCase().replace(/[\s_-]+/g, '');
  const target = norm(name);
  return keys.find((k) => norm(k) === target) || name;
}

const numericValues = (rows, col) =>
  rows.map((r) => parseFloat(r[col])).filter((v) => !isNaN(v));

// Parse ISO 8601 duration (e.g. PT54M46S, PT1H2M3S) to seconds
function parseDurationSeconds(str) {
  if (str == null || typeof str !== 'string') return NaN;
  const s = str.trim().toUpperCase();
  if (!s.startsWith('PT')) return NaN;
  let seconds = 0;
  const hours = s.match(/(\d+)H/);
  const mins = s.match(/(\d+)M/);
  const secs = s.match(/(\d+)S/);
  if (hours) seconds += parseInt(hours[1], 10) * 3600;
  if (mins) seconds += parseInt(mins[1], 10) * 60;
  if (secs) seconds += parseInt(secs[1], 10);
  return seconds;
}

function getNumericValuesForField(rows, col) {
  const raw = rows.map((r) => r[col]);
  const asNumbers = raw.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
  if (asNumbers.length > 0) return asNumbers;
  const asDuration = raw.map((v) => parseDurationSeconds(v)).filter((v) => !isNaN(v));
  return asDuration;
}

const median = (sorted) =>
  sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

const fmt = (n) => (typeof n === 'number' && !isNaN(n) ? +n.toFixed(4) : n);

/**
 * Execute a YouTube/JSON tool. For generateImage, call apiGenerateImage(prompt, anchorImageBase64)
 * and pass the result here as generateImageResult (object with imageBase64, mimeType).
 */
export function executeYouTubeTool(toolName, args, channelRows, generateImageResult = null) {
  const rows = Array.isArray(channelRows) ? channelRows : [];
  const headers = rows.length ? Object.keys(rows[0]) : [];

  switch (toolName) {
    case 'compute_stats_json': {
      const field = resolveField(rows, args.field);
      const vals = getNumericValuesForField(rows, field);
      if (!vals.length)
        return {
          error: `No numeric values for "${field}". Available: ${headers.join(', ')}. Use view_count, like_count, comment_count, or duration.`,
        };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sorted = [...vals].sort((a, b) => a - b);
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      return {
        field,
        mean: fmt(mean),
        median: fmt(median(sorted)),
        std: fmt(Math.sqrt(variance)),
        min: Math.min(...vals),
        max: Math.max(...vals),
        count: vals.length,
      };
    }

    case 'plot_metric_vs_time': {
      const metricField = resolveField(rows, args.metric_field);
      const timeField =
        args.time_field && resolveField(rows, args.time_field)
          ? resolveField(rows, args.time_field)
          : headers.find((h) => /date|time|published|release/i.test(h)) || headers[0];
      const vals = numericValues(rows, metricField);
      if (!vals.length)
        return {
          error: `No numeric values for "${metricField}". Available: ${headers.join(', ')}`,
        };
      const withTime = rows
        .map((r) => ({
          time: r[timeField] || '',
          value: parseFloat(r[metricField]),
        }))
        .filter((d) => d.time !== '' && !isNaN(d.value))
        .sort((a, b) => String(a.time).localeCompare(String(b.time)));
      if (!withTime.length)
        return { error: `No valid time values for field "${timeField}".` };
      return {
        _chartType: 'metric_vs_time',
        metricField,
        timeField,
        data: withTime.map((d) => ({ date: d.time, value: d.value })),
      };
    }

    case 'play_video': {
      const sel = (args.selection || '').toString().trim().toLowerCase();
      if (!rows.length) return { error: 'No channel data loaded.' };
      const urlKey = headers.find((h) => /url|link|video/i.test(h)) || 'video_url';
      const titleKey = headers.find((h) => /title/i.test(h)) || 'title';
      const thumbKey = headers.find((h) => /thumb/i.test(h)) || 'thumbnail';
      const viewKey = headers.find((h) => /view/i.test(h)) || 'view_count';

      let chosen = null;
      if (/most\s*viewed|highest\s*view|top\s*view/.test(sel)) {
        const withViews = rows
          .map((r) => ({ row: r, v: parseFloat(r[viewKey]) || 0 }))
          .filter((x) => !isNaN(x.v));
        withViews.sort((a, b) => b.v - a.v);
        chosen = withViews[0]?.row;
      } else if (/^\d+$/.test(sel)) {
        const idx = Math.max(0, parseInt(sel, 10) - 1);
        chosen = rows[idx] || null;
      } else {
        chosen = rows.find(
          (r) => String(r[titleKey] || '').toLowerCase().includes(sel)
        ) || null;
      }
      if (!chosen)
        return {
          error: `No video matched "${args.selection}". Try by title, ordinal (1, 2, ...), or "most viewed".`,
        };
      const vid = chosen[urlKey] || chosen.url || '';
      const videoId = chosen.video_id || (typeof vid === 'string' && vid.match(/(?:v=)([a-zA-Z0-9_-]+)/)?.[1]) || '';
      return {
        _chartType: 'play_video',
        video: {
          title: chosen[titleKey] || 'Video',
          thumbnail: chosen[thumbKey] || '',
          url: vid,
          video_id: videoId,
        },
      };
    }

    case 'generateImage':
      if (generateImageResult && generateImageResult.imageBase64) {
        return {
          _chartType: 'generated_image',
          imageBase64: generateImageResult.imageBase64,
          mimeType: generateImageResult.mimeType || 'image/png',
        };
      }
      return {
        error: generateImageResult?.error || 'Image generation failed. Please try again.',
      };

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
