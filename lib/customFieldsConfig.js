const jira = require('../jira.js');


async function customFieldsConfig() {
  try {
    const fields = await jira.field.getAllFields();
    fields.forEach(field => {
      if (field.custom) {
        console.log(`Custom field found: ${field.name}`);
        console.log(`ID: ${field.id}`);
        console.log(`Description: ${field.description}`);
        console.log(`Type: ${field.schema.type}`);
        console.log('-------------------------');
      }
    });
  } catch (error) {
    console.error('Error fetching fields:', error);
  }
}

module.exports = customFieldsConfig;
