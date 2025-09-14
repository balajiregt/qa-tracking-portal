import GitHubAPI from './utils/github.js';

export const handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
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
    github.validateUserPermission(user, 'test_create');

    // Validate required fields
    const { name, tags, bddSteps, duration, description, intent } = requestData;
    if (!name || !tags || !Array.isArray(tags) || tags.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Test case name and tags are required' })
      };
    }

    if (!bddSteps || !Array.isArray(bddSteps) || bddSteps.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'BDD steps are required' })
      };
    }

    // Validate BDD steps have required types
    const hasGiven = bddSteps.some(step => step.type === 'given');
    const hasWhen = bddSteps.some(step => step.type === 'when'); 
    const hasThen = bddSteps.some(step => step.type === 'then');
    
    if (!hasGiven || !hasWhen || !hasThen) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Test case must have at least Given, When, and Then steps' })
      };
    }

    // Read current test cases
    const { content: testData, sha } = await github.readFile('data/test-cases.json');
    
    // Create new test case object
    const newTestCase = {
      id: `tc_custom_${Date.now()}`,
      name: name,
      description: description || '',
      tags: tags,
      intent: intent || 'custom',
      type: 'functional',
      priority: 'medium',
      bdd_steps: bddSteps,
      steps: bddSteps.map(step => step.formatted),
      expected_duration: duration || 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.display_name || user.username,
      is_custom: true,
      source: 'manual'
    };

    // Add to test cases array
    testData.test_cases.push(newTestCase);
    
    // Update tags list if new tags are introduced
    tags.forEach(tag => {
      if (!testData.tags.includes(tag)) {
        testData.tags.push(tag);
      }
    });

    // Update metadata
    github.updateMetadata(testData);

    // Save to GitHub
    const commitMessage = github.generateCommitMessage(
      'Test Case Added',
      `${name} with ${bddSteps.length} BDD steps`,
      userId
    );

    await github.writeFile('data/test-cases.json', testData, commitMessage, sha);

    // Log activity
    await github.logActivity(
      'test_case_added',
      'custom_test_created', 
      user.display_name || user.username,
      {
        test_case_id: newTestCase.id,
        test_name: name,
        tags: tags,
        intent: intent,
        bdd_format: true,
        steps_count: bddSteps.length
      },
      `${user.display_name || user.username} added custom test case: ${name}`
    );

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Test case created successfully',
        data: newTestCase
      })
    };

  } catch (error) {
    console.error('Add Test Case Error:', error);
    
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
};