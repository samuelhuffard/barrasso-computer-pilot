# Tool-Routing Architecture

The triage system is not an alert-only classifier. It is a reusable local intake layer:

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
| `create_safety_review` | Threat/safety review record, including non-urgent concerns | Suggested only |
| `create_case_review` | Constituent casework intake | Suggested only |
| `record_correspondence_signal` | Topic/sentiment aggregation and dashboards | Suggested only |
| `create_draft_review` | Human-reviewed response drafting | Suggested only |
| `create_scheduling_review` | Meeting-request queue | Suggested only |
| `create_subscription_review` | Unsubscribe/preferences queue | Suggested only |
| `create_admin_review` | General administrative queue | Suggested only |

Only tools present in the dispatcher’s explicit allowlist can run. Adding a future integration requires:

1. A deterministic routing rule.
2. A handler implementation.
3. An explicit allowlist decision.
4. Tests.
5. Office authorization for the data and action.

The current pilot executes only local logging and console alerts. Every other route is visible as a suggestion but cannot mutate an external system.
