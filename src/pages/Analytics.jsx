import React, { useMemo } from 'react'
import { useQA } from '../contexts/QAContext'

function Analytics() {
  const { state, actions } = useQA()

  // Calculate analytics data
  const analytics = useMemo(() => {
    const testCases = state.testCases
    const prs = state.prs
    const timeRange = state.filters.analytics.timeRange

    // Filter data based on time range
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - timeRange)

    const recentTestCases = testCases.filter(tc => {
      const testDate = new Date(tc.timestamp || tc.createdAt)
      return testDate >= cutoffDate
    })

    const recentPRs = prs.filter(pr => {
      const prDate = new Date(pr.createdAt)
      return prDate >= cutoffDate
    })

    // Test case statistics
    const totalTests = recentTestCases.length
    const passedTests = recentTestCases.filter(tc => tc.result === 'Pass').length
    const failedTests = recentTestCases.filter(tc => tc.result === 'Fail').length
    const pendingTests = recentTestCases.filter(tc => !tc.result || tc.result === 'Pending').length
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0

    // PR statistics
    const totalPRs = recentPRs.length
    const openPRs = recentPRs.filter(pr => pr.status === 'Open').length
    const mergedPRs = recentPRs.filter(pr => pr.status === 'Merged').length
    const closedPRs = recentPRs.filter(pr => pr.status === 'Closed').length

    // Test coverage by source
    const testsBySource = testCases.reduce((acc, tc) => {
      const source = tc.source || 'Unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    // Test results trend (mock data for visualization)
    const trendData = []
    for (let i = timeRange; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const dayTests = recentTestCases.filter(tc => {
        const testDate = new Date(tc.timestamp || tc.createdAt)
        return testDate.toDateString() === date.toDateString()
      })
      
      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        passed: dayTests.filter(tc => tc.result === 'Pass').length,
        failed: dayTests.filter(tc => tc.result === 'Fail').length,
        total: dayTests.length
      })
    }

    // Top failing tags
    const failingTests = testCases.filter(tc => tc.result === 'Fail')
    const tagStats = failingTests.reduce((acc, tc) => {
      if (tc.tags) {
        const tags = tc.tags.split(',').map(tag => tag.trim())
        tags.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1
        })
      }
      return acc
    }, {})

    const topFailingTags = Object.entries(tagStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)

    return {
      totalTests,
      passedTests,
      failedTests,
      pendingTests,
      passRate,
      totalPRs,
      openPRs,
      mergedPRs,
      closedPRs,
      testsBySource,
      trendData,
      topFailingTags
    }
  }, [state.testCases, state.prs, state.filters.analytics.timeRange])

  const handleTimeRangeChange = (range) => {
    actions.updateFilters('analytics', { timeRange: parseInt(range) })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Insights into your testing performance</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select
            className="select"
            value={state.filters.analytics.timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalTests}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pass Rate</p>
              <p className="text-2xl font-semibold text-success-600">{analytics.passRate}%</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed Tests</p>
              <p className="text-2xl font-semibold text-danger-600">{analytics.failedTests}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <span className="text-2xl">🔄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open PRs</p>
              <p className="text-2xl font-semibold text-warning-600">{analytics.openPRs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results Distribution</h2>
          
          {analytics.totalTests > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-success-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Passed</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {analytics.passedTests} ({((analytics.passedTests / analytics.totalTests) * 100).toFixed(1)}%)
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-success-500 h-2 rounded-full"
                  style={{ width: `${(analytics.passedTests / analytics.totalTests) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-danger-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Failed</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {analytics.failedTests} ({((analytics.failedTests / analytics.totalTests) * 100).toFixed(1)}%)
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-danger-500 h-2 rounded-full"
                  style={{ width: `${(analytics.failedTests / analytics.totalTests) * 100}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-warning-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {analytics.pendingTests} ({((analytics.pendingTests / analytics.totalTests) * 100).toFixed(1)}%)
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-warning-500 h-2 rounded-full"
                  style={{ width: `${(analytics.pendingTests / analytics.totalTests) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No test data available</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">PR Status Overview</h2>
          
          {analytics.totalPRs > 0 ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-warning-600">{analytics.openPRs}</p>
                <p className="text-sm text-gray-600">Open</p>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-warning-500 h-2 rounded-full"
                      style={{ width: `${(analytics.openPRs / analytics.totalPRs) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold text-success-600">{analytics.mergedPRs}</p>
                <p className="text-sm text-gray-600">Merged</p>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-success-500 h-2 rounded-full"
                      style={{ width: `${(analytics.mergedPRs / analytics.totalPRs) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-600">{analytics.closedPRs}</p>
                <p className="text-sm text-gray-600">Closed</p>
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ width: `${(analytics.closedPRs / analytics.totalPRs) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No PR data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Test Coverage by Source */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Coverage by Source</h2>
        
        {Object.keys(analytics.testsBySource).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.testsBySource).map(([source, count]) => (
              <div key={source} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-semibold text-primary-600">{count}</p>
                <p className="text-sm text-gray-600">{source}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No test coverage data available</p>
          </div>
        )}
      </div>

      {/* Top Failing Tags */}
      {analytics.topFailingTags.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Failing Tags
          </h2>
          
          <div className="space-y-3">
            {analytics.topFailingTags.map(([tag, count]) => (
              <div key={tag} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                    {tag}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">{count} failures</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-danger-500 h-2 rounded-full"
                      style={{ 
                        width: `${(count / Math.max(...analytics.topFailingTags.map(([,c]) => c))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Testing Trend */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Testing Activity Trend</h2>
        
        {analytics.trendData.some(d => d.total > 0) ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2 text-xs text-gray-500">
              {analytics.trendData.slice(-7).map((day, index) => (
                <div key={index} className="text-center">
                  <p>{day.date}</p>
                  <div className="mt-2 flex flex-col items-center space-y-1">
                    <div className="w-4 bg-gray-200 rounded-full overflow-hidden" style={{ height: '60px' }}>
                      {day.total > 0 && (
                        <div className="w-full bg-primary-400 rounded-full" 
                             style={{ height: `${(day.total / Math.max(...analytics.trendData.map(d => d.total))) * 100}%` }}>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium">{day.total}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary-400 rounded-full mr-1"></div>
                <span>Tests per day</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No testing activity in the selected time range</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics