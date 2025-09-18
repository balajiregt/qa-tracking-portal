# QA Tracking Portal - Development Patterns

## 🎯 Project Overview
A comprehensive QA tracking portal implementing TDD (Test-Driven Development) workflows with GitHub integration, Slack notifications, and webhook system for external integrations.

## 🏗️ Architecture Patterns

### **Core Technologies**
- **Frontend**: React.js with Context API for state management
- **Backend**: Netlify Functions (serverless)
- **Integrations**: GitHub API (Octokit), Slack Webhooks, Custom Webhooks
- **Storage**: localStorage (development), External APIs (production)
- **Styling**: Tailwind CSS with custom component classes

### **File Structure Pattern**
```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Main layout with navigation
│   └── AppRouter.jsx   # Route management
├── contexts/           # Global state management
│   └── QAContext.jsx   # Main application context
├── pages/              # Page components
│   ├── Dashboard.jsx   # Main TDD workflow interface
│   ├── Settings.jsx    # Configuration and integrations
│   ├── GitHubSettings.jsx # GitHub-specific settings
│   ├── CreatePR.jsx    # Manual PR creation
│   └── Analytics.jsx   # TDD metrics and insights
├── utils/              # Utility functions
│   ├── apiClient.js    # API communication layer
│   └── webhookNotifier.js # Webhook event system
└── netlify/functions/  # Serverless backend
    ├── sync-github-prs.js # GitHub PR synchronization
    └── utils/github.js    # GitHub API utilities
```

## 🔄 Development Patterns

### **Feature Enhancement Pattern**
When adding new features:

1. **Planning Phase**
   ```javascript
   // Always start with TodoWrite
   TodoWrite([
     { content: "Analyze requirements and existing patterns", status: "pending", priority: "high" },
     { content: "Design UI/UX integration", status: "pending", priority: "medium" },
     { content: "Implement core functionality", status: "pending", priority: "high" },
     { content: "Add webhook notifications", status: "pending", priority: "medium" },
     { content: "Update settings if needed", status: "pending", priority: "low" },
     { content: "Test and deploy", status: "pending", priority: "high" }
   ])
   ```

2. **Code Conventions**
   - Use existing component patterns from Dashboard.jsx
   - Follow Context API pattern for state management
   - Add webhook notifications for relevant events
   - Use consistent CSS classes (btn, card, input, select, etc.)
   - Handle loading states and errors properly

3. **Integration Pattern**
   - Add to Settings.jsx if configuration needed
   - Create webhook events in webhookNotifier.js
   - Update apiClient.js for external APIs
   - Document in appropriate guide files

### **TDD Workflow Pattern**
The core workflow follows fail-first methodology:

```
Ready → QA Tests Merged → Fully Merged
  ↓           ↓              ↓
Tests     Tests Fail     Tests Pass
Written   (Expected)    (Success)
```

**Key Components:**
- `handleMergeQATests()` - Triggers fail-first step
- `handleMergeDevPR()` - Completes TDD cycle
- Webhook notifications at each stage
- Slack notifications for team coordination

### **Webhook Integration Pattern**
For any new feature that needs external notifications:

1. **Add Event Type**
   ```javascript
   // In webhookNotifier.js
   export const WEBHOOK_EVENTS = {
     // ... existing events
     NEW_FEATURE_EVENT: 'feature.event_name'
   }
   ```

2. **Create Notification Function**
   ```javascript
   export const notifyNewFeature = (data) => {
     return webhookNotifier.notify(WEBHOOK_EVENTS.NEW_FEATURE_EVENT, {
       feature_id: data.id,
       timestamp: new Date().toISOString(),
       // ... relevant data
     })
   }
   ```

3. **Integrate in Components**
   ```javascript
   // In relevant component
   import { notifyNewFeature } from '../utils/webhookNotifier'
   
   const handleFeatureAction = async () => {
     // ... feature logic
     await notifyNewFeature(featureData)
   }
   ```

## 🔧 Settings Integration Pattern

### **Adding New Integration**
1. **Settings.jsx Structure**
   ```javascript
   // Add to settings state
   const [settings, setSettings] = useState({
     // ... existing
     integration: {
       // ... existing
       newIntegration: {
         enabled: false,
         apiKey: '',
         endpoint: ''
       }
     }
   })
   ```

2. **UI Section Pattern**
   ```jsx
   {/* New Integration Section */}
   <div className="card p-6">
     <h2 className="text-lg font-semibold text-gray-900 mb-4">New Integration</h2>
     <div className="space-y-4">
       <div>
         <div className="flex items-center justify-between mb-2">
           <label className="block text-sm font-medium text-gray-700">
             Integration Name
           </label>
           <button className="btn btn-sm btn-primary">
             🧪 Test Connection
           </button>
         </div>
         {/* Form fields */}
       </div>
     </div>
   </div>
   ```

## 📊 Analytics Pattern

### **Adding New Metrics**
1. **Calculation Function**
   ```javascript
   // In Analytics.jsx
   const calculateNewMetric = (prs) => {
     // Metric calculation logic
     return {
       total: prs.length,
       percentage: Math.round((value / total) * 100),
       trend: 'increasing' // or 'decreasing', 'stable'
     }
   }
   ```

2. **Display Component**
   ```jsx
   <div className="card p-6">
     <h3 className="text-lg font-semibold text-gray-900 mb-4">
       📈 New Metric
     </h3>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       {/* Metric cards */}
     </div>
   </div>
   ```

## 🚀 Deployment Pattern

### **Testing and Deployment Workflow**
1. **Development Testing**
   ```bash
   npm run dev  # Test locally at localhost:5173
   ```

2. **Commit and Deploy**
   ```bash
   git add .
   git commit -m "Feature description with emoji
   
   - Detailed changes
   - Integration points
   - Testing notes
   
   🤖 Generated with Claude Code
   Co-Authored-By: Claude <noreply@anthropic.com>"
   
   git push origin main  # Auto-deploys to Netlify
   ```

3. **Production Testing**
   - Test GitHub integration with real PRs
   - Verify Slack notifications
   - Test webhook endpoints
   - Validate TDD workflow

## 🎯 Common Use Cases

### **"Add new QA tool integration"**
1. Follow Settings Integration Pattern
2. Add webhook events for tool-specific actions  
3. Create test functionality
4. Update documentation

### **"Enhance TDD workflow"**
1. Analyze current workflow in Dashboard.jsx
2. Add new status or stage if needed
3. Update webhook notifications
4. Modify Analytics calculations

### **"Add new notification type"**
1. Extend webhookNotifier.js with new events
2. Add to Settings webhook configuration
3. Update relevant action handlers
4. Test with external endpoints

## 💡 Context Keywords
When starting work, mention these keywords to activate patterns:
- **"TDD workflow"** - Follow fail-first methodology patterns
- **"Settings integration"** - Use Settings.jsx integration pattern  
- **"Webhook notification"** - Add to webhook system
- **"GitHub sync"** - Follow GitHub API patterns
- **"Analytics enhancement"** - Follow metrics calculation patterns
- **"Dashboard update"** - Follow Dashboard.jsx component patterns

## 🔗 Key Files Reference
- **Main State**: `src/contexts/QAContext.jsx`
- **TDD Workflow**: `src/pages/Dashboard.jsx` 
- **Configuration**: `src/pages/Settings.jsx`
- **Webhooks**: `src/utils/webhookNotifier.js`
- **GitHub API**: `netlify/functions/utils/github.js`
- **Styling**: Uses Tailwind with custom component classes

---

**🎯 Pattern Usage**: Reference this file when enhancing the QA portal to maintain consistency and follow established patterns.