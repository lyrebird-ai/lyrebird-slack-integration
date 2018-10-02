/**
* Copyright (c) 2018 Lyrebird AI

* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:

* The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.


* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

"use strict";

const axios = require("axios");
const { WebClient } = require("@slack/client");
const Lyrebird = require("lyrebird-vocal-avatar").Lyrebird;
const config = require("./config.json");

// Init Cloud Firestore
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.FIREBASE_DATABASE_URL
});

var db = admin.firestore();

// Constants
const STATE_DELIMITOR = "_$_";
const FIRESTORE_COLLECTION = "SlackUsers";

/**
 * Format the Lyrebird Authorization Link Slack Message.
 *
 * @param {string} authorizationLink The Lyrebird Authorization Link.
 * @returns {object} The formatted message.
 */
function formatLyrebirdAuthorizationMessage(authorizationLink) {
  // Prepare a rich Slack message
  // See https://api.slack.com/docs/message-formatting
  const slackMessage = {
    response_type: "ephemeral",
    attachments: []
  };

  const attachment = {
    color: "#3367d6"
  };

  attachment.pretext =
    "Lyrebird needs your authorization to use my vocal avatar";
  attachment.title = "Authorize Lyrebird to use your vocal avatar";
  attachment.title_link = authorizationLink;
  attachment.text = "Make sure you created a voice on https://lyrebird.ai";
  slackMessage.attachments.push(attachment);
  return slackMessage;
}

/**
 * Format the Slack Authorization Token message.
 *
 * @returns {object} The formatted message.
 */
function formatSlackAuthorizationMessage() {
  // Prepare a rich Slack message
  // See https://api.slack.com/docs/message-formatting
  const slackMessage = {
    response_type: "ephemeral",
    attachments: []
  };

  const attachment = {
    color: "#3F0F3F"
  };

  attachment.pretext =
    "To use the Lyrebird command, you need to add it to your Slack workspace";
  attachment.title = "Add Lyrebird to my Slack workspace";
  attachment.title_link = config.SLACK_OAUTH_LINK;
  slackMessage.attachments.push(attachment);
  return slackMessage;
}

/**
 * Format the reception Message.
 *
 * @returns {object} The formatted message.
 */
function formatReceptionMessage(text) {
  // Prepare a rich Slack message
  // See https://api.slack.com/docs/message-formatting
  const slackMessage = {
    response_type: "ephemeral",
    attachments: []
  };
  const attachment = {
    color: "#3367d6"
  };
  attachment.text = text;
  slackMessage.attachments.push(attachment);
  return slackMessage;
}

/**
 * Send the user's query to the Lyrebird Vocal Avatar API.
 *
 * @param {string} slackToken The user's text query.
 * @param {string} accessToken The user's text query.
 * @param {string} user The user id.
 * @param {string} channelId The user's text query.
 * @param {string} text The user's text query.

 */
function queryVocalAvatar(
  slackToken,
  accessToken,
  username,
  userId,
  teamId,
  channelId,
  text
) {
  const client = new Lyrebird({
    accessToken
  });
  return new Promise((resolve, reject) => {
    client.generate(text).then(response => {
      if (response.status == "200") {
        uploadAvatar(
          slackToken,
          response.body,
          channelId,
          text,
          username,
          userId,
          teamId
        );
        resolve();
      } else if (response.status == "400") {
        resolve(
          formatMessage(
            "Lyrebird was not able to voicify your text, make sure you created a voice on https://lyrebird.ai/"
          )
        );
      } else {
        console.log(
          `An error with the status code ${
            response.status
          } happened, please check the reference docs for more details: http://docs.lyrebird.ai/reference-avatar/api.html#section/Errors`
        );
        reject(response.status);
        return;
      }
    });
  });
}

/**
 * Send the user's Lyrebird Authorization URL message.
 *
 * @param {string} team_id The user's slack team id.
 * @param {string} user_id The user's slack user id.
 * @param {string} user_name The user's slack user name.
 */
function sendLyrebirdAuthorizationLink(team_id, user_id, user_name) {
  return new Promise((resolve, reject) => {
    const authorizationLink = getLyrebirdUserAuthorizationLink(
      team_id,
      user_id,
      user_name
    );
    resolve(formatLyrebirdAuthorizationMessage(authorizationLink));
  });
}

/**
 * Build the user's Lyrebird Authorization URL link.
 *
 * @param {string} team_id The user's slack team id.
 * @param {string} user_id The user's slack user id.
 */
function getLyrebirdUserAuthorizationLink(team_id, user_id, user_name) {
  const state = `${team_id}${STATE_DELIMITOR}${user_id}${STATE_DELIMITOR}${user_name}`;
  const query = {
    response_type: "code",
    client_id: config.LYREBIRD_APP_CLIENT_ID,
    redirect_uri: config.LYREBIRD_APP_REDIRECT_URI,
    state,
    scope: "voice"
  };
  const queryString = Object.entries(query)
    .map(item => `${item[0]}=${item[1]}`)
    .join("&");
  const url = `${config.MYVOICE_URL}/authorize?${queryString}`;
  return url;
}

/**
 * Send the user's Slack Authorization URL message.
 *
 * @param {string} query The user's search query.
 */
function sendSlackAuthorizationLink() {
  return new Promise((resolve, reject) => {
    resolve(formatSlackAuthorizationMessage());
  });
}

/**
 * Send ack message.
 *
 */
function sendAckMessage() {
  return new Promise((resolve, reject) => {
    resolve(
      formatMessage(
        "Your text is being voicified, it should be ready in the next couple of milliseconds :)!"
      )
    );
  });
}

/**
 * Send the user's query to the Lyrebird Vocal Avatar API.
 *
 * @param {string} slackToken The user's slackToken.
 * @param {string} fileStream The user's avatar data.
 * @param {string} channelId The channelId the query is sent to.
 * @param {string} text The user's text query.
 * @param {string} username The user's username.

 */
function uploadAvatar(
  slackToken,
  fileStream,
  channelId,
  text,
  username,
  userId,
  teamId
) {
  const web = new WebClient(slackToken);
  web.files
    .upload({
      file: fileStream,
      channels: channelId,
      filename: "lyrebird_vocal_avatar.wav",
      filetype: "audio/wav",
      title: `"${text}" - ${username}`
    })
    .then(response => {
      // Success!
      console.log(`File uploaded as Stream. File ID: ${response.file.id}`);
    })
    .catch(error => {
      // Error :/
      console.log(error);
    });
}

// Cloud Functions Triggers

/**
 * Receive a Slash Command request from Slack.
 *
 * Trigger this function by making a POST request with a payload to:
 * https://[YOUR_REGION].[YOUR_PROJECT_ID].cloudfunctions.net/voicifySlack
 *
 * @example
 * curl -X POST "https://us-central1.your-project-id.cloudfunctions.net/voicifyHandle" --data '{"slackToken":"[SLACK_TOKEN]", "accessToken":"[LYREBIRD_TOKEN]", ...}'
 *
 * @param {object} req Cloud Function request object.
 * @param {object} req.body The request payload.
 * @param {string} req.body.token Slack's verification token.
 * @param {string} req.body.user_id The user's  query.
 * @param {string} req.body.user_name The user's  username.
 * @param {string} req.body.channel_id The user's  channel_id.
 * @param {string} req.body.accessToken The user's  Lyrebird Access Token.
 * @param {string} req.body.slackToken The user's  Slack Token.
 * @param {object} res Cloud Function response object.
 */
exports.voicifyHandle = (req, res) => {
  return Promise.resolve()
    .then(() => {
      if (req.method !== "POST") {
        const error = new Error("Only POST requests are accepted");
        error.code = 405;
        throw error;
      }
      const {
        user_id,
        user_name,
        team_id,
        channel_id,
        text,
        slackToken,
        accessToken
      } = req.body;
      return queryVocalAvatar(
        slackToken,
        accessToken,
        user_name,
        user_id,
        team_id,
        channel_id,
        text
      );
    })
    .then(response => {
      // Send the formatted message back to Slack
      res.json(response);
    })
    .catch(err => {
      console.error(err);
      res.status(err.code || 500).send(err);
      return Promise.reject(err);
    });
};

/**
 * Receive a Slash Command request from Slack.
 *
 * Trigger this function by making a POST request with a payload to:
 * https://[YOUR_REGION].[YOUR_PROJECT_ID].cloudfunctions.net/voicifySlack
 *
 * @example
 * curl -X POST "https://us-central1.your-project-id.cloudfunctions.net/voicifySlack" --data '{"token":"[YOUR_SLACK_TOKEN]","text":<utterance>}'
 *
 * @param {object} req Cloud Function request object.
 * @param {object} req.body The request payload.
 * @param {string} req.body.token Slack's verification token.
 * @param {string} req.body.text The user's  query.
 * @param {object} res Cloud Function response object.
 */
exports.voicifySlack = (req, res) => {
  return Promise.resolve()
    .then(() => {
      if (req.method !== "POST") {
        const error = new Error("Only POST requests are accepted");
        error.code = 405;
        throw error;
      }

      const {
        user_id,
        user_name,
        team_domain,
        team_id,
        channel_name,
        channel_id,
        text
      } = req.body;

      // Check if the user is on the db
      const SlackUserId = `${team_id}${STATE_DELIMITOR}${user_id}`;
      var userRef = db.collection(FIRESTORE_COLLECTION).doc(SlackUserId);
      return userRef.get().then(doc => {
        if (!doc.exists) {
          return sendLyrebirdAuthorizationLink(team_id, user_id, user_name);
        } else {
          const { accessToken, slackToken } = doc.data();
          if (typeof accessToken === "undefined") {
            return sendLyrebirdAuthorizationLink(team_id, user_id, user_name);
          }
          if (typeof slackToken === "undefined") {
            return sendSlackAuthorizationLink();
          }
          axios({
            method: "post",
            url: config.VOICIFY_HANDLE,
            data: {
              user_id,
              user_name,
              team_id,
              channel_id,
              text,
              slackToken,
              accessToken
            }
          });
          //return sendAckMessage();
        }
      });
    })
    .then(response => {
      // Send the formatted message back to Slack
      res.json(response);
    })
    .catch(err => {
      console.error(err);
      res.status(err.code || 500).send(err);
      return Promise.reject(err);
    });
};

/* Cloud Functions that exchanges the Lyrebird user code to an access token in the Lyrebird OAuth flow
 *
 * Trigger this function by making a POST request with a payload to:
 * https://[YOUR_REGION].[YOUR_PROJECT_ID].cloudfunctions.net/authorizeUser
 *
 * @example
 * curl -X POST "https://us-central1.your-project-id.cloudfunctions.net/authorizeLyrebirdUser" --data '{"token":"[YOUR_SLACK_TOKEN]","text":<utterance>}'
 *
 * @param {string} req.query.state Slack's teamId + STATE_DELIMITOR + Slack's teamId + STATE_DELIMITOR + Slack's username
 * @param {string} req.query.code  Lyrebird's code.
 * @param {object} res Cloud Function response object.
 */
exports.authorizeLyrebirdUser = (req, res) => {
  const { state, code } = req.query;
  axios({
    method: "post",
    url: `${config.LYREBIRD_AVATAR_URL}/api/v0/token`,
    data: {
      client_id: config.LYREBIRD_APP_CLIENT_ID,
      client_secret: config.LYREBIRD_APP_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code"
    }
  })
    .then(response => {
      const accessToken = response.data.access_token;
      const parts = state.split(STATE_DELIMITOR);
      const SlackUserRef = `${parts[0]}${STATE_DELIMITOR}${parts[1]}`;
      let userRef = db.collection(FIRESTORE_COLLECTION).doc(SlackUserRef);
      return userRef
        .set(
          {
            team: parts[0],
            userId: parts[1],
            username: parts[2],
            accessToken: accessToken
          },
          {
            merge: true
          }
        )
        .then(() => {
          res
            .status(200)
            .send(`You can now use your Lyrebird avatar in Slack with "/lyrebird <message"`);
        });
    })
    .catch(error => {
      res
        .status(500)
        .send(
          "An error happened while doing the Authorization, please try again"
        );
      console.log(error);
    });
};

/* Cloud Functions that exchanges the Slack user code to an access token in the Slack OAuth flow
 *
 * Trigger this function by making a POST request with a payload to:
 * https://[YOUR_REGION].[YOUR_PROJECT_ID].cloudfunctions.net/getSlackToken
 *
 * @example
 * curl -X POST "https://us-central1.your-project-id.cloudfunctions.net/authorizeUser" --data '{"token":"[YOUR_SLACK_TOKEN]","text":<utterance>}'
 *
 * @param {string} req.query.code The user's slack's OAuth token.
 * @param {object} res Cloud Function response object.
 */
exports.getSlackToken = (req, res) => {
  const { code } = req.query;
  return axios({
    method: "get",
    url: `${config.SLACK_TOKEN_URL}`,
    params: {
      client_id: config.SLACK_APP_CLIENT_ID,
      client_secret: config.SLACK_APP_CLIENT_SECRET,
      code: code,
      redirect_uri: config.SLACK_APP_REDIRECT_URI
    }
  })
    .then(response => {
      if (!response.data.ok) {
        res
          .status(500)
          .send(
            "An error happened while doing the Slack Authorization, please try again"
          );
        return;
      }
      const { access_token, user_id, team_id, team_name } = response.data;
      const path = `${team_id}${STATE_DELIMITOR}${user_id}`;
      let userRef = db.collection(FIRESTORE_COLLECTION).doc(path);
      return userRef
        .set(
          {
            teamId: team_id,
            slackToken: access_token,
            teamName: team_name
          },
          {
            merge: true
          }
        )
        .then(() => {
          res
            .status(200)
            .send(`You can now use your Lyrebird avatar in Slack with "/lyrebird <message"`);
        });
    })
    .catch(error => {
      res
        .status(500)
        .send(
          "An error happened while doing the Slack Authorization, please try again"
        );
      console.log(error);
    });
};
