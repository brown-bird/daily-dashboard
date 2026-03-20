import { useState } from 'react';

export default function AddTask({ onAdd }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('planned');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), type);
    setText('');
    setType('planned');
  };

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a task..."
        autoFocus
      />
      <button
        type="button"
        className={`type-toggle ${type === 'unplanned' ? 'unplanned' : ''}`}
        onClick={() => setType(type === 'planned' ? 'unplanned' : 'planned')}
        title={type === 'planned' ? 'Planned task' : 'Unplanned task'}
      >
        {type === 'planned' ? 'Planned' : '\u26a1 Unplanned'}
      </button>
      <button type="submit" className="add-btn">Add</button>
    </form>
  );
}
