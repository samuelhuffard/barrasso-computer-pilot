import { PublicClientApplication } from '@azure/msal-node';

const TENANT_ID = process.env.GRAPH_TENANT_ID;
const CLIENT_ID = process.env.GRAPH_CLIENT_ID;
const SCOPES = ['Mail.Read'];

let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresOn > Date.now()) {
    return cachedToken.accessToken;
  }

  if (!TENANT_ID || !CLIENT_ID) {
    throw new Error('Set GRAPH_TENANT_ID and GRAPH_CLIENT_ID env vars (from the Azure AD app registration) before using --live mode.');
  }

  const pca = new PublicClientApplication({
    auth: { authority: `https://login.microsoftonline.com/${TENANT_ID}`, clientId: CLIENT_ID },
  });

  const result = await pca.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (response) => console.log(response.message),
  });

  cachedToken = { accessToken: result.accessToken, expiresOn: result.expiresOn.getTime() };
  return cachedToken.accessToken;
}

async function fetchInboxMessages(limit = 10) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${limit}&$select=id,subject,from,bodyPreview`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    throw new Error(`Graph API request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.value.map((msg) => ({
    id: msg.id,
    from: msg.from?.emailAddress?.address ?? 'unknown',
    subject: msg.subject,
    body: msg.bodyPreview,
  }));
}

export { fetchInboxMessages };
