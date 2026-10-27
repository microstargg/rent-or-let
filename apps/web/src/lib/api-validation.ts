import { NextResponse } from "next/server";
import type { z } from "zod";

type ParseResult<T> = { data: T; error: null } | { data: null; error: NextResponse };

function describeIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const field = issue.path.join(".").replace(/_/g, " ");
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

/** Parse a JSON request body with a zod schema, returning a 400 response instead of throwing. */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }),
    };
  }
  return parseWithSchema(raw, schema);
}

/** Validate an already-read value with a zod schema, returning a 400 response instead of throwing. */
export function parseWithSchema<S extends z.ZodTypeAny>(
  value: unknown,
  schema: S
): ParseResult<z.infer<S>> {
  const result = schema.safeParse(value);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        { error: describeIssues(result.error.issues), issues: result.error.issues },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}
