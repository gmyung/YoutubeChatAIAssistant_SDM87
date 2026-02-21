import { useState } from 'react';
import { downloadChannelData } from '../services/mongoApi';
import './YouTubeDownload.css';

export default function YouTubeDownload({ user, onLogout }) {
  const [channelUrl, setChannelUrl] = useState('https://www.youtube.com/@veritasium');
  const [maxVideos, setMaxVideos] = useState(10);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 300);
    try {
      const data = await downloadChannelData(channelUrl, maxVideos);
      clearInterval(interval);
      setProgress(100);
      setResult(data);
    } catch (err) {
      clearInterval(interval);
      setProgress(0);
      try {
        const j = JSON.parse(err.message);
        setError(j.error || err.message);
      } catch {
        setError(err.message || 'Download failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!result?.videos) return;
    const blob = new Blob([JSON.stringify(result.videos, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channel_${maxVideos}_videos.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="youtube-download-layout">
      <aside className="youtube-download-sidebar">
        <h1 className="youtube-download-title">YouTube Channel Download</h1>
        <p className="youtube-download-desc">
          Enter a channel URL and download video metadata (title, description, duration, views, likes, comments, URL).
        </p>
        <div className="youtube-download-form">
          <label>
            Channel URL
            <input
              type="url"
              placeholder="https://www.youtube.com/@channelname"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              disabled={loading}
            />
          </label>
          <label>
            Max videos (1–100)
            <input
              type="number"
              min={1}
              max={100}
              value={maxVideos}
              onChange={(e) => setMaxVideos(Number(e.target.value) || 10)}
              disabled={loading}
            />
          </label>
          <button
            type="button"
            className="youtube-download-btn"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? 'Downloading…' : 'Download Channel Data'}
          </button>
        </div>
        {loading && (
          <div className="youtube-download-progress-wrap">
            <div
              className="youtube-download-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {error && <p className="youtube-download-error">{error}</p>}
        <div className="youtube-download-footer">
          <span className="youtube-download-username">{user?.username}</span>
          <button type="button" onClick={onLogout} className="youtube-download-logout">
            Log out
          </button>
        </div>
      </aside>
      <main className="youtube-download-main">
        {result?.videos?.length > 0 ? (
          <>
            <div className="youtube-download-result-header">
              <h2>Downloaded {result.videos.length} video(s)</h2>
              <button type="button" onClick={handleDownloadJson} className="youtube-download-json-btn">
                Download JSON file
              </button>
            </div>
            <pre className="youtube-download-json-preview">
              {JSON.stringify(result.videos.slice(0, 2), null, 2)}
              {result.videos.length > 2 ? '\n  ...' : ''}
            </pre>
          </>
        ) : result && !result.videos?.length ? (
          <p className="youtube-download-no-videos">No videos returned. Check the channel URL and API key.</p>
        ) : (
          <p className="youtube-download-placeholder">
            Use the form to download channel data. You can then drag the JSON file into the Chat tab to analyze it.
          </p>
        )}
      </main>
    </div>
  );
}
