const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Path to your credentials file
const CREDENTIALS_PATH = path.join(__dirname, 'config/credentials.json');
const TOKEN_PATH = path.join(__dirname, 'config/token.json');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
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
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function deleteEvents(auth, startISO, numberOfMeetings) {
  const calendar = google.calendar({ version: 'v3', auth });

  // List events to find the ones to delete
  calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    timeMax: new Date(new Date().getTime() + 12 * 60 * 60 * 1000).toISOString(),
    q: 'Load test 7 Aug Part 2: Recall Test Meeting', // Search for the meeting title
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      console.log('Events to delete:');
      events.forEach((event, i) => {
        console.log(`${event.summary} (${event.id})`);
        // Delete each event
        calendar.events.delete({
          calendarId: 'primary',
          eventId: event.id,
        }, (err) => {
          if (err) return console.log('Error deleting event: ' + err);
          console.log(`Event deleted: ${event.summary}`);
        });
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}

const startISO = '2024-08-07T07:05:00-00:30'; // example start time in ISO format
const numberOfMeetings = 250; // number of meetings to create

fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) {
    console.log('Error loading client secret file:', err);
    return;
  }
  authorize(JSON.parse(content), (auth) => deleteEvents(auth, startISO, numberOfMeetings));
});
