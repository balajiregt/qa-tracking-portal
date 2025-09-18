# 🪝 QA Portal Webhook Setup Guide

## Overview

The QA Portal sends real-time webhook notifications to external systems when important events occur. This allows you to integrate with CI/CD pipelines, monitoring systems, dashboards, and custom applications.

## 🎯 **Available Events**

| Event | Description | When Triggered |
|-------|-------------|----------------|
| `pr.created` | New PR added to portal | Manual creation or GitHub sync |
| `pr.updated` | PR details modified | Edit PR information |
| `pr.status_changed` | PR status transitions | Status changes in TDD workflow |
| `qa.tests_merged` | QA tests merged to main | TDD fail-first step |
| `dev.pr_merged` | Dev code merged | TDD completion step |
| `test_case.created` | New test case added | Test case creation |
| `test_case.updated` | Test case modified | Test case edits |
| `test.result_changed` | Test results updated | Pass/fail status changes |
| `pr.blocked` | PR marked as blocked | Blocking issues identified |
| `pr.unblocked` | PR unblocked | Issues resolved |

## 📋 **Webhook Payload Structure**

All webhooks send POST requests with the following structure:

```json
{
  "event": "qa.tests_merged",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "qa-tracking-portal",
  "data": {
    "pr_id": "pr_1705311000123",
    "pr_name": "Add user authentication",
    "developer": "john_doe",
    "priority": "high",
    "qa_tests_merged_at": "2025-01-15T10:30:00.000Z",
    "test_count": 5,
    "branch": "feature/user-auth"
  }
}
```

## 🛠️ **Setting Up Webhook Endpoints**

### **1. Create Webhook Endpoint**

Choose your platform and create an endpoint:

#### **Node.js/Express Example:**
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhooks/qa-portal', (req, res) => {
  const { event, timestamp, data } = req.body;
  
  console.log(`QA Portal Event: ${event}`, data);
  
  // Handle different events
  switch (event) {
    case 'qa.tests_merged':
      handleQATestsMerged(data);
      break;
    case 'dev.pr_merged':
      handleDevPRMerged(data);
      break;
    case 'pr.status_changed':
      handleStatusChange(data);
      break;
    default:
      console.log('Unhandled event:', event);
  }
  
  res.status(200).json({ received: true });
});

function handleQATestsMerged(data) {
  // Trigger CI/CD pipeline for dev code merge
  console.log(`QA tests merged for ${data.pr_name}, ready for dev merge`);
  
  // Example: Trigger Jenkins job
  // triggerJenkinsJob('dev-merge-pipeline', data);
}

app.listen(3001, () => {
  console.log('Webhook server running on port 3001');
});
```

#### **Python/Flask Example:**
```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/webhooks/qa-portal', methods=['POST'])
def handle_qa_webhook():
    payload = request.get_json()
    event = payload.get('event')
    data = payload.get('data')
    
    print(f"QA Portal Event: {event}", data)
    
    if event == 'qa.tests_merged':
        handle_qa_tests_merged(data)
    elif event == 'dev.pr_merged':
        handle_dev_pr_merged(data)
    elif event == 'pr.status_changed':
        handle_status_change(data)
    
    return jsonify({'received': True})

def handle_qa_tests_merged(data):
    # Notify dev team or trigger automation
    print(f"QA tests merged for {data['pr_name']}")
    
    # Example: Send to Slack, trigger CI/CD, update dashboard
    send_to_slack(f"🧪 QA tests merged for PR: {data['pr_name']}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001)
```

### **2. Configure in QA Portal**

1. Go to **Settings → Webhook Notifications**
2. Click **➕ Add Webhook**
3. Fill in details:
   - **Name**: Development Server
   - **URL**: `https://your-server.com/webhooks/qa-portal`
   - **Events**: Select events you want to receive
   - **Status**: Enabled

### **3. Test Your Webhook**

1. Click **🧪 Test** button next to your webhook
2. Check your server logs for the test payload
3. Verify the endpoint responds with 200 OK

## 🔄 **Integration Examples**

### **CI/CD Integration**
```javascript
// Auto-trigger pipelines based on TDD workflow
function handleQATestsMerged(data) {
  // QA tests merged → Notify dev to merge code
  triggerSlackNotification({
    channel: '#dev-team',
    message: `🧪 QA tests merged for ${data.pr_name}. Ready for dev merge!`,
    pr_details: data
  });
}

function handleDevPRMerged(data) {
  // Dev code merged → Trigger deployment pipeline
  triggerDeploymentPipeline({
    environment: 'staging',
    pr_id: data.pr_id,
    branch: data.branch
  });
}
```

### **Dashboard Integration**
```javascript
// Update external dashboards with QA metrics
function handleStatusChange(data) {
  updateDashboard({
    metric: 'pr_status_change',
    pr_id: data.pr_id,
    old_status: data.old_status,
    new_status: data.new_status,
    timestamp: data.changed_at
  });
}
```

### **Monitoring & Alerts**
```javascript
// Set up alerts for blocked PRs
function handlePRBlocked(data) {
  sendAlert({
    type: 'pr_blocked',
    severity: data.priority === 'critical' ? 'high' : 'medium',
    message: `PR ${data.pr_name} is blocked`,
    assignee: data.developer
  });
}
```

## 🔐 **Security Best Practices**

### **1. Validate Webhook Source**
```javascript
// Add custom headers for verification
app.post('/webhooks/qa-portal', (req, res) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent || !userAgent.includes('QA-Portal-Webhook')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Process webhook...
});
```

### **2. Use HTTPS**
Always use HTTPS endpoints for webhook URLs:
- ✅ `https://your-server.com/webhooks/qa-portal`
- ❌ `http://your-server.com/webhooks/qa-portal`

### **3. Add Authentication**
```javascript
// Example: Simple token-based auth
app.post('/webhooks/qa-portal', (req, res) => {
  const authToken = req.get('Authorization');
  
  if (authToken !== 'Bearer your-secret-token') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Process webhook...
});
```

## 📊 **Monitoring Webhook Delivery**

### **1. Log All Webhooks**
```javascript
app.post('/webhooks/qa-portal', (req, res) => {
  const { event, timestamp, data } = req.body;
  
  // Log webhook received
  console.log(JSON.stringify({
    received_at: new Date().toISOString(),
    event,
    source_timestamp: timestamp,
    pr_id: data.pr_id
  }));
  
  // Process webhook...
  res.status(200).json({ received: true });
});
```

### **2. Handle Failures Gracefully**
```javascript
app.post('/webhooks/qa-portal', async (req, res) => {
  try {
    await processWebhook(req.body);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    // Still respond with 200 to prevent retries for permanent failures
    res.status(200).json({ 
      received: true, 
      error: 'Processing failed but acknowledged' 
    });
  }
});
```

## 🚀 **Testing with Webhook.site**

For quick testing without setting up a server:

1. Go to [webhook.site](https://webhook.site)
2. Copy the unique URL provided
3. Add it as a webhook in QA Portal
4. Trigger events and see real payloads

## 💡 **Common Use Cases**

1. **DevOps Automation**: Trigger deployment pipelines on `dev.pr_merged`
2. **Team Notifications**: Send Slack/Teams messages on `qa.tests_merged`
3. **Metrics Collection**: Track TDD cycle times and success rates
4. **Quality Gates**: Block deployments if tests fail
5. **Dashboard Updates**: Real-time status updates on external dashboards
6. **Audit Logging**: Compliance tracking for QA processes

## 🔧 **Troubleshooting**

### **Webhook Not Receiving Events**
1. Check webhook URL is accessible
2. Verify events are selected in configuration
3. Check webhook is enabled
4. Review server logs for errors

### **Events Not Triggering**
1. Ensure actions are performed in QA Portal
2. Check webhook configuration matches expected events
3. Verify webhook endpoint responds with 200 OK

### **Payload Issues**
1. Check `Content-Type: application/json` header
2. Verify JSON parsing in your endpoint
3. Log raw request body for debugging

---

**🎯 Ready to integrate?** Start with the webhook.site test, then build your production endpoint using the examples above!