# QA Tracking Portal

A modern QA test tracking system with PR-centric workflow, advanced analytics, and real-time collaboration designed for agile development teams.

## 🎯 Unique Value Proposition

**The only QA platform designed for modern development workflows - where QA testing integrates seamlessly with PR lifecycle**

## ✨ Key Features

### PR-Centric QA Workflow
- **Pull Request Integration**: Native PR tracking with automated test case association
- **Status Synchronization**: Real-time PR status updates based on test completion
- **Developer-QA Bridge**: Seamless handoff from development to QA testing
- **Environment Management**: Multi-environment support (dev, staging, production)

### Advanced Analytics & Insights
- **Time-Based Analytics**: Pure QA time vs. blocked time tracking
- **Performance Metrics**: Team efficiency, completion rates, and blocking analysis
- **Trend Analysis**: PR activity trends and completion patterns
- **Custom Dashboards**: Real-time insights into QA performance

### BDD Test Management
- **Given/When/Then Format**: Full BDD support with structured test steps
- **Tag-Based Organization**: Flexible test categorization (@regression, @smoke, @e2e)
- **Intent Classification**: Test types (regression, smoke, integration, e2e)
- **Custom Test Cases**: User-generated test cases with full BDD formatting

### Team Collaboration
- **Real-time Updates**: Live progress tracking and status notifications
- **Test Assignment**: Intelligent test distribution and workload management
- **Issue Tracking**: Blocking issue escalation with detailed tracking
- **Activity Logging**: Complete audit trail of all QA activities

### Integration & Automation
- **Playwright Trace Integration**: Extract test cases from trace files automatically
- **GitHub Integration**: Deep integration with GitHub workflow and API
- **Failing Tests Dashboard**: Centralized view of all failing tests across PRs
- **Quick Actions**: Fast access to frequently used QA operations

## 🏗️ Architecture

- **Frontend**: React 18 with Vite, Tailwind CSS, React Router
- **Backend**: Netlify Serverless Functions (Node.js)
- **Data Storage**: JSON files in GitHub repository with automated backup
- **Authentication**: GitHub API integration with user session management
- **Deployment**: Netlify hosting with continuous deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- GitHub account with repository access
- Netlify account (for deployment)

### 1. Repository Setup
```bash
git clone https://github.com/your-username/qa-tracking-portal.git
cd qa-tracking-portal
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
VITE_GITHUB_TOKEN=your_github_personal_access_token
VITE_GITHUB_REPO=your-username/qa-tracking-portal
VITE_GITHUB_OWNER=your-username
```

### 3. GitHub Token Setup
1. Go to GitHub Settings → Developer settings → Personal access tokens (classic)
2. Generate new token with these permissions:
   - `repo` (Full control of private repositories)
   - `user:read` (Read user profile data)
   - `workflow` (Update GitHub Action workflows)
3. Add token to your `.env` file as `VITE_GITHUB_TOKEN`

### 4. Local Development
```bash
# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### 5. Deploy to Netlify
```bash
# Build the project
npm run build

# Deploy to Netlify
npm run deploy

# Or connect GitHub repo to Netlify for auto-deployment
# Build command: npm run build
# Publish directory: dist
```

## 🔌 API Endpoints

### Core Data Operations
```javascript
// Batch data loading
GET /.netlify/functions/batchDataLoad
Response: { prs: [...], testCases: [...], users: [...], activity: [...] }

// Get current user profile
GET /.netlify/functions/getCurrentUser
Response: { id, name, email, role, permissions }
```

### PR Management
```javascript
// Create new PR with test case association
POST /.netlify/functions/createPR
Body: {
  name: "feature/new-functionality",
  developer: "john_dev",
  description: "Add new feature",
  priority: "medium",
  environment: "staging"
}

// Update PR status and progress
PUT /.netlify/functions/updatePR
Body: {
  id: "pr_001",
  status: "testing|blocked|ready",
  progress: 75,
  blocked_reason: "API dependency issue"
}
```

### Test Case Management
```javascript
// Create BDD test case
POST /.netlify/functions/addTestCase
Body: {
  name: "User Login Flow",
  description: "Validate complete login process",
  tags: ["@regression", "@auth"],
  intent: "regression",
  bdd_steps: [
    { type: "given", text: "user is on login page" },
    { type: "when", text: "user enters valid credentials" },
    { type: "then", text: "user should be logged in" }
  ]
}

// Associate test case with PR
PUT /.netlify/functions/associateTestCase
Body: {
  prId: "pr_001",
  testCaseId: "tc_001",
  localResult: "Pass|Fail|Pending",
  mainResult: "Pass|Fail|Pending"
}
```

### File Upload & Processing
```javascript
// Upload and extract test cases from Playwright traces
POST /.netlify/functions/uploadTraces
Body: FormData with trace files
Response: { extracted_test_cases: [...], processing_summary: {...} }
```

## 📋 User Guide

### Dashboard Overview
The main dashboard provides:
- **Active PRs**: Current pull requests in testing
- **Quick Actions**: Fast access to Analytics, Failing Tests, Create PR, Add Test Case
- **PR Status Cards**: Visual status indicators with progress tracking
- **Test Association**: Direct test case management from PR view

### PR-Centric Workflow
1. **Create PR**: Add new pull request with developer and environment info
2. **Associate Tests**: Add relevant test cases to PR (built-in or custom)
3. **Execute Tests**: Run tests on both local branch and main branch
4. **Track Progress**: Monitor completion percentages and blocking issues
5. **Complete QA**: Mark tests as passed/failed, update PR status to ready

### Test Case Management
```javascript
// Create custom BDD test case
{
  name: "User Registration Flow",
  description: "Complete user signup process",
  tags: ["@regression", "@user", "@e2e"],
  intent: "regression",
  type: "functional",
  priority: "high",
  bdd_steps: [
    { type: "given", text: "user is on registration page" },
    { type: "when", text: "user fills out registration form" },
    { type: "and", text: "clicks submit button" },
    { type: "then", text: "user account should be created" }
  ]
}
```

### Analytics & Insights
- **Time Tracking**: Pure QA time vs blocked time analysis
- **Performance Metrics**: Team efficiency and completion rates  
- **Trend Analysis**: Historical PR activity and patterns
- **Completion Records**: Longest cycles, fastest completions, most blocked PRs
- **Team Performance**: Developer-specific QA metrics

### Quick Actions
- **Analytics**: View detailed QA performance metrics
- **Failing Tests**: See all failed tests across PRs with context
- **Create PR**: Add new pull request for QA tracking
- **Add Test Case**: Create custom BDD test cases

## 👥 User Roles & Capabilities

| Role | Capabilities |
|------|-------------|
| **QA Engineer** | Execute tests, update test results, create custom test cases, view analytics |
| **QA Lead** | All QA Engineer + assign tests, manage QA workflow, escalate blocking issues |
| **Developer** | Create PRs, view test results, update PR status, collaborate on test failures |
| **Tech Lead** | All Developer + approve PRs, manage team assignments, oversee QA process |
| **Admin** | Full system access, user management, system configuration, data management |

## 🗂️ Data Architecture

The system uses GitHub-backed JSON storage for reliability and version control:

### Core Data Files
- **`data/prs.json`** - PR tracking with test associations, status, and analytics
- **`data/test-cases.json`** - BDD test definitions with tags and metadata  
- **`data/users.json`** - User profiles, roles, and authentication data
- **`data/activity.json`** - Complete audit trail of system activities
- **`data/settings.json`** - Application configuration and preferences

### Data Flow
```
GitHub Repository (Source of Truth)
    ↓
Netlify Functions (API Layer)  
    ↓
React Frontend (State Management)
    ↓
User Interface (Real-time Updates)
```

## 🛠️ Development

### Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Backend**: Netlify Functions (Node.js serverless)
- **Data**: GitHub API + JSON file storage
- **Deployment**: Netlify with auto-deployment from GitHub
- **Development**: Vite dev server with hot module replacement

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start with Netlify functions
npm run netlify-dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables
```bash
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
VITE_GITHUB_REPO=username/qa-tracking-portal  
VITE_GITHUB_OWNER=username
VITE_API_BASE_URL=/.netlify/functions
```

### Project Structure
```
qa-tracking-portal/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React Context providers
│   ├── pages/          # Route components
│   ├── utils/          # Helper functions and API client
│   └── App.jsx         # Main application component
├── netlify/functions/  # Serverless API endpoints
├── data/              # JSON data files
└── public/            # Static assets
```
**Built with ❤️ for modern QA teams**

*Transform your development workflow with PR-centric QA tracking that actually works.*