const { Client } = require('@microsoft/microsoft-graph-client');
const { DeviceCodeCredential } = require('@azure/identity');
require('isomorphic-fetch');

// Microsoft Graph API settings
const clientId = '0881090e-19e2-459e-8493-2bac0054c929';
const tenantId = '5f41353a-e0ce-45f6-afad-92b9247e2463';

async function main() {
    const credential = new DeviceCodeCredential({
        clientId: clientId,
        tenantId: tenantId,
        userPromptCallback: (info) => {
            console.log(info.message);
        },
    });

    const client = Client.initWithMiddleware({
        authProvider: {
            getAccessToken: async () => {
                const tokenResponse = await credential.getToken(['https://graph.microsoft.com/.default']);
                return tokenResponse.token;
            },
        },
    });

    // Fetch the events
    const events = await client.api('/me/events').get();

    if (events && events.value && events.value.length > 0) {
        for (let event of events.value) {
            if (event.subject && event.subject.includes('_edited')) {
                try {
                    await client.api(`/me/events/${event.id}`).delete();
                    console.log(`Event deleted: ${event.subject}`);
                } catch (error) {
                    console.error('Error deleting event:', error);
                }
            }
        }
    } else {
        console.log('No events found.');
    }
}

main();
