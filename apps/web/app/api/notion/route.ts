import type { TaskInput } from "@clutch/core";

type NotionProp = {
  type: string;
  title?: { plain_text: string }[];
  date?: { start?: string } | null;
};

export async function POST(req: Request) {
  const { token, databaseId } = (await req.json().catch(() => ({}))) as {
    token?: string;
    databaseId?: string;
  };
  if (!token || !databaseId) {
    return Response.json({ error: "token and databaseId are required" }, { status: 400 });
  }

  let data: { results?: { properties?: Record<string, NotionProp> }[] };
  try {
    const r = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ page_size: 50 }),
    });
    if (!r.ok) {
      return Response.json({ error: `Notion ${r.status}` }, { status: 502 });
    }
    data = await r.json();
  } catch {
    return Response.json({ error: "could not reach Notion" }, { status: 502 });
  }

  const tasks: TaskInput[] = [];
  for (const page of data.results ?? []) {
    const props = page.properties ?? {};
    let title = "";
    let deadline: number | null = null;
    for (const p of Object.values(props)) {
      if (p.type === "title" && p.title?.length) {
        title = p.title.map((t) => t.plain_text).join("").trim();
      }
      if (p.type === "date" && p.date?.start) {
        const ms = Date.parse(p.date.start);
        if (!Number.isNaN(ms)) deadline = ms;
      }
    }
    if (!title) continue;
    tasks.push({
      title,
      category: "other",
      deadline,
      hardDeadline: deadline != null,
      estEffortMin: 30,
      impact: 2,
      irreversible: false,
      source: "notion",
    });
  }

  return Response.json({ tasks, count: tasks.length });
}
