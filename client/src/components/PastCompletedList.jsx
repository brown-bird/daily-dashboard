export default function PastCompletedList({ days, onDelete }) {
  const visibleDays = days.filter(d => d.tasks.length > 0);
  if (visibleDays.length === 0) return null;

  return (
    <div className="past-completed-section">
      {visibleDays.map(({ label, tasks }) => (
        <div key={label} className="past-day-group">
          <h2 className="past-day-heading">{label}</h2>
          {tasks.map(task => {
            const time = task.completed
              ? new Date(task.completed).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : '';
            return (
              <div key={task.id} className="past-completed-item">
                <span className="past-check">☑</span>
                <span className="past-completed-text">
                  {task.text}
                  {task.type === 'unplanned' && <span className="unplanned-badge"> ⚡</span>}
                </span>
                <span className="past-completed-time">{time}</span>
                <button
                  className="past-delete-btn"
                  onClick={() => onDelete(task.id)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
