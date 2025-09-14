const GitHubAPI = require('./utils/github');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const github = new GitHubAPI();
    
    // Get data type from query parameters
    const { dataType, userId } = event.queryStringParameters || {};
    
    if (!dataType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'dataType parameter is required' })
      };
    }

    // Map data types to file paths
    const fileMap = {
      'prs': 'data/prs.json',
      'test-cases': 'data/test-cases.json',
      'test-results': 'data/test-results.json',
      'activity': 'data/activity.json',
      'settings': 'data/settings.json',
      'users': 'data/users.json',
      'test-assignments': 'data/test-assignments.json',
      'issues': 'data/issues.json',
      'sessions': 'data/sessions.json'
    };

    const filePath = fileMap[dataType];
    if (!filePath) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Invalid dataType: ${dataType}` })
      };
    }

    // Read data from GitHub
    const { content: data } = await github.readFile(filePath);

    // Filter sensitive data based on user role if needed
    let filteredData = data;
    if (dataType === 'users' && userId) {
      try {
        const user = await github.getCurrentUser(userId);
        // Non-admin users can only see basic user info, not sensitive details
        if (user.role !== 'admin' && user.role !== 'senior_qa_engineer') {
          filteredData = {
            ...data,
            users: data.users.map(u => ({
              id: u.id,
              username: u.username,
              display_name: u.display_name,
              role: u.role,
              team: u.team,
              specialties: u.specialties,
              status: u.status
            }))
          };
        }
      } catch (error) {
        // If user authentication fails, provide minimal data
        filteredData = {
          ...data,
          users: data.users.map(u => ({
            username: u.username,
            display_name: u.display_name,
            role: u.role
          }))
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30' // Cache for 30 seconds
      },
      body: JSON.stringify({
        success: true,
        data: filteredData,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Get Data Error:', error);
    
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch data'
      })
    };
  }
};