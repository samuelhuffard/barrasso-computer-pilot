// Recipient lists per category/threat type — populate once the sysadmin sends his list.
// Keys should match the "category" field the classifier returns (see triage.js SYSTEM_PROMPT).
const ALERT_ROUTING = {
  threat_or_safety: ['threats@barra-wsh-dv01.senate.ussenate.us'],
  casework: ['case@barra-wsh-dv01.senate.ussenate.us'],
  policy_opinion: [],
  administrative: [],
  other: [],
};

function recipientsFor(category) {
  return ALERT_ROUTING[category] ?? [];
}

export { ALERT_ROUTING, recipientsFor };
