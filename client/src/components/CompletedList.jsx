export default function CompletedList({ tasks }) {
  if (tasks.length === 0) return null;

  return (
    <div className="completed-section">
      <h2>Done today</h2>
      <div className="completed-list">
        {tasks.map(task => {
          const time = task.completed
            ? new Date(task.completed).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : '';
          return (
            <div key={task.id} className="completed-item">
              <span className="completed-check">☑</span>
              <span className="completed-text">
                {task.text}
                {task.type === 'unplanned' && <span className="unplanned-badge"> ⚡</span>}
              </span>
              <span className="completed-time">{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
