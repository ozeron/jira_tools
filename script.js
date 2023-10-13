const jira = require('./jira.js');
const program = require('commander');
const { format, parseISO } = require('date-fns');

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



async function editEpicDates(epicKey, newDueDate, newStartDate) {
  try {
    const issue = await jira.issue.getIssue({ issueKey: epicKey });
    const updatedFields = {
      duedate: format(parseISO(newDueDate), 'yyyy-MM-dd'), // Replace 'customfield_10000' with the actual field ID for the due date field
      // customfield_10015: format(parseISO(newStartDate), 'yyyy-mm-dd'), // Replace 'customfield_10001' with the actual field ID for the start date field
    };

    updatedFields['customfield_10015'] = format(parseISO(newStartDate), 'yyyy-MM-dd');

    const updatedIssue = await await jira.issue.editIssue({ issueKey: epicKey, issue: { fields: updatedFields } });
    console.log('Epic due date and start date updated successfully.');
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

    // console.log(`Status of ${issueKey}: ${status}`);
    // console.log(`Due date of ${issueKey}: ${dueDate}`);

    return { status, dueDate };
  } catch (error) {
    console.error('Error fetching issue status and due date:', error);
  }
}




async function fetchLinkedIssues(epicKey, options) {
  try {

    const { status, dueDate } = await fetchEpicStatusAndDueDate(epicKey)
    if (!options.force && dueDate) {
      console.log('Due date is already set. No changes will be applied.')
      return;
    }
    if (!options.force && status == "Done") {
      console.log('Status is already "Done". No changes will be applied.')
      return;
    }
    let response = await jira.search.search({ jql: `"Epic Link" = ${epicKey} AND resolution = Done ORDER BY resolutiondate ASC` });
    const issues = response.issues.filter(issue => issue !== undefined);
    // console.log('Found issues', issues.length)
    if (issues.length == 0) {
      console.log('There are no linked issues')
      return;
    }
    if (issues[0].fields.status.name != 'Done') {
      // console.log(issues[0].status, issues[0].key)
      console.log('First issue not done')
      // console.log(JSON.stringify(issues[0]))
      return;
    }
    // console.log(issues[0].status, issues[0].key)
    const workStartedAt = await fetchWorkStartedDate(issues[0].key);
    const newDueDate = issues[issues.length - 1].fields.resolutiondate;
    if (!workStartedAt) {
      throw new Error('workStartedAt is empty or undefined');
    }
    console.log('epicKey:', epicKey);
    console.log('Min resolution date:', workStartedAt);
    console.log('Max resolution date:', newDueDate);
    if (options.write) {
      console.log('applying changes');
      await editEpicDates(epicKey, newDueDate, workStartedAt)
    } else {
      console.log('dry run, pass -w to overwrite')
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

program.parse(process.argv);
