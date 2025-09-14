# QA Test Tracking Portal

A comprehensive QA test tracking system with automated test case extraction, BDD support, and real-time team collaboration.

## Features

- **PR Management**: Track pull requests with automated test case assignment
- **BDD Test Cases**: Create and manage test cases using Given/When/Then format
- **Test Assignment**: Assign tests to team members with workload management
- **Progress Tracking**: Real-time test execution progress and status updates
- **Issue Escalation**: Handle blocking issues with escalation workflows
- **Trace Integration**: Extract test cases from Playwright trace files
- **Activity Logging**: Complete audit trail of all system activities
- **Role-Based Access**: User permissions based on roles and teams

## Architecture

- **Frontend**: Vanilla HTML/CSS/JavaScript (hosted on GitHub Pages)
- **Backend**: Netlify Serverless Functions
- **Data Storage**: JSON files in GitHub repository
- **Authentication**: GitHub API integration

## Setup Instructions

### 1. Repository Setup
```bash
git clone <your-repo>
cd qa-tracking-portal
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your GitHub credentials
```

### 3. GitHub Token Setup
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Create a token with these permissions:
   - `repo` (full repository access)
   - `user:read` (read user data)
3. Add token to your `.env` file

### 4. Deploy to Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `echo 'Static site'`
3. Set publish directory: `.` (root)
4. Add environment variables from `.env` to Netlify dashboard

### 5. GitHub Pages Setup
1. Enable GitHub Pages in repository settings
2. Set source to main branch
3. Your site will be available at: `https://<username>.github.io/<repo-name>`

## API Endpoints

### Data Retrieval
- `GET /api/get-data?dataType=prs` - Get all PRs
- `GET /api/get-data?dataType=test-cases` - Get test cases
- `GET /api/get-data?dataType=users` - Get users (filtered by role)

### PR Management
- `POST /api/create-pr` - Create new PR
- `PUT /api/merge-pr` - Approve/merge/reject PR

### Test Management
- `POST /api/add-test-case` - Create test case with BDD steps
- `POST /api/assign-test` - Assign test to user
- `PUT /api/update-test-progress` - Update test execution status

### File Upload
- `POST /api/upload-traces` - Upload Playwright traces and extract test cases

### Issue Management
- `PUT /api/escalate-issue` - Escalate blocking issues

## Usage

### Creating Test Cases
```javascript
// BDD format with Given/When/Then steps
const testCase = {
  name: "User Login Validation",
  tags: ["@regression", "@login", "@ui"],
  intent: "regression",
  bddSteps: [
    { type: "given", text: "user is on login page" },
    { type: "when", text: "user enters valid credentials" },
    { type: "then", text: "user should be logged in successfully" }
  ]
};
```

### Test Assignment
```javascript
// Assign test with validation of user capacity
const assignment = {
  testCaseId: "tc_001",
  prId: "pr_001", 
  assignedTo: "john_qa",
  dueDate: "2024-01-15T10:00:00Z",
  priority: "high"
};
```

### Progress Updates
```javascript
// Update test execution progress
const update = {
  assignmentId: "assign_001",
  action: "complete", // start, update_progress, complete, fail, block
  progress: 100,
  testResult: {
    status: "passed",
    duration: 1500,
    notes: "All assertions passed"
  }
};
```

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| QA Engineer | Execute tests, create test cases, update progress |
| Senior QA Engineer | All QA + assign tests, escalate issues |
| Developer | Create PRs, view assigned tests |
| Senior Developer | All Developer + approve PRs |
| Admin | Full system access |

## Data Structure

The system uses JSON files for data persistence:

- `data/prs.json` - Pull request tracking
- `data/test-cases.json` - Test case definitions with BDD steps
- `data/test-assignments.json` - Test assignment and progress tracking
- `data/test-results.json` - Test execution results
- `data/users.json` - User management and permissions
- `data/issues.json` - Issue tracking and escalation
- `data/activity.json` - System activity audit log
- `data/sessions.json` - User session management
- `data/settings.json` - Application configuration

## Development

### Local Development
```bash
npm run dev  # Start Netlify dev server
```

### Testing Functions Locally
```bash
netlify functions:invoke create-pr --payload '{"name":"Test PR","developer":"john"}'
```

### Deployment
```bash
npm run deploy  # Deploy to Netlify
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.