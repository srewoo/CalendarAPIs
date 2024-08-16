require('dotenv').config();
const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Environment variables
const TOKEN_PATH = path.join(__dirname, 'config/token.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key'; // Use a 32-character string

function encrypt(text) {
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.alloc(16, 0));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
}

function decrypt(text) {
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.alloc(16, 0));
    let decrypted = decipher.update(Buffer.from(text, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function authorize(callback) {
    const { client_secret, client_id, redirect_uris } = JSON.parse(process.env.CREDENTIALS).installed;
    const oAuth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(decrypt(token)));
        callback(oAuth2Client);
    });
}

function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            fs.writeFile(TOKEN_PATH, encrypt(JSON.stringify(token)), (err) => {
                if (err) return console.error(err);
                console.log('Token stored securely to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function createEvents(auth, startISO, numberOfMeetings) {
    const calendar = google.calendar({ version: 'v3', auth });
    const events = [];

    for (let i = 0; i < numberOfMeetings; i++) {
        const eventDate = new Date(new Date(startISO).getTime() + i * 15 * 60 * 1000).toISOString(); // increment start time for each meeting by 15 minutes
        const meetingURL = process.env.MEETING_URL; // Moved URL to environment variable
        events.push({
            summary: `recall test meeting${i + 1}`,
            ISOstart: eventDate,
            duration: 15, // 15 minutes duration
            attendees: process.env.ATTENDEES.split(','), // Attendees from environment variable
            location: meetingURL,
            description: `Join Meeting: ${meetingURL}`
        });
    }

    events.forEach(event => {
        const eventBody = {
            summary: event.summary,
            start: {
                dateTime: event.ISOstart,
                timeZone: 'America/Los_Angeles',
            },
            end: {
                dateTime: new Date(new Date(event.ISOstart).getTime() + event.duration * 60 * 1000).toISOString(),
                timeZone: 'America/Los_Angeles',
            },
            attendees: event.attendees.map(email => ({ email })),
            location: event.location,
            description: event.description
        };

        calendar.events.insert({
            auth: auth,
            calendarId: 'primary',
            resource: eventBody,
        }, (err, event) => {
            if (err) {
                console.log('There was an error contacting the Calendar service: ' + err);
                return;
            }
            console.log('Event created: %s', event.data.htmlLink);
        });
    });
}

const startISO = process.env.START_ISO; // Start time from environment variables
const numberOfMeetings = parseInt(process.env.NUMBER_OF_MEETINGS, 10); // Number of meetings from environment variables

authorize((auth) => createEvents(auth, startISO, numberOfMeetings));
