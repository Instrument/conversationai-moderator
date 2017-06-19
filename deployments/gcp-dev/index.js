/*
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Activate Google Cloud Trace and Debug when in production
if (process.env.NODE_ENV === 'production') {
  require('@google-cloud/trace-agent').start();
  require('@google-cloud/debug-agent').start();
}

const { makeServer } = require('@instrument/moderator-backend-core');
const { mountWebFrontend } = require('@instrument/moderator-frontend-web');
const { mountAPI, createPublisherRouter } = require('@instrument/moderator-backend-api');
const {
  mountCronAPI,
  mountTaskAPI,
  startProcessing,
  verifyAppEngineCron
} = require('@instrument/moderator-backend-queue');

/**
 * HTTP setup
 */

const {
  app,
  start,
} = makeServer();

// Required for GAE
app.disable('etag');
app.set('trust proxy', true);

// Start the Web frontend
app.use('/', mountWebFrontend());

// Start up the api
app.use('/api', mountAPI());

// Set up the queue Task API.
app.use('/queue/tasks', mountTaskAPI());

// Set up the queue Cron API.
app.use('/queue/cron', verifyAppEngineCron, mountCronAPI());

// Our application will need to respond to health checks when running on
// Compute Engine with Managed Instance Groups.
app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});

start(8080);
