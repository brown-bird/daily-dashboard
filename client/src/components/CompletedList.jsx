import { useState, useRef, useEffect } from 'react';

export default function CompletedList({
  tasks,
  onUpdate,
  onDelete,
  squashMode,
  selectedForSquash,
  onToggleSquashMode,
  onToggleSquashSelection,
  onSquash
}) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showSquashEditor, setShowSquashEditor] = useState(false);
  const [squashText, setSquashText] = useState('');
  const squashInputRef = useRef(null);

  useEffect(() => {
    if (showSquashEditor && squashInputRef.current) {
      squashInputRef.current.focus();
    }
  }, [showSquashEditor]);

  if (tasks.length === 0) return null;

  const handleStartEdit = (task) => {
    if (squashMode) return;
    setEditingId(task.id);
    setEditText(task.text);
  };

  const handleSave = (id) => {
    if (editText.trim() && editText.trim() !== tasks.find(t => t.id === id)?.text) {
      onUpdate(id, { text: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') handleSave(id);
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  const handleStartSquash = () => {
    const selected = tasks.filter(t => selectedForSquash.has(t.id));
    setSquashText(selected.map(t => t.text).join('; '));
    setShowSquashEditor(true);
  };

  const handleConfirmSquash = () => {
    if (squashText.trim()) {
      onSquash(squashText.trim());
    }
    setShowSquashEditor(false);
    setSquashText('');
  };

  const handleCancelSquash = () => {
    setShowSquashEditor(false);
    setSquashText('');
  };

  const handleSquashKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirmSquash();
    if (e.key === 'Escape') handleCancelSquash();
  };

  return (
    <div className="completed-section">
      <div className="completed-header">
        <h2>Done today</h2>
        {tasks.length >= 2 && (
          <button
            className="squash-toggle-btn"
            onClick={onToggleSquashMode}
          >
            {squashMode ? 'Cancel' : 'Squash'}
          </button>
        )}
      </div>
      <div className="completed-list">
        {tasks.map(task => {
          const time = task.completed
            ? new Date(task.completed).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : '';
          const isSelected = selectedForSquash.has(task.id);
          return (
            <div
              key={task.id}
              className={`completed-item${squashMode && isSelected ? ' selected' : ''}`}
            >
              {squashMode && (
                <input
                  type="checkbox"
                  className="squash-checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSquashSelection(task.id)}
                />
              )}
              <span className="completed-check">☑</span>
              {editingId === task.id ? (
                <input
                  className="edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => handleSave(task.id)}
                  onKeyDown={(e) => handleKeyDown(e, task.id)}
                  autoFocus
                />
              ) : (
                <span
                  className="completed-text"
                  onClick={() => squashMode ? onToggleSquashSelection(task.id) : handleStartEdit(task)}
                >
                  {task.text}
                  {task.type === 'unplanned' && <span className="unplanned-badge"> ⚡</span>}
                </span>
              )}
              <span className="completed-time">{time}</span>
              {!squashMode && (
                <button
                  className="delete-btn"
                  onClick={() => onDelete(task.id)}
                  title="Delete completed task"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {squashMode && !showSquashEditor && (
        <div className="squash-bar">
          <span>{selectedForSquash.size} selected</span>
          <button
            className="squash-action-btn"
            disabled={selectedForSquash.size < 2}
            onClick={handleStartSquash}
          >
            Squash
          </button>
        </div>
      )}

      {showSquashEditor && (
        <div className="squash-editor">
          <label>Squash summary:</label>
          <input
            ref={squashInputRef}
            className="squash-input"
            value={squashText}
            onChange={(e) => setSquashText(e.target.value)}
            onKeyDown={handleSquashKeyDown}
            placeholder="Enter combined task summary..."
          />
          <div className="squash-editor-actions">
            <button className="squash-confirm-btn" onClick={handleConfirmSquash}>Confirm</button>
            <button className="squash-cancel-btn" onClick={handleCancelSquash}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
