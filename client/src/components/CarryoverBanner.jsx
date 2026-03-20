export default function CarryoverBanner({ tasks, onAccept, onDrop }) {
  if (tasks.length === 0) return null;

  return (
    <div className="carryover-banner">
      <div className="carryover-header">
        <span>⚠️ {tasks.length} task{tasks.length !== 1 ? 's' : ''} carried over from previous days</span>
      </div>
      <div className="carryover-list">
        {tasks.map(task => {
          const fromDate = new Date(task.created).toLocaleDateString([], { month: 'short', day: 'numeric' });
          return (
            <div key={task.id} className="carryover-item">
              <span className="carryover-text">
                {task.text} <span className="carryover-date">({fromDate})</span>
              </span>
              <div className="carryover-actions">
                <button className="accept-btn" onClick={() => onAccept(task.id)}>
                  Pull into today
                </button>
                <button className="drop-btn" onClick={() => onDrop(task.id)}>
                  Drop
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
