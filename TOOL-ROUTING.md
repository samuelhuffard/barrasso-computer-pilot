# Tool-Routing Architecture

```text
email source
  → local model classification
  → schema validation
  → deterministic tool plan
  → explicit execution allowlist
  → human-reviewed downstream workflow
```

## Separation of responsibilities

The local model may only identify signals:

- urgency and priority
- category and intent
- whether a reply is likely expected
- sentiment
- up to three topic labels
- a short reason

It does not choose arbitrary tools or execute actions.

`tool-routing.js` converts the validated classification into deterministic tool suggestions. This prevents email content or prompt injection from inventing a tool call.

## Current tool routes

| Route | Intended downstream use | Default posture |
|---|---|---|
| `log_triage` | Audit/classification record | Safe local execution |
| `notify_staff` | Urgent human alert | Safe local execution |

Only tools present in the dispatcher's explicit allowlist can run. The current pilot executes only local logging and the urgent alert email — nothing else mutates an external system.
