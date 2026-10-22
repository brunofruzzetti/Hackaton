import type { PlayerTask } from "@shared/index";

const DIFFICULTY_LABEL: Record<PlayerTask["difficulty"], string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
};

interface TaskHandProps {
  tasks: PlayerTask[];
}

export function TaskHand({ tasks }: TaskHandProps) {
  if (tasks.length === 0) {
    return (
      <p className="hint">
        Tu agenda secreta aparecerá al comenzar la discusión. Cuatro tareas por ronda.
      </p>
    );
  }

  return (
    <div className="task-grid">
      {tasks.map((task) => (
        <article key={task.id} className={`task-card task-${task.difficulty}`}>
          <div className="task-card-head">
            <span className={`task-difficulty task-${task.difficulty}`}>
              {DIFFICULTY_LABEL[task.difficulty]}
            </span>
            <span className="task-points">{task.points} pt</span>
          </div>
          {task.kind === "combo" && (
            <span className="badge badge-combo">Combo con {task.partnerName}</span>
          )}
          <p>{task.text}</p>
        </article>
      ))}
    </div>
  );
}
