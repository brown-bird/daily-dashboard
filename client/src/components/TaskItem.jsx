import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TaskItem({ task, section, onStart, onUnstart, onComplete, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== task.text) {
      onUpdate(task.id, { text: editText.trim() });
    } else {
      setEditText(task.text);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditText(task.text);
      setEditing(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="task-item">
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      {editing ? (
        <input
          className="edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span className="task-text" onClick={() => setEditing(true)}>
          {task.text}
          {task.type === 'unplanned' && <span className="unplanned-badge"> ⚡</span>}
        </span>
      )}
      <div className="task-actions">
        {section === 'todo' && (
          <>
            <button className="action-btn start-btn" onClick={() => onStart(task.id)} title="Start working">Start</button>
            <button className="action-btn done-btn" onClick={() => onComplete(task.id)} title="Mark complete">Complete</button>
          </>
        )}
        {section === 'in-progress' && (
          <>
            <button className="action-btn back-btn" onClick={() => onUnstart(task.id)} title="Move back to todo">Todo</button>
            <button className="action-btn done-btn" onClick={() => onComplete(task.id)} title="Mark complete">Done</button>
          </>
        )}
        <button
          className="delete-btn"
          onClick={() => onDelete(task.id)}
          title="Delete task"
        >
          ×
        </button>
      </div>
    </div>
  );
}
