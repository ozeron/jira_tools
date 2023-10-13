# Jira Epic Processor

This is a command-line tool that interacts with Jira to fetch and update information about Epics and their linked issues.

## Installation

First, ensure you have Node.js installed on your machine. Then, clone this repository and install the dependencies:
```bash
git clone <repository_url>
cd <repository_directory>
npm install
```
## Usage

This program provides several commands:

### process-epic <epicKey>

This command fetches and updates the start and due date of a specific Epic.

Options:
- `-w, --write`: Update the Epic with new due dates.
- `-f, --force`: Overwrite existing values.

Example:
```bash
yarn start process-epic MKT-210 -w -f
```
### process-epics <jql>

This command processes all Epics that match a given JQL query. It updates the due date and start date for each Epic.

Options:
- `-w, --write`: Update the Epic with new due dates.
- `-f, --force`: Overwrite existing values.

Example:
```bash
yarn start process-epics "project = 'MKT' AND issueType = 'Epic' And key < 'MKT-100' ORDER BY created DESC" -w -f
```
### print-custom-fields

This command prints the custom fields configuration.

Example:
```bash
yarn start print-custom-fields
```
## Note

Before running the program, make sure to set up the jira.js file with your Jira instance's details and your credentials.
```bash
cp .env.example .env
# update values to yours
```
