const { Client } = require('@microsoft/microsoft-graph-client');
const { DeviceCodeCredential } = require('@azure/identity');
const fs = require('fs');
const config = require('./outlookConfig');
require('isomorphic-fetch');

// Microsoft Graph API settings
const { clientId, tenantId, tokenCachePath } = config;

async function getAuthToken() {
    let tokenResponse;

    if (fs.existsSync(tokenCachePath)) {
        const tokenCache = JSON.parse(fs.readFileSync(tokenCachePath, 'utf8'));
        const credential = new DeviceCodeCredential({
            clientId: clientId,
            tenantId: tenantId,
            userPromptCallback: (info) => {
                console.log(info.message);
            },
        });
        tokenResponse = await credential.getToken(['https://graph.microsoft.com/.default'], {
            refreshToken: tokenCache.refreshToken
        });

        // Save the new token information if needed
        if (tokenResponse) {
            fs.writeFileSync(tokenCachePath, JSON.stringify(tokenResponse));
        }
    } else {
        tokenResponse = await authenticate();
    }

    return tokenResponse.token;
}

async function authenticate() {
    const credential = new DeviceCodeCredential({
        clientId: clientId,
        tenantId: tenantId,
        userPromptCallback: (info) => {
            console.log(info.message);
        },
    });

    const tokenResponse = await credential.getToken(['https://graph.microsoft.com/.default']);
    fs.writeFileSync(tokenCachePath, JSON.stringify({
        refreshToken: tokenResponse.refreshToken,
        accessToken: tokenResponse.token,
    }));

    return tokenResponse;
}

async function deleteEvents() {
    const accessToken = await getAuthToken();
    const client = Client.initWithMiddleware({
        authProvider: {
            getAccessToken: async () => accessToken,
        },
    });

    const startISO = '2024-08-06T13:40:00Z'; // start time in ISO format
    const endISO = new Date(new Date(startISO).getTime() + 5 * 15 * 60 * 1000).toISOString(); // 5 meetings with 15 min interval

    try {
        const events = await client
            .api('/me/events')
            .filter(`start/dateTime ge '${startISO}' and start/dateTime le '${endISO}' and startswith(subject, 'Recall Test Meeting')`)
            .get();

        if (events.value.length === 0) {
            console.log('No events found to delete.');
            return;
        }

        for (const event of events.value) {
            await client.api(`/me/events/${event.id}`).delete();
            console.log(`Deleted event: ${event.subject}`);
        }
    } catch (error) {
        console.error('Error fetching or deleting events:', error);
    }
}

deleteEvents();
