---
name: agent-patterns
description: >-
  Opportunistically identifies reusable AI agent coding patterns during normal
  work and publishes them as caps to the kognova/agent-patterns collection
  beacon. Activates when the agent notices a pattern worth sharing — a hook,
  skill, CLAUDE.md convention, test strategy, or workflow — that would be
  useful across codebases.
---

## When to activate

This skill runs in the background as you work. After completing a task, pause briefly and consider: **did I just use or create a pattern that another agent or developer would benefit from?**

Patterns worth capturing:

- Claude Code hooks (pre-commit, post-build, etc.)
- CLAUDE.md conventions that improve agent behavior
- Testing strategies for agent-written code
- Prompt patterns for specific tool use (git, APIs, CLIs)
- Skill structures that work well
- Workflow patterns (plan-then-execute, parallel agents, etc.)
- Error recovery patterns
- Security patterns for agent-generated code

Do NOT capture:

- Project-specific logic or business rules
- One-off fixes with no general applicability
- Patterns already well-documented in official docs
- Trivial or obvious practices

## How to ship a pattern

When you spot something worth sharing:

1. **Extract the pattern** — distill it from the specific context into a general recipe. Include: what problem it solves, when to apply it, the pattern itself, and any gotchas.

2. **Ship it to the collection beacon:**
   ```
   vit ship \
     --beacon vit:github.com/kognova/agent-patterns \
     --title "Pattern Name" \
     --description "One sentence on what it does and when to use it" \
     --ref "three-word-slug" \
     <<'EOF'
   ## Pattern Name

   **Problem:** What situation triggers this pattern.

   **Pattern:** The actual technique, with code examples if applicable.

   **When to use:** Conditions where this applies.

   **Gotchas:** Edge cases or common mistakes.
   EOF
   ```

3. **Keep it brief** — a good pattern cap is 10-30 lines. If it's longer, it's probably too specific.

## Important: always ask first

**Never ship a pattern without the user's explicit approval.** When you spot a pattern worth sharing:

1. Tell the user what you noticed and why you think it's worth capturing.
2. Show them the draft title, description, and body.
3. Only run `vit ship` after they confirm.

The user may want to refine the wording, skip it entirely, or save it for later. Respect that.

## Judgment calls

- **Suggest liberally, not perfectly.** A rough pattern suggested is better than a polished one you never mention. The user can always say no.
- **Prefer concrete over abstract.** "Use `git stash` before rebase in agent workflows" beats "consider version control state management."
- **Name it for discovery.** The ref and title should make sense to someone skimming a list of caps. "pre-commit-lint-hook" not "code-quality-improvement."
- **Don't interrupt flow.** If you're in the middle of a complex task, finish it first. Suggest the pattern afterward.

## Prerequisites

The project must have the collection beacon configured:

```
vit init --add-beacon https://github.com/kognova/agent-patterns
```

Check with `vit doctor` — you should see `beacon: vit:github.com/kognova/agent-patterns (collection)`.
