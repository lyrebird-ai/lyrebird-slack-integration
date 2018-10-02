
PROJECT_ID="Your GCP Project ID"

gcloud functions deploy voicifySlack --trigger-http --project $PROJECT_ID
gcloud functions deploy authorizeLyrebirdUser --trigger-http --project $PROJECT_ID
gcloud functions deploy getSlackToken --trigger-http --project $PROJECT_ID
