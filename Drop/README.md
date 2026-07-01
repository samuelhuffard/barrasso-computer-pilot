# Drop

This is the inbox folder for the triage system. New emails, saved as `.eml` files, are placed here.

Start the watcher with:

```
node triage.js --watch
```

It checks this folder every 2 minutes. Each `.eml` file found is classified (urgent or not, category, priority) and moved automatically:

- Successfully triaged → `Drop/read/`
- Failed to process (unreadable file, classifier error) → `Drop/failed/`

Nothing needs to happen manually beyond placing new `.eml` files here — reading, classifying, moving, and sending the urgent alert email are all handled automatically.
