const express = require('express');
const cors = require('cors');
const path = require('path');

const tasksRouter = require('./routes/tasks');
const completedRouter = require('./routes/completed');
const standupRouter = require('./routes/standup');

const app = express();
const PORT = process.env.PORT || 3001;
const DIST = path.join(__dirname, '../client/dist');

app.use(cors());
app.use(express.json());

app.use('/api/tasks', tasksRouter);
app.use('/api/completed', completedRouter);
app.use('/api/standup', standupRouter);

app.use(express.static(DIST));
app.get('/{*path}', (req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
