import { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import YouTubeDownload from './components/YouTubeDownload';
import './App.css';

const TAB_CHAT = 'chat';
const TAB_YOUTUBE = 'youtube';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('chatapp_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [tab, setTab] = useState(TAB_CHAT);

  const handleLogin = (userObj) => {
    const u = {
      username: userObj.username,
      firstName: userObj.firstName || '',
      lastName: userObj.lastName || '',
    };
    localStorage.setItem('chatapp_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatapp_user');
    setUser(null);
  };

  if (user) {
    return (
      <div className="app-with-tabs">
        <div className="app-tabs">
          <button
            type="button"
            className={tab === TAB_CHAT ? 'app-tab active' : 'app-tab'}
            onClick={() => setTab(TAB_CHAT)}
          >
            Chat
          </button>
          <button
            type="button"
            className={tab === TAB_YOUTUBE ? 'app-tab active' : 'app-tab'}
            onClick={() => setTab(TAB_YOUTUBE)}
          >
            YouTube Channel Download
          </button>
        </div>
        {tab === TAB_CHAT && <Chat user={user} onLogout={handleLogout} />}
        {tab === TAB_YOUTUBE && <YouTubeDownload user={user} onLogout={handleLogout} />}
      </div>
    );
  }
  return <Auth onLogin={handleLogin} />;
}

export default App;
