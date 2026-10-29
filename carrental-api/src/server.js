'use strict';
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[server] carrental-api listening on port ${PORT} (${process.env.NODE_ENV})`);
});
