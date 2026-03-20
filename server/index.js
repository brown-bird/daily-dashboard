const express = require('express');
const cors = require('cors');

const tasksRouter = require('./routes/tasks');
const completedRouter = require('./routes/completed');
const standupRouter = require('./routes/standup');
const rolloverRouter = require('./routes/rollover');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/tasks', tasksRouter);
app.use('/api/completed', completedRouter);
app.use('/api/standup', standupRouter);
app.use('/api', rolloverRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
