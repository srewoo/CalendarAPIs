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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createEvents(auth, startISO, numberOfMeetings) {
  const calendar = google.calendar({ version: 'v3', auth });

  for (let i = 0; i < numberOfMeetings; i++) {
    const meetingURL = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_YTk1ODcwYTMtMjM2YS00YWE3LTg1NGQtMjI3N2M0OGY3OTY2%40thread.v2/0?context=%7b%22Tid%22%3a%223578a285-4c97-46fc-a274-20ca6693f670%22%2c%22Oid%22%3a%223c7bb03f-be13-469d-949f-342245ff0877%22%7d'; // Add VC URL here
    const eventBody = {
      summary: `Load test 7 Aug Part 4: Recall Test Meeting ${i + 1}`,
      start: {
        dateTime: startISO,
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: new Date(new Date(startISO).getTime() + 15 * 60 * 1000).toISOString(), // Set end time 15 minutes after start time
        timeZone: 'America/Los_Angeles',
      },
      attendees: [
        { email: 'testrakesh77@gmail.com' },
        { email: 'agreen@uog' },
        { email: 'spavlova@uog.com' }
      ],
      location: meetingURL,
      description: `Join Meeting: ${meetingURL}\n\nAdditional Info: www.time.com`
    };

    try {
      const event = await calendar.events.insert({
        auth: auth,
        calendarId: 'primary',
        resource: eventBody,
      });
      console.log('Event created: %s', event.data.htmlLink);
    } catch (err) {
      console.error('There was an error contacting the Calendar service: ' + err);
      break;
    }

    // Sleep for 2 seconds before creating the next event
    await sleep(2000);
  }
}

const startISO = '2024-08-07T08:30:00-00:30'; // Example start time in ISO format
const numberOfMeetings = 250; // Number of meetings to create

fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) {
    console.log('Error loading client secret file:', err);
    return;
  }
  authorize(JSON.parse(content), (auth) => createEvents(auth, startISO, numberOfMeetings));
});
