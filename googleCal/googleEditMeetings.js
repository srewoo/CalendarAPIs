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

function updateEvents(auth) {
  const calendar = google.calendar({ version: 'v3', auth });

  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(), // fetch only future events
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime'
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      events.forEach((event, index) => {
        if (event.summary && event.summary.startsWith('recall test meeting')) {
          const updatedEvent = {
            ...event,
            summary: event.summary + '_Edited',
            start: {
              ...event.start,
              dateTime: new Date(new Date(event.start.dateTime).getTime() - 10 * 60 * 1000).toISOString(),
            },
            end: {
              ...event.end,
              dateTime: new Date(new Date(event.end.dateTime).getTime() - 10 * 60 * 1000).toISOString(),
            }
          };

          calendar.events.update({
            calendarId: 'primary',
            eventId: event.id,
            resource: updatedEvent,
          }, (err, event) => {
            if (err) {
              console.log('There was an error updating the Calendar event: ' + err);
              return;
            }
            console.log('Event updated: %s', event.data.htmlLink);
          });
        }
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}

fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) {
    console.log('Error loading client secret file:', err);
    return;
  }
  authorize(JSON.parse(content), updateEvents);
});
