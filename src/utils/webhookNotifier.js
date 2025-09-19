/**
 * Webhook Notification System for QA Portal
 * Sends events to external systems when portal actions occur
 */

class WebhookNotifier {
  constructor() {
    this.webhooks = []
    this.loadWebhooks()
  }

  // Load webhook configurations from settings
  loadWebhooks() {
    try {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}')
      this.webhooks = settings.webhooks || []
    } catch (error) {
      console.error('Failed to load webhook settings:', error)
      this.webhooks = []
    }
  }

  // Add a webhook endpoint
  addWebhook(webhook) {
    this.webhooks.push({
      id: Date.now().toString(),
      ...webhook,
      createdAt: new Date().toISOString()
    })
    this.saveWebhooks()
  }

  // Remove a webhook
  removeWebhook(id) {
    this.webhooks = this.webhooks.filter(w => w.id !== id)
    this.saveWebhooks()
  }

  // Save webhooks to settings
  saveWebhooks() {
    try {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}')
      settings.webhooks = this.webhooks
      localStorage.setItem('settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save webhook settings:', error)
    }
  }

  // Send notification to all active webhooks
  async notify(event, data) {
    const activeWebhooks = this.webhooks.filter(w => w.enabled && w.events.includes(event))
    
    if (activeWebhooks.length === 0) {
      console.log(`No active webhooks for event: ${event}`)
      return
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      source: 'qa-tracking-portal',
      data
    }

    // Send to all active webhooks
    const promises = activeWebhooks.map(webhook => this.sendWebhook(webhook, payload))
    const results = await Promise.allSettled(promises)
    
    // Log results
    results.forEach((result, index) => {
      const webhook = activeWebhooks[index]
      if (result.status === 'fulfilled') {
        console.log(`Webhook sent successfully to ${webhook.name}`)
      } else {
        console.error(`Webhook failed for ${webhook.name}:`, result.reason)
      }
    })

    return results
  }

  // Send individual webhook
  async sendWebhook(webhook, payload) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'QA-Portal-Webhook/1.0',
          ...(webhook.headers || {})
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return { success: true, webhook: webhook.name }
    } catch (error) {
      console.error(`Webhook delivery failed for ${webhook.name}:`, error)
      throw error
    }
  }

  // Test a webhook endpoint
  async testWebhook(webhook) {
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      source: 'qa-tracking-portal',
      data: {
        message: 'This is a test webhook from QA Portal',
        webhook_name: webhook.name,
        test_id: Date.now()
      }
    }

    try {
      await this.sendWebhook(webhook, testPayload)
      return { success: true, message: 'Test webhook sent successfully' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// Available webhook events
export const WEBHOOK_EVENTS = {
  PR_CREATED: 'pr.created',
  PR_UPDATED: 'pr.updated', 
  PR_STATUS_CHANGED: 'pr.status_changed',
  QA_TESTS_MERGED: 'qa.tests_merged',
  DEV_PR_MERGED: 'dev.pr_merged',
  TEST_CASE_CREATED: 'test_case.created',
  TEST_CASE_UPDATED: 'test_case.updated',
  TEST_RESULT_CHANGED: 'test.result_changed',
  TEST_FAILED: 'test.failed',
  PR_BLOCKED: 'pr.blocked',
  PR_UNBLOCKED: 'pr.unblocked'
}

// Create singleton instance
const webhookNotifier = new WebhookNotifier()

export default webhookNotifier

// Helper functions for common notifications
export const notifyPRCreated = (pr) => {
  return webhookNotifier.notify(WEBHOOK_EVENTS.PR_CREATED, {
    pr_id: pr.id,
    pr_name: pr.name,
    developer: pr.developer,
    priority: pr.priority,
    status: pr.status,
    created_at: pr.created_at
  })
}

export const notifyQATestsMerged = (pr) => {
  return webhookNotifier.notify(WEBHOOK_EVENTS.QA_TESTS_MERGED, {
    pr_id: pr.id,
    pr_name: pr.name,
    developer: pr.developer,
    priority: pr.priority,
    qa_tests_merged_at: pr.qaTestsMergedAt,
    test_count: pr.associatedTestCases?.length || 0,
    branch: pr.branch_comparison?.feature_branch?.name || pr.name
  })
}

export const notifyDevPRMerged = (pr) => {
  return webhookNotifier.notify(WEBHOOK_EVENTS.DEV_PR_MERGED, {
    pr_id: pr.id,
    pr_name: pr.name,
    developer: pr.developer,
    priority: pr.priority,
    dev_pr_merged_at: pr.devPRMergedAt,
    qa_tests_merged_at: pr.qaTestsMergedAt,
    cycle_duration: pr.devPRMergedAt && pr.qaTestsMergedAt ? 
      new Date(pr.devPRMergedAt) - new Date(pr.qaTestsMergedAt) : null,
    test_count: pr.associatedTestCases?.length || 0
  })
}

export const notifyPRStatusChanged = (pr, oldStatus, newStatus) => {
  return webhookNotifier.notify(WEBHOOK_EVENTS.PR_STATUS_CHANGED, {
    pr_id: pr.id,
    pr_name: pr.name,
    developer: pr.developer,
    old_status: oldStatus,
    new_status: newStatus,
    changed_at: new Date().toISOString()
  })
}

export const notifyTestFailed = (pr, failedTests) => {
  return webhookNotifier.notify(WEBHOOK_EVENTS.TEST_FAILED, {
    pr_id: pr.id,
    pr_name: pr.name,
    developer: pr.developer,
    branch: pr.branch_comparison?.feature_branch?.name || pr.branch || pr.name,
    failed_tests: failedTests.map(test => ({
      id: test.id,
      name: test.name || test.intent,
      intent: test.intent,
      tags: test.tags,
      source: test.source,
      previous_result: test.previousResult,
      current_result: test.localResult
    })),
    failed_count: failedTests.length,
    total_tests: pr.associatedTestCases?.length || 0,
    failure_detected_at: new Date().toISOString()
  })
}