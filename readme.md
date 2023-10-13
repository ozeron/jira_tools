Jira Epic Processor

This is a Node.js script that interacts with Jira's API to fetch and update information related to Epics and their linked issues.
Features

- Fetches the work started date for a given issue.
- Edits the due date and start date of an Epic.
- Fetches the status and due date for a given issue.
- Fetches linked issues of an Epic and updates their due dates and start dates.
- Processes all Epics and their linked issues based on a provided JQL query.
Usage

This script uses the commander package to provide a command-line interface. There are two main commands:

1. process-epic <epicKey>: Fetches the linked issues of an Epic specified by epicKey. It has two options:
- -w, --write: Update the Epic with due dates.
- -f, --force: Overwrite existing values.

2. process-epics <jql>: Fetches the linked issues of all Epics that match the provided JQL query. It has the same options as process-epic.
Dependencies

- jira.js: A custom module to interact with Jira's API.
- commander: A complete solution for node.js command-line interfaces.
- date-fns: Modern JavaScript date utility library.
Example
f

This command will fetch the linked issues of the Epic with key MKT-210, and update their due dates and start dates, overwriting any existing values.
Note

This script assumes that you have a jira.js module that exports an object with methods to interact with Jira's API. You need to replace this with your actual Jira API client.
