import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { tasks } from "../schema";

export async function listTasks(branchId: string, status?: string) {
  const conditions = [eq(tasks.branchId, branchId)];
  if (status) conditions.push(eq(tasks.status, status));
  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.dueAt), desc(tasks.createdAt));
}

export async function updateTaskStatus(id: string, status: string) {
  const [row] = await db
    .update(tasks)
    .set({ status })
    .where(eq(tasks.id, id))
    .returning();
  return row ?? null;
}
