const dotenv = require('dotenv');
const path = require('path');

// Read env variables from .env
dotenv.config();
module.exports = {
  token: process.env.TOKEN,
  privchatid: process.env.PRIVATECHATID,
  calcursepath: process.env.CALCURSEPATH,
  gitrepourl: process.env.GITREPOURL,
  gitworkdir: path.join(__dirname, 'tmp'),
};
