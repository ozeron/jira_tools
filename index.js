const jira = require('./jira.js');
const program = require('commander');
const { format, parseISO } = require('date-fns');

const printCustomFields = require('./lib/customFieldsConfig.js')

const START_DATE_FIELD = 'customfield_10015';
const DATE_FORMAT_STRING = 'yyyy-MM-dd';

let epicKey = 'MKT-210';
// jira.issue.getIssue({ issueKey: epicKey }, function (error, issue) {
//   console.log(issue);
// });

/**
 * Fetches the work started date for a given issue.
 * @param {string} issueKey - The key of the issue.
 */
async function fetchWorkStartedDate(issueKey) {
  try {
    let changelog = await jira.issue.getChangelog({ issueKey });
    // console.log(JSON.stringify(changelog))
    let workStartedChange = changelog.values.find(history =>
      history.items.some(item =>
        item.field === 'status' && item.toString === 'In Progress'
      )
    );

    if (workStartedChange) {
      // console.log('Work started on:', workStartedChange.created);
      return workStartedChange.created;
    } else {
      console.log('Work has not started yet.');

      let firstTransition = changelog.values.find(history =>
        history.items.some(item =>
          item.field === 'status' && item.fromString === 'To Do'
        ));

      if (firstTransition) {
        // console.log('Work started on:', firstTransition.created);
        return firstTransition.created;
      } else {
        console.log('No first transitions');
      }
    }
  } catch (error) {
    console.error('Error fetching work started date:', error);
  }
}



async function editEpicDates(epicKey, date, field) {
  try {
    const value = format(parseISO(date), DATE_FORMAT_STRING)
    const updatedFields = {}
    updatedFields[field] = value;

    const updatedIssue = await await jira.issue.editIssue({ issueKey: epicKey, issue: { fields: updatedFields } });
    console.log(`Epic ${field} updated successfully to ${value}.`);
  } catch (error) {
    console.error('Error editing epic dates:', error);
  }
}

/**
 * Fetches the status and due date for a given issue.
 * @param {string} issueKey - The key of the issue.
 */
async function fetchEpicStatusAndDueDate(issueKey) {
  try {
    const issue = await jira.issue.getIssue({ issueKey });
    const status = issue.fields.status.name;
    const dueDate = issue.fields.duedate;
    const startDate = issue.fields[START_DATE_FIELD];

    // console.log(`Status of ${issueKey}: ${status}`);
    // console.log(`Due date of ${issueKey}: ${dueDate}`);

    return { status, dueDate, startDate };
  } catch (error) {
    console.error('Error fetching issue status and due date:', error);
  }
}

async function fetchLinkedIssues(epicKey, options) {
  try {

    const { status, dueDate, startDate } = await fetchEpicStatusAndDueDate(epicKey)
    console.log(`Epic: ${epicKey} | ${status}`);
    console.log(`Dates: ${startDate ? startDate : 'not set'} => ${dueDate ? dueDate : 'not set'}`);

    if (!options.force && status == "Done") {
      console.log('Status is already "Done". No changes will be applied. Pass -f to overwrite')
      return;
    }
    let response = await jira.search.search({ jql: `"Epic Link" = ${epicKey} AND resolution = Done ORDER BY resolutiondate ASC` });
    const issues = response.issues.filter(issue => issue !== undefined);
    console.log('Issues Count: ', issues.length)
    if (issues.length == 0) {
      console.log('Skipping as there are no linked issues')
      return;
    }
    if (issues[0].fields.status.name != 'Done') {
      // console.log(issues[0].status, issues[0].key)
      console.log('Skipping because first issue not done')
      // console.log(JSON.stringify(issues[0]))
      return;
    }
    // console.log(issues[0].status, issues[0].key)
    const workStartedAt = await fetchWorkStartedDate(issues[0].key);
    const newDueDate = issues[issues.length - 1].fields.resolutiondate;
    if (!workStartedAt) {
      throw new Error('workStartedAt is empty or undefined');
    }
    console.log('Earliest linked issue start date:', format(parseISO(workStartedAt), DATE_FORMAT_STRING));
    console.log('Oldest linked issue resolution date:', format(parseISO(newDueDate), DATE_FORMAT_STRING));

    async function applyChanges(options, epicKey, date, field, forceMessage, errorMessage) {
      if (!options.force && date) {
        console.log(forceMessage);
      } else {
        if (parseISO(workStartedAt) > parseISO(newDueDate)) {
          console.log(errorMessage);
        } else {
          await editEpicDates(epicKey, date, field);
        }
      }
    }

    if (options.write) {
      await applyChanges(options, epicKey, newDueDate, 'duedate', `Due Date is already set, pass -f to overwrite`, 'New start date is later than newDueDate, skipping...');
      await applyChanges(options, epicKey, workStartedAt, START_DATE_FIELD, `Start Date is already set, pass -f to overwrite`, 'New start date is later than newDueDate, skipping...');
    } else {
      console.log('dry run, pass -w to overwrite');
    }


  } catch (error) {
    console.error('Error fetching linked issues:', error);
  }
}


// jql `project = "MKT" AND issueType = "Epic" And key < "MKT-100" ORDER BY created DESC`
async function fetchAllEpicsAndProcessThem(jql, cmdObj) {
  try {
    let response = await jira.search.search({ jql: jql });
    const epics = response.issues;

    for (const epic of epics) {
      console.log('--------------------')
      await fetchLinkedIssues(epic.key, cmdObj);
    }
  } catch (error) {
    console.error('Error fetching linked issues:', error);
  }
}


// fetchAllEpicsAndProcessThem();
// fetchLinkedIssues('MKT-214')
program
  .command('process-epic <epicKey>')
  .description('Update start and due date of epic')
  .option('-w, --write', 'Update epic with due dates')
  .option('-f, --force', 'Overwrite values')
  .action((epicKey, cmdObj) => fetchLinkedIssues(epicKey, cmdObj));


program
  .command('process-epics <jql>')
  .description('Processes all epics in jql. Updates due date and start date for each. Example jql: `project = "MKT" AND issueType = "Epic" And key < "MKT-100" ORDER BY created DESC`')
  .option('-w, --write', 'Update epic with due dates')
  .option('-f, --force', 'Overwrite values')
  .action((jql, cmdObj) => fetchAllEpicsAndProcessThem(jql, cmdObj));


program
  .command('print-custom-fields')
  .action(printCustomFields)


program.parse(process.argv);
