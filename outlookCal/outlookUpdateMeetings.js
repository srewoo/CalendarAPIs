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
            const updatedEvent = {
                subject: `${event.subject}_edited`,
                start: {
                    dateTime: new Date(new Date(event.start.dateTime).getTime() + 15 * 60 * 1000).toISOString(),
                    timeZone: event.start.timeZone,
                },
                end: {
                    dateTime: new Date(new Date(event.end.dateTime).getTime() + 15 * 60 * 1000).toISOString(),
                    timeZone: event.end.timeZone,
                },
            };

            try {
                const result = await client.api(`/me/events/${event.id}`).patch(updatedEvent);
                console.log(`Event updated: ${result.webLink}`);
            } catch (error) {
                console.error('Error updating event:', error);
            }
        }
    } else {
        console.log('No events found.');
    }
}

main();
