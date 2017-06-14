const { config } = require('@instrument/moderator-config');
const { makeServer } = require('@instrument/moderator-backend-core');
const { startProcessing, mountCronAPI, mountTaskAPI, mountQueueDashboard } = require('./dist/index');

// Start the queue worker
startProcessing();

// Start up the app
const {
  app,
  start,
} = makeServer();

app.use('/', mountQueueDashboard());
app.use('/tasks', mountTaskAPI());
app.use('/cron', mountCronAPI());

start(config.get('port'));
