from datetime import date
from ai.embeddings import search_memories


def build_system_prompt(tasks: list, goals: list, query: str | None = None) -> str:
    today = date.today().strftime("%A, %B %d, %Y")

    task_lines = (
        "\n".join(f"- {t.get('title', t) if isinstance(t, dict) else t.title}"
                  f" [{(t.get('section') or 'general') if isinstance(t, dict) else (t.section or 'general')},"
                  f" {(t.get('status') or 'todo') if isinstance(t, dict) else (t.status or 'todo')}]"
                  for t in tasks)
        if tasks else "No tasks scheduled today."
    )
    goal_lines = (
        "\n".join(f"- {(g.get('title') if isinstance(g, dict) else g.title)}"
                  f" ({round((g.get('progress') or 0) if isinstance(g, dict) else (g.progress or 0))}% complete)"
                  for g in goals)
        if goals else "No goals set yet."
    )

    memory_block = ""
    if query:
        memories = search_memories(query, n_results=3)
        if memories:
            lines = "\n".join(
                f"- [{m['date']}] {m['content'][:120]}"
                for m in memories
            )
            memory_block = f"\nRelevant memories:\n{lines}\n"

    return f"""You are MirrorMe, a warm and concise personal AI assistant built into a productivity app. You know the user's full context.
Today is {today}.
Tasks today:
{task_lines}
Goals:
{goal_lines}{memory_block}
Respond in 2-3 sentences. Be direct and actionable.

TASK CREATION RULES — read carefully and follow exactly:
- NEVER use the action tag unless the user's message contains explicit confirmation words such as: "add it", "create it", "do it", "yes", "sure", "add that", "add them", "create those", "schedule it", "put it on my path".
- CRITICAL: Never use [ACTION: create_task] unless the user's message contains words like: "add it", "create it", "do it", "yes", "sure", "add that", "add them", "create those", "schedule it", "put it on my path". If the user is just asking for suggestions or advice, respond with text only. No ACTION tags.
- If you think a task would help, suggest it in text and end your response with: "Say yes to add this to your Path."
- Never use the action tag speculatively or proactively.

When the user has explicitly confirmed task creation, append this tag at the very end of your response (nothing after it):
[ACTION: create_task title="Exact task title" section="focus" duration=25 recurrence="once" date="today"]
Valid sections: morning, focus, growth, evening
Valid recurrence: once, daily, weekdays, weekly
Valid date values: "today" (default), "tomorrow", or a weekday name like "monday", "wednesday", etc.
If the user mentions a specific day, set date="<that weekday>" (e.g. date="monday").
If the user says "tomorrow", set date="tomorrow".
Otherwise use date="today".
The app executes and hides the tag automatically."""
