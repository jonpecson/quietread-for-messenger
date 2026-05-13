import { createRoot } from 'react-dom/client';
import { useState, useEffect, useCallback } from 'react';
import { MESSAGE_TYPES } from '../shared/constants';
import { VERSION } from '../shared/version';
import type { QuietReadSettings, RuleStatus, DiagnosticsData } from '../shared/types';

function Popup() {
  const [settings, setSettings] = useState<QuietReadSettings | null>(null);
  const [ruleStatus, setRuleStatus] = useState<RuleStatus | null>(null);
  const [siteDetected, setSiteDetected] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);

  const refresh = useCallback(() => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_STATUS }, (response) => {
      if (response?.settings) setSettings(response.settings);
      if (response?.ruleStatus) setRuleStatus(response.ruleStatus);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? '';
      setSiteDetected(
        url.includes('messenger.com') || url.includes('facebook.com/messages')
      );
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (settings?.debugEnabled) {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_DIAGNOSTICS }, (response) => {
        if (response) setDiagnostics(response as DiagnosticsData);
      });
    }
  }, [settings?.debugEnabled]);

  const toggleProtection = () => {
    if (!settings) return;
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.TOGGLE_PROTECTION, enabled: !settings.protectionEnabled },
      (response) => {
        if (response?.settings) setSettings(response.settings);
        if (response?.ruleStatus) setRuleStatus(response.ruleStatus);
      }
    );
  };

  const toggleDebug = () => {
    if (!settings) return;
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.TOGGLE_DEBUG, enabled: !settings.debugEnabled },
      (response) => {
        if (response?.settings) setSettings(response.settings);
      }
    );
  };

  const openMessenger = () => {
    chrome.tabs.create({ url: 'https://www.messenger.com/' });
  };

  const reloadPage = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
    });
  };

  if (!settings) {
    return <div className="popup"><p>Loading...</p></div>;
  }

  return (
    <div className="popup">
      <div className="header">
        <h1>QuietRead</h1>
      </div>
      <p className="tagline">Read with breathing room.</p>

      <div className="status-card">
        <div className="status-row">
          <span className="status-label">Protection</span>
          <span className={`status-badge ${settings.protectionEnabled ? 'badge-on' : 'badge-off'}`}>
            {settings.protectionEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Site</span>
          <span className={`status-badge ${siteDetected ? 'badge-detected' : 'badge-inactive'}`}>
            {siteDetected ? 'Messenger detected' : 'Open Messenger to activate'}
          </span>
        </div>
        {ruleStatus && (
          <div className="status-row">
            <span className="status-label">Network rules</span>
            <span className={`status-badge ${ruleStatus.enabled ? 'badge-on' : 'badge-inactive'}`}>
              {ruleStatus.enabled ? `${ruleStatus.ruleCount} active` : 'Inactive'}
            </span>
          </div>
        )}
      </div>

      <div className="toggle-section">
        <div className="toggle-row">
          <span className="toggle-label">Protection enabled</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.protectionEnabled} onChange={toggleProtection} />
            <span className="toggle-slider" />
          </label>
        </div>
        <div className="toggle-row">
          <span className="toggle-label">Debug diagnostics</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.debugEnabled} onChange={toggleDebug} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="actions">
        <button className="btn" onClick={openMessenger}>Open Messenger</button>
        <button className="btn" onClick={reloadPage}>Reload Page</button>
      </div>

      {settings.debugEnabled && diagnostics && (
        <div className="diagnostics">
          <h3>Diagnostics</h3>
          <div className="diag-row">Rules active: {diagnostics.ruleStatus.ruleCount}</div>
          <div className="diag-row">Observed requests: {diagnostics.observedRequests}</div>
          {diagnostics.recentEntries.map((e) => (
            <div className="diag-row" key={e.id}>
              [{new Date(e.timestamp).toLocaleTimeString()}] {e.method} {e.url.slice(0, 60)}
              {e.note && ` - ${e.note}`}
            </div>
          ))}
        </div>
      )}

      <p className="disclaimer">
        Best-effort protection. Messenger may change how read receipts work at any time.
        v{VERSION}
      </p>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<Popup />);
}
