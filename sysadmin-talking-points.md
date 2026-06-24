# Triage folder-drop: questions for the sysadmin

## First question — which mailbox?
Is this meant to monitor **one shared constituent-correspondence inbox**, or **every individual staffer's personal email**? Triage-for-urgent-issues makes sense against a shared inbox, not personal mail. If it's the shared inbox, this gets much simpler — one mail-flow rule instead of one per person.

## It can't be batched — alerts need to be close to real time
A daily/periodic dump defeats the point. The mechanism needs to drop new messages within minutes of arrival, not hours.

## Two realistic ways to make that happen

**1. Power Automate + OneDrive sync**
- A Power Automate flow triggers on "new email arrives" in the shared mailbox, saves each message as a file into a SharePoint folder.
- That SharePoint folder syncs to the EliteDesk box via the normal OneDrive desktop client — looks like an ordinary local folder on the box, no network share setup.
- Latency: usually under a few minutes.
- Low-code, no Azure AD app registration, no custom OAuth consent screen — easier IT sign-off than the Graph API route.

**2. On-prem Exchange transport rule + server-side export script**
- Exchange transport/journal rule routes a copy of matching mail to a dedicated mailbox or folder.
- A script (PowerShell + EWS) on the server side — not on any individual computer — exports new messages to a shared network folder every minute or so, as a scheduled task IT controls.
- EliteDesk reads that folder via a network path.
- Fully on-prem, no cloud service involved — worth raising if keeping data in-building is still a priority (same reasoning that pushed us toward local models in the first place).

## The resolution to "each computer has its own email, no way to connect to a folder"
It's not computer-to-computer. One thing (a shared mailbox, via either option above) writes to one shared destination. Only the EliteDesk needs to read from that single destination — no individual staffer's machine needs to be involved.

## What's already built and ready on our end
`triage.js --watch <folder-path>` already works: polls a folder every 30s, parses `.eml` files, classifies urgent/category/sentiment, alerts on urgent ones, moves processed files to a `processed/` subfolder so nothing gets re-flagged twice. Tested locally — works correctly. We just need the real folder path once one of the two options above is in place.
