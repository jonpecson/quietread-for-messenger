import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { MESSAGE_TYPES } from '../shared/constants';
import { VERSION } from '../shared/version';
import type { QuietReadSettings } from '../shared/types';

function Options() {
  const [settings, setSettings] = useState<QuietReadSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response) => {
      if (response?.settings) setSettings(response.settings);
    });
  }, []);

  const toggleProtection = () => {
    if (!settings) return;
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.TOGGLE_PROTECTION, enabled: !settings.protectionEnabled },
      (response) => {
        if (response?.settings) {
          setSettings(response.settings);
          flashSaved();
        }
      }
    );
  };

  const toggleDebug = () => {
    if (!settings) return;
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.TOGGLE_DEBUG, enabled: !settings.debugEnabled },
      (response) => {
        if (response?.settings) {
          setSettings(response.settings);
          flashSaved();
        }
      }
    );
  };

  const resetAll = () => {
    chrome.storage.local.clear(() => {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response) => {
        if (response?.settings) {
          setSettings(response.settings);
          flashSaved();
        }
      });
    });
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!settings) {
    return <div className="options"><p>Loading...</p></div>;
  }

  return (
    <div className="options">
      {saved && <div className="saved-toast">Settings saved</div>}

      <h1>QuietRead for Messenger</h1>
      <p className="subtitle">Privacy-first Messenger Web read-receipt protection</p>

      <div className="card">
        <h2>Settings</h2>
        <div className="setting-row">
          <div>
            <div className="setting-label">Protection enabled</div>
            <div className="setting-desc">Block candidate read-receipt network requests</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.protectionEnabled} onChange={toggleProtection} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-label">Debug instrumentation</div>
            <div className="setting-desc">Observe and log candidate network requests (dev mode)</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.debugEnabled} onChange={toggleDebug} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Data</h2>
        <div className="setting-row">
          <div>
            <div className="setting-label">Reset all settings</div>
            <div className="setting-desc">Restore defaults and clear debug logs</div>
          </div>
          <button className="btn btn-danger" onClick={resetAll}>Reset</button>
        </div>
      </div>

      <div className="disclaimer">
        <strong>Safety disclaimer:</strong> QuietRead offers best-effort protection against
        Messenger read-receipt signals. Facebook may change its internal APIs at any time,
        which could reduce or eliminate protection effectiveness. This extension does not
        guarantee invisibility.
        <br /><br />
        If you are in a situation involving credible threats, please preserve evidence and seek
        appropriate help from trusted contacts, platform reporting tools, or authorities where
        safe and relevant.
      </div>

      <p className="version">
        v{VERSION} &middot;{' '}
        <a href="https://github.com/" target="_blank" rel="noopener">
          GitHub
        </a>
      </p>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Options />);
}
