# Lyrebird Slack Integration

The Lyrebird Slack Integration is an awesome `Slash Command` that helps you send voice messages on Slack using your [vocal avatar](https://lyrebird.ai/vocal-avatar).

## Installation / Deployment

### Lyrebird Application Setup
1. You'll need to create a Lyrebird Application in order to get a Client Id  and a Client Secret. To do so, please visit [Lyrebird Application](https://myvoice.lyrebird.ai/application/new).
2. In the [config.json](config.json) file, please fill up the  `LYREBIRD_APP_CLIENT_ID`, `LYREBIRD_APP_CLIENT_SECRET`, `LYREBIRD_APP_REDIRECT_URI` with the details in your Lyrebird application page.


### Slack Application Setup
1. You'll need to create a Slash command app on Slack. For more informations on how to create a Slack Command App, please visit [Slash Commands
](https://api.slack.com/slash-commands)
2. Once you create your Slash Command, you'll need to retrieve your Slack Application `SLACK_TOKEN`, `SLACK_APP_CLIENT_ID`,  `SLACK_APP_CLIENT_SECRET` and put them in the [config.json](config.json) file.

### GCP Cloud Functions Setup

This application uses Google Cloud functions as a backend. We mainly use 4 HTTP Triggers Endpoint:
* `authorizeLyrebirdUser`: OAuth Endpoint for Lyrebird Authorization.
* `getSlackToken`: OAuth Endpoint for Slack Authorization.
* `voicifySlack`: Endpoint that receives the Slack Voicify request.
* `voicifyHandle`: Endpoint that calls Lyrebird Vocal Avatar in order to voicify the request.

This [tutorial](https://cloud.google.com/functions/docs/tutorials/slack) is a great place to help you get started. It demonstrates using Cloud Functions to implement a Slack Slash Command.

## License
This project is licensed under the MIT License. See https://opensource.org/licenses/MIT for licence information.

## Terms
Your use of this project is subject to, and by using or downloading the project files you agree to comply with, the [Lyrebird APIs Terms of Service](https://lyrebird.ai/terms/evaluation).

## Slack Group
If you have some questions, please visit our Slack group: [Lyrebird Vocal Avatar API Support](https://join.slack.com/t/avatar-api-support/shared_invite/enQtNDI0NDEzNjA0MDE3LTgwOGRjZGM4MDczN2VkMjA4M2Q4ZDU4MDlhNDVhYjMzMjA1YTY3YTFlNDVkODRkYjZjMmIzNzEzMjViMjU2Y2M).
