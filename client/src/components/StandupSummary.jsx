import { useState } from 'react';
import { fetchStandup } from '../api';

export default function StandupSummary({ show, onClose }) {
  const [standup, setStandup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    const data = await fetchStandup();
    setStandup(data);
    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!standup) return;
    await navigator.clipboard.writeText(standup.generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!show) return null;

  return (
    <div className="standup-overlay" onClick={onClose}>
      <div className="standup-panel" onClick={(e) => e.stopPropagation()}>
        <div className="standup-header">
          <h2>Standup Summary</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!standup && !loading && (
          <div className="standup-generate">
            <p>Generate a formatted summary for your daily standup.</p>
            <button className="generate-btn" onClick={generate}>Generate Standup</button>
          </div>
        )}

        {loading && <p className="standup-loading">Generating...</p>}

        {standup && (
          <div className="standup-content">
            <pre className="standup-text">{standup.generatedText}</pre>
            <button className="copy-btn" onClick={copyToClipboard}>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
