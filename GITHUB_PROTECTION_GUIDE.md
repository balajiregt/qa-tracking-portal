# GitHub Branch Protection Rules Setup Guide

## 🛡️ **Why Use Branch Protection?**

Branch protection rules ensure code quality and enforce your TDD workflow by:
- Preventing direct pushes to main/master
- Requiring PR reviews before merging
- Enforcing status checks (tests, CI/CD)
- Supporting your fail-first TDD methodology

## 🔧 **Setting Up Branch Protection Rules**

### **Step 1: Access Repository Settings**
1. Go to your GitHub repository
2. Click **Settings** tab
3. Navigate to **Branches** in the left sidebar

### **Step 2: Add Branch Protection Rule**
1. Click **Add rule** button
2. Enter branch name pattern: `main` (or `master`)

### **Step 3: Configure Protection Rules**

#### **✅ Essential Rules for TDD Workflow:**

**A. Require Pull Request Reviews**
- ☑️ **Require a pull request before merging**
- ☑️ **Require approvals**: Set to `1` (minimum)
- ☑️ **Require review from code owners** (if you have CODEOWNERS file)
- ☑️ **Dismiss stale reviews when new commits are pushed**

**B. Require Status Checks**
- ☑️ **Require status checks to pass before merging**
- ☑️ **Require branches to be up to date before merging**
- Add specific status checks:
  - `continuous-integration` (if using CI/CD)
  - `qa-tests-passed` (custom check)
  - `build` (if you have build process)

**C. Enforce Restrictions**
- ☑️ **Restrict pushes that create files** (optional)
- ☑️ **Restrict force pushes**
- ☑️ **Require signed commits** (recommended for security)

**D. Rules for Administrators**
- ☑️ **Include administrators** (apply rules to admin users too)

#### **🧪 TDD-Specific Recommendations:**

**E. Custom Status Checks for TDD**
- Set up GitHub Actions or webhooks that check:
  - QA tests exist for the PR
  - Tests fail on main branch (fail-first verification)
  - Code coverage meets requirements
  - PR has proper TDD labels

## ⚙️ **Advanced Configuration**

### **Required Status Checks Setup**

Create a `.github/workflows/tdd-checks.yml` file:

```yaml
name: TDD Workflow Checks

on:
  pull_request:
    branches: [ main ]

jobs:
  qa-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check QA Tests Exist
        run: |
          # Check if PR has associated test files
          if [ -z "$(find . -name "*test*" -o -name "*spec*")" ]; then
            echo "❌ No test files found in PR"
            exit 1
          fi
          echo "✅ Test files found"
      
      - name: Validate TDD Labels
        uses: actions/github-script@v6
        with:
          script: |
            const labels = context.payload.pull_request.labels.map(l => l.name);
            const tddLabels = ['tdd-ready', 'qa-approved', 'tests-added'];
            const hasTddLabel = tddLabels.some(label => labels.includes(label));
            
            if (!hasTddLabel) {
              core.setFailed('PR must have TDD workflow label');
            }

  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
```

### **Branch Naming Conventions**

Enforce branch naming with additional rules:
- `feature/*` - New features
- `bugfix/*` - Bug fixes  
- `qa/*` - QA test branches
- `hotfix/*` - Emergency fixes

### **CODEOWNERS File**

Create `.github/CODEOWNERS`:
```
# Global code owners
* @qa-team @senior-developers

# QA-specific files
*test* @qa-team
*spec* @qa-team
*.test.js @qa-team

# Critical files require additional review
package.json @senior-developers @qa-team
Dockerfile @devops-team @senior-developers
```

## 🎯 **TDD Workflow Integration**

### **Recommended Labels for PRs:**
- `tdd-ready` - PR is ready for TDD workflow
- `qa-tests-added` - QA has added test cases
- `tests-failing` - Tests are failing as expected (fail-first)
- `qa-approved` - QA has approved the PR
- `ready-to-merge` - All TDD steps completed

### **Webhook Integration**

Set up webhooks to sync with your QA portal:
```json
{
  "url": "https://your-qa-portal.netlify.app/.netlify/functions/github-webhook",
  "content_type": "json",
  "events": [
    "pull_request",
    "push",
    "pull_request_review"
  ]
}
```

## 🚀 **Testing Your Protection Rules**

1. **Create a test PR** targeting main branch
2. **Try to merge without review** - Should be blocked
3. **Add required status checks** - Should enforce them
4. **Test with QA team member** - Should require their approval

## 📊 **Monitoring & Compliance**

- Use GitHub Insights to track compliance
- Set up notifications for protection rule violations
- Regular audits of merge history
- Monitor bypass attempts by administrators

## 🔗 **Integration with QA Portal**

Your QA tracking portal can integrate with these protection rules by:
- Automatically updating PR status based on GitHub checks
- Creating required status checks via GitHub API
- Syncing protection rule compliance with TDD workflow
- Reporting on rule violations and bypasses

---

**💡 Tip**: Start with basic rules and gradually add more as your team adapts to the workflow!