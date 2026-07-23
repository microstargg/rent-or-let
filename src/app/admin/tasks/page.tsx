import { getDefaultBranch, listTasks } from "@/lib/db/queries";
import { TaskStatusButton } from "@/components/admin/task-status-button";
import {
  AdminEmptyState,
  AdminPageHeader,
  StatPill,
} from "@/components/admin/admin-page";

export default async function AdminTasksPage() {
  const branch = await getDefaultBranch();
  const tasks = branch ? await listTasks(branch.id) : [];
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");

  return (
    <div>
      <AdminPageHeader
        title="Tasks"
        description="Compliance chase and late-fee follow-ups created by system jobs."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatPill label="Open" value={open.length} tone={open.length ? "warning" : "success"} />
        <StatPill label="Done" value={done.length} tone="neutral" />
        <StatPill label="Total" value={tasks.length} />
      </div>

      {tasks.length === 0 ? (
        <div className="mt-8">
          <AdminEmptyState
            title="No tasks yet"
            description="Refresh compliance statuses or run rent late-fee logic to create chase tasks."
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Related</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{task.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.dueAt ? new Date(task.dueAt).toLocaleString("en-GB") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.relatedType ?? "—"}
                    {task.relatedId ? (
                      <span className="block font-mono text-xs">{task.relatedId.slice(0, 8)}…</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize">{task.status}</td>
                  <td className="px-4 py-3">
                    <TaskStatusButton taskId={task.id} status={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
