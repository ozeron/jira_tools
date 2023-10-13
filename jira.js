require('dotenv').config();
const JiraClient = require('jira-connector');

let jira = new JiraClient({
  host: process.env.JIRA_HOST,
  basic_auth: {
    email: process.env.JIRA_EMAIL,
    api_token: process.env.JIRA_API_TOKEN
  }
});

module.exports = jira;
