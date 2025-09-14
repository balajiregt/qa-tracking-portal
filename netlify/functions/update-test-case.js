import GitHubAPI from './utils/github.js';

export const handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const github = new GitHubAPI();
    const requestData = JSON.parse(event.body);
    
    // Extract user info
    const userId = event.headers['x-user-id'] || requestData.userId || 'user_001';
    const user = await github.getCurrentUser(userId);
    
    // Validate permissions
    github.validateUserPermission(user, 'test_create'); // Same permission as create

    // Validate required fields
    const { testId, name, description, tags, intent, duration } = requestData;
    if (!testId || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'testId and name are required' })
      };
    }

    // Read current test cases
    const { content: testData, sha } = await github.readFile('data/test-cases.json');
    
    // Find the test case to update
    const testCaseIndex = testData.test_cases.findIndex(tc => tc.id === testId);
    if (testCaseIndex === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Test case not found' })
      };
    }

    const existingTestCase = testData.test_cases[testCaseIndex];
    
    // Check if user can update this test case
    if (existingTestCase.created_by && existingTestCase.created_by !== user.username) {
      // Allow team leads and senior QA to update any test case
      if (!['senior_qa_engineer', 'admin'].includes(user.role)) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'You can only update test cases you created' })
        };
      }
    }

    // Update the test case
    const updatedTestCase = {
      ...existingTestCase,
      name: name,
      description: description || existingTestCase.description,
      tags: tags || existingTestCase.tags,
      intent: intent || existingTestCase.intent,
      expected_duration: duration || existingTestCase.expected_duration,
      updated_at: new Date().toISOString(),
      updated_by: user.display_name || user.username
    };

    // Generate BDD steps if tags changed and none exist
    if (!updatedTestCase.bdd_steps || updatedTestCase.bdd_steps.length === 0) {
      updatedTestCase.bdd_steps = this.generateDefaultBDDSteps(updatedTestCase.intent);
      updatedTestCase.steps = updatedTestCase.bdd_steps.map(step => step.formatted);
    }

    testData.test_cases[testCaseIndex] = updatedTestCase;

    // Update tags list if new tags are introduced
    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => {
        if (!testData.tags.includes(tag)) {
          testData.tags.push(tag);
        }
      });
    }

    // Update metadata
    github.updateMetadata(testData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'Test Case Updated',
      `${name}: updated by ${user.display_name || user.username}`,
      userId
    );

    await github.writeFile('data/test-cases.json', testData, commitMessage, sha);

    // Log activity
    await github.logActivity(
      'test_case_updated',
      'test_case_modified',
      user.display_name || user.username,
      {
        test_case_id: testId,
        test_name: name,
        updated_fields: Object.keys(requestData).filter(key => !['testId', 'userId'].includes(key)),
        intent: intent || existingTestCase.intent,
        tags: tags || existingTestCase.tags
      },
      `${user.display_name || user.username} updated test case: ${name}`
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Test case updated successfully',
        data: updatedTestCase
      })
    };

  } catch (error) {
    console.error('Update Test Case Error:', error);
    
    return {
      statusCode: error.message.includes('Permission denied') ? 403 : 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }

  // Helper method to generate default BDD steps based on intent
  generateDefaultBDDSteps(intent) {
    const intentStepTemplates = {
      'regression': [
        { type: 'given', text: 'the application is in a stable state', formatted: 'Given the application is in a stable state' },
        { type: 'when', text: 'I execute the regression test scenario', formatted: 'When I execute the regression test scenario' },
        { type: 'then', text: 'all functionality should work as expected', formatted: 'Then all functionality should work as expected' }
      ],
      'smoke': [
        { type: 'given', text: 'the application is deployed', formatted: 'Given the application is deployed' },
        { type: 'when', text: 'I perform basic smoke tests', formatted: 'When I perform basic smoke tests' },
        { type: 'then', text: 'core functionality should be accessible', formatted: 'Then core functionality should be accessible' }
      ],
      'e2e': [
        { type: 'given', text: 'I am on the application homepage', formatted: 'Given I am on the application homepage' },
        { type: 'when', text: 'I complete the end-to-end user journey', formatted: 'When I complete the end-to-end user journey' },
        { type: 'then', text: 'the workflow should complete successfully', formatted: 'Then the workflow should complete successfully' }
      ],
      'api': [
        { type: 'given', text: 'the API endpoints are available', formatted: 'Given the API endpoints are available' },
        { type: 'when', text: 'I make API requests', formatted: 'When I make API requests' },
        { type: 'then', text: 'I should receive valid responses', formatted: 'Then I should receive valid responses' }
      ],
      'ui': [
        { type: 'given', text: 'I am on the target page', formatted: 'Given I am on the target page' },
        { type: 'when', text: 'I interact with UI elements', formatted: 'When I interact with UI elements' },
        { type: 'then', text: 'the UI should respond correctly', formatted: 'Then the UI should respond correctly' }
      ],
      'performance': [
        { type: 'given', text: 'the system is under normal load', formatted: 'Given the system is under normal load' },
        { type: 'when', text: 'I execute performance tests', formatted: 'When I execute performance tests' },
        { type: 'then', text: 'response times should meet requirements', formatted: 'Then response times should meet requirements' }
      ],
      'custom': [
        { type: 'given', text: 'the preconditions are met', formatted: 'Given the preconditions are met' },
        { type: 'when', text: 'I perform the test action', formatted: 'When I perform the test action' },
        { type: 'then', text: 'the expected result should occur', formatted: 'Then the expected result should occur' }
      ]
    };
    
    return intentStepTemplates[intent] || intentStepTemplates['custom'];
  }
};