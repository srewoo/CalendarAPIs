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

async function main() {
    const accessToken = await getAuthToken();
    const client = Client.initWithMiddleware({
        authProvider: {
            getAccessToken: async () => accessToken,
        },
    });

    const startISO = '2024-08-07T04:30:00Z'; // example start time in ISO format
    const numberOfMeetings = 250; // number of meetings to create
    const meetingDuration = 15; // meeting duration in minutes
    const attendees = [
        { emailAddress: { address: 'rakesh.barhate@mindtickle.com' } },
        { emailAddress: { address: 'testrakesh77@gmail.com' } },
    ];
    const meetingURL = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_NTgyZWFiNWYtMzA0Yy00MjkzLTkwM2MtMmY2ZjhhMGUzYWI0%40thread.v2/0?context=%7b%22Tid%22%3a%225f41353a-e0ce-45f6-afad-92b9247e2463%22%2c%22Oid%22%3a%221fab9512-f7f4-4121-bfc6-5ec9d1988b57%22%7d';

    for (let i = 0; i < numberOfMeetings; i++) {
        const event = {
            subject: `Recall Test Meeting ${i + 1}`,
            start: {
                dateTime: startISO,
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(new Date(startISO).getTime() + meetingDuration * 60 * 1000).toISOString(),
                timeZone: 'UTC',
            },
            location: {
                displayName: 'Online',
                locationUri: `${meetingURL}`,
            },
            body: {
                contentType: 'HTML',
                content: `<a href="${meetingURL}">www.time.com</a>`,
            },
            attendees: attendees,
        };

        try {
            const result = await client.api('/me/events').post(event);
            console.log(`Event created: ${result.webLink}`);
        } catch (error) {
            console.error('Error creating event:', error);
        }
    }
}

main();
