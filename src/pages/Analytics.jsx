import React, { useMemo } from 'react'
import { useQA } from '../contexts/QAContext'

function Analytics() {
  const { state, actions } = useQA()

  // Determine workflow type
  const isEnvironmentBased = state.project?.workflowType === 'environment_based'

  // Calculate analytics data based on workflow type
  const analytics = useMemo(() => {
    try {
      const timeRange = state.filters?.analytics?.timeRange || 30
      
      if (isEnvironmentBased) {
        // Environment-based analytics using JIRA tickets
        return calculateEnvironmentAnalytics(timeRange)
      } else {
        // PR-based analytics (existing logic)
        return calculatePRAnalytics(timeRange)
      }
    } catch (error) {
      console.error('Analytics calculation error:', error)
      return getDefaultAnalytics()
    }
  }, [state.testCases, state.prs, state.filters?.analytics?.timeRange, isEnvironmentBased])

  // Environment-based analytics calculation
  function calculateEnvironmentAnalytics(timeRange) {
    const jiraTickets = JSON.parse(localStorage.getItem('jiraTickets') || '[]')
      .filter(ticket => ticket.projectName === state.project?.name)
    
    // Filter by time range
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - timeRange)
    
    const recentTickets = jiraTickets.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt)
      return ticketDate >= cutoffDate
    })

    // Helper functions for environment analytics
    const calculateTicketDuration = (ticket) => {
      const start = new Date(ticket.createdAt)
      const end = new Date()
      return Math.round((end - start) / (1000 * 60 * 60)) // hours
    }

    const getEnvironmentTestProgress = (tickets) => {
      const envProgress = {}
      state.project.environments.forEach(env => {
        envProgress[env] = {
          total: 0,
          passed: 0,
          failed: 0,
          pending: 0
        }
      })

      tickets.forEach(ticket => {
        Object.keys(ticket.testProgress || {}).forEach(env => {
          if (envProgress[env]) {
            const progress = ticket.testProgress[env]
            envProgress[env].total += progress.total || 0
            envProgress[env].passed += progress.passed || 0
            envProgress[env].failed += progress.failed || 0
            envProgress[env].pending += progress.pending || 0
          }
        })
      })

      return envProgress
    }

    const environmentProgress = getEnvironmentTestProgress(recentTickets)
    const totalTickets = recentTickets.length
    const completedTickets = recentTickets.filter(t => 
      Object.values(t.testProgress || {}).some(env => env.status === 'Completed')
    ).length
    const blockedTickets = recentTickets.filter(t => t.status === 'Blocked').length

    // Calculate average times
    const ticketDurations = recentTickets.map(calculateTicketDuration)
    const avgTicketTime = ticketDurations.length > 0 
      ? Math.round(ticketDurations.reduce((sum, time) => sum + time, 0) / ticketDurations.length)
      : 0

    const formatDuration = (hours) => {
      if (hours < 24) return `${hours}h`
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
    }

    // Find longest running ticket
    const longestTicket = recentTickets.length > 0 
      ? recentTickets.reduce((longest, current) => 
          calculateTicketDuration(current) > calculateTicketDuration(longest) ? current : longest
        )
      : null

    return {
      workflowType: 'environment',
      totalItems: totalTickets,
      completedItems: completedTickets,
      blockedItems: blockedTickets,
      inProgressItems: totalTickets - completedItems - blockedTickets,
      avgProcessingTime: avgTicketTime,
      formattedAvgProcessingTime: formatDuration(avgTicketTime),
      environmentProgress,
      longestRunningItem: longestTicket ? {
        id: longestTicket.id,
        title: longestTicket.title,
        duration: calculateTicketDuration(longestTicket),
        formattedDuration: formatDuration(calculateTicketDuration(longestTicket)),
        assignee: longestTicket.assignee,
        status: longestTicket.status
      } : null,
      tickets: recentTickets
    }
  }

  // PR-based analytics calculation (existing logic)
  function calculatePRAnalytics(timeRange) {
    const prs = state.prs || []
    
    // Filter data based on time range
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - timeRange)

    const recentPRs = prs.filter(pr => {
      const prDate = new Date(pr.created_at || pr.createdAt)
      return prDate >= cutoffDate
    })

    // Helper function to calculate duration in hours
    const calculateDurationHours = (startDate, endDate = new Date()) => {
      const start = new Date(startDate)
      const end = new Date(endDate)
      return Math.round((end - start) / (1000 * 60 * 60))
    }

    // Helper function to estimate blocked time (simplified)
    const estimateBlockedTime = (pr) => {
      // If currently blocked, assume it's been blocked for a portion of total time
      if (pr.status === 'blocked') {
        const totalTime = calculateDurationHours(pr.created_at)
        // Assume blocked for last 25% of time (can be improved with actual status history)
        return Math.round(totalTime * 0.25)
      }
      // For completed PRs, estimate based on priority and complexity
      if (pr.status === 'ready') {
        const totalTime = calculateDurationHours(pr.created_at, pr.updated_at)
        // High priority PRs likely had fewer blocks, low priority more
        const blockFactor = pr.priority === 'high' ? 0.1 : pr.priority === 'medium' ? 0.15 : 0.2
        return Math.round(totalTime * blockFactor)
      }
      return 0
    }

    // Helper function to calculate pure QA testing time
    const calculatePureQATime = (pr) => {
      const totalTime = pr.status === 'ready' 
        ? calculateDurationHours(pr.created_at, pr.updated_at)
        : calculateDurationHours(pr.created_at)
      const blockedTime = estimateBlockedTime(pr)
      return Math.max(0, totalTime - blockedTime)
    }

    // Helper function to format duration
    const formatDuration = (hours) => {
      if (hours < 24) return `${hours}h`
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
    }

    // Calculate PR completion times
    const completedPRs = recentPRs.filter(pr => pr.status === 'ready')
    const inProgressPRs = recentPRs.filter(pr => ['new', 'testing', 'blocked'].includes(pr.status))
    
    const completionTimes = completedPRs.map(pr => {
      const totalDuration = calculateDurationHours(pr.created_at, pr.updated_at)
      const blockedTime = estimateBlockedTime(pr)
      const pureQATime = calculatePureQATime(pr)
      return {
        prId: pr.id,
        prName: pr.name,
        totalDuration,
        pureQATime,
        blockedTime,
        formattedTotalDuration: formatDuration(totalDuration),
        formattedPureQATime: formatDuration(pureQATime),
        formattedBlockedTime: formatDuration(blockedTime),
        blockedPercentage: totalDuration > 0 ? Math.round((blockedTime / totalDuration) * 100) : 0,
        developer: pr.developer
      }
    })

    const inProgressTimes = inProgressPRs.map(pr => {
      const totalDuration = calculateDurationHours(pr.created_at)
      const blockedTime = estimateBlockedTime(pr)
      const pureQATime = calculatePureQATime(pr)
      return {
        prId: pr.id,
        prName: pr.name,
        totalDuration,
        pureQATime,
        blockedTime,
        formattedTotalDuration: formatDuration(totalDuration),
        formattedPureQATime: formatDuration(pureQATime),
        formattedBlockedTime: formatDuration(blockedTime),
        blockedPercentage: totalDuration > 0 ? Math.round((blockedTime / totalDuration) * 100) : 0,
        developer: pr.developer,
        status: pr.status
      }
    })

    // PR time statistics
    const totalPRs = recentPRs.length
    const completedPRsCount = completedPRs.length
    const blockedPRsCount = recentPRs.filter(pr => pr.status === 'blocked').length
    
    // Calculate averages from all PRs (both completed and in-progress)
    const allPRTimes = [...completionTimes, ...inProgressTimes]
    
    const avgTotalTime = allPRTimes.length > 0 
      ? Math.round(allPRTimes.reduce((sum, pr) => sum + pr.totalDuration, 0) / allPRTimes.length)
      : 0
    
    const avgPureQATime = allPRTimes.length > 0 
      ? Math.round(allPRTimes.reduce((sum, pr) => sum + pr.pureQATime, 0) / allPRTimes.length)
      : 0
    
    const avgBlockedTime = allPRTimes.length > 0 
      ? Math.round(allPRTimes.reduce((sum, pr) => sum + pr.blockedTime, 0) / allPRTimes.length)
      : 0
    
    const avgBlockedPercentage = allPRTimes.length > 0 
      ? Math.round(allPRTimes.reduce((sum, pr) => sum + pr.blockedPercentage, 0) / allPRTimes.length)
      : 0
    
    // Find extremes from all PRs
    const longestTotalPR = allPRTimes.length > 0 
      ? allPRTimes.reduce((longest, current) => 
          current.totalDuration > longest.totalDuration ? current : longest
        )
      : null
    
    const longestPureQAPR = allPRTimes.length > 0 
      ? allPRTimes.reduce((longest, current) => 
          current.pureQATime > longest.pureQATime ? current : longest
        )
      : null
    
    const fastestPureQAPR = completionTimes.length > 0 
      ? completionTimes.reduce((fastest, current) => 
          current.pureQATime < fastest.pureQATime ? current : fastest
        )
      : null

    const longestInProgressPR = inProgressTimes.length > 0 
      ? inProgressTimes.reduce((longest, current) => 
          current.totalDuration > longest.totalDuration ? current : longest
        )
      : null
    
    const mostBlockedPR = allPRTimes.length > 0 
      ? allPRTimes.reduce((mostBlocked, current) => 
          current.blockedPercentage > mostBlocked.blockedPercentage ? current : mostBlocked
        )
      : null

    // PR completion trend over time
    const trendData = []
    for (let i = timeRange; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const dayPRs = recentPRs.filter(pr => {
        const prDate = new Date(pr.created_at)
        return prDate.toDateString() === date.toDateString()
      })
      
      const dayCompletions = recentPRs.filter(pr => {
        const completionDate = new Date(pr.updated_at)
        return pr.status === 'ready' && completionDate.toDateString() === date.toDateString()
      })
      
      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: dayPRs.length,
        completed: dayCompletions.length
      })
    }

    // Developer performance
    const developerStats = {}
    completedPRs.forEach(pr => {
      const developer = pr.developer
      if (!developerStats[developer]) {
        developerStats[developer] = {
          completed: 0,
          totalTime: 0,
          pureQATime: 0,
          blockedTime: 0
        }
      }
      const totalTime = calculateDurationHours(pr.created_at, pr.updated_at)
      const pureQATime = calculatePureQATime(pr)
      const blockedTime = estimateBlockedTime(pr)
      
      developerStats[developer].completed++
      developerStats[developer].totalTime += totalTime
      developerStats[developer].pureQATime = (developerStats[developer].pureQATime || 0) + pureQATime
      developerStats[developer].blockedTime = (developerStats[developer].blockedTime || 0) + blockedTime
      
      developerStats[developer].avgTotalTime = Math.round(developerStats[developer].totalTime / developerStats[developer].completed)
      developerStats[developer].avgPureQATime = Math.round(developerStats[developer].pureQATime / developerStats[developer].completed)
      developerStats[developer].avgBlockedTime = Math.round(developerStats[developer].blockedTime / developerStats[developer].completed)
    })

    const topPerformers = Object.entries(developerStats)
      .sort(([,a], [,b]) => a.avgPureQATime - b.avgPureQATime)
      .slice(0, 5)
      .map(([developer, stats]) => ({
        developer,
        ...stats,
        formattedAvgTotalTime: formatDuration(stats.avgTotalTime),
        formattedAvgPureQATime: formatDuration(stats.avgPureQATime),
        formattedAvgBlockedTime: formatDuration(stats.avgBlockedTime),
        blockedPercentage: stats.avgTotalTime > 0 ? Math.round((stats.avgBlockedTime / stats.avgTotalTime) * 100) : 0
      }))

    return {
      totalPRs,
      completedPRsCount,
      blockedPRsCount,
      inProgressCount: inProgressPRs.length,
      avgTotalTime,
      avgPureQATime,
      avgBlockedTime,
      avgBlockedPercentage,
      formattedAvgTotalTime: formatDuration(avgTotalTime),
      formattedAvgPureQATime: formatDuration(avgPureQATime),
      formattedAvgBlockedTime: formatDuration(avgBlockedTime),
      longestTotalPR,
      longestPureQAPR,
      fastestPureQAPR,
      mostBlockedPR,
      longestInProgressPR,
      completionTimes,
      inProgressTimes,
      trendData,
      topPerformers,
      workflowType: 'pr'
    }
  }

  // Default analytics structure
  function getDefaultAnalytics() {
    return {
      workflowType: isEnvironmentBased ? 'environment' : 'pr',
      totalItems: 0,
      completedItems: 0,
      blockedItems: 0,
      inProgressItems: 0,
      avgProcessingTime: 0,
      formattedAvgProcessingTime: '0h',
      environmentProgress: {},
      longestRunningItem: null,
      tickets: [],
      // PR-specific fallbacks
      totalPRs: 0,
      completedPRsCount: 0,
      blockedPRsCount: 0,
      avgTotalTime: 0,
      avgPureQATime: 0,
      avgBlockedTime: 0,
      avgBlockedPercentage: 0,
      formattedAvgTotalTime: '0h',
      formattedAvgPureQATime: '0h',
      formattedAvgBlockedTime: '0h',
      longestTotalPR: null,
      longestPureQAPR: null,
      fastestPureQAPR: null,
      mostBlockedPR: null,
      longestInProgressPR: null,
      completionTimes: [],
      inProgressTimes: [],
      trendData: [],
      topPerformers: []
    }
  }

  const handleTimeRangeChange = (range) => {
    actions.updateFilters('analytics', { timeRange: parseInt(range) })
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="card p-6 text-center">
        <span className="text-4xl mb-4 block">⚠️</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Error</h3>
        <p className="text-gray-500 mb-4">{state.error}</p>
        <button 
          onClick={() => actions.clearError()}
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QA Analytics</h1>
          <p className="text-gray-600">
            {isEnvironmentBased 
              ? 'Environment-based testing insights and JIRA ticket metrics' 
              : 'PR-centric testing performance and efficiency insights'
            }
          </p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {isEnvironmentBased ? (
          // Environment-based metrics
          <>
            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <span className="text-2xl">🎫</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.totalItems}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-semibold text-green-600">{analytics.completedItems}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-semibold text-orange-600">{analytics.inProgressItems}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-danger-100 rounded-lg">
                  <span className="text-2xl">🚫</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Blocked</p>
                  <p className="text-2xl font-semibold text-red-600">{analytics.blockedItems}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">⏱️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Processing</p>
                  <p className="text-2xl font-semibold text-blue-600">{analytics.formattedAvgProcessingTime}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // PR-based metrics (original)
          <>
            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total PRs</p>
                  <p className="text-2xl font-semibold text-gray-900">{analytics.totalPRs || 0}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pure QA Time</p>
                  <p className="text-2xl font-semibold text-green-600">{analytics.formattedAvgPureQATime || 'NaNd'}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <span className="text-2xl">⏱️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cycle Time</p>
                  <p className="text-2xl font-semibold text-orange-600">{analytics.formattedAvgTotalTime || 'NaNd'}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">🔄</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Blocked Time</p>
                  <p className="text-2xl font-semibold text-red-600">{analytics.formattedAvgBlockedTime || '0h'}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Blocked %</p>
                  <p className="text-2xl font-semibold text-yellow-600">{analytics.avgBlockedPercentage || 0}%</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Environment/PR Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isEnvironmentBased ? 'Longest Running Tickets' : 'Longest Running PRs'}
          </h2>
          
          {isEnvironmentBased ? (
            analytics.longestRunningItem ? (
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900">{analytics.longestRunningItem.id}</p>
                      <p className="text-sm text-red-600 max-w-xs truncate">{analytics.longestRunningItem.title}</p>
                      <p className="text-sm text-red-600">Assignee: {analytics.longestRunningItem.assignee || 'Unassigned'}</p>
                      <p className="text-sm text-red-600">Status: {analytics.longestRunningItem.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{analytics.longestRunningItem.formattedDuration}</p>
                      <p className="text-sm text-red-500">in progress</p>
                    </div>
                  </div>
                </div>
                
                {analytics.tickets?.slice(1, 4).map((ticket, index) => (
                  <div key={ticket.id || index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.id}</p>
                      <p className="text-xs text-gray-500">{ticket.assignee || 'Unassigned'} • {ticket.status}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-600">
                        {Math.round((new Date() - new Date(ticket.createdAt)) / (1000 * 60 * 60))}h
                      </span>
                    </div>
                  </div>
                )) || []}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No tickets in progress</p>
              </div>
            )
          ) : (
            analytics.longestInProgressPR ? (
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-900">{analytics.longestInProgressPR.prName || 'Unknown PR'}</p>
                      <p className="text-sm text-red-600">Developer: {analytics.longestInProgressPR.developer || 'Unknown'}</p>
                      <p className="text-sm text-red-600">Status: {analytics.longestInProgressPR.status || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-red-600">{analytics.longestInProgressPR.formattedTotalDuration || '0h'}</p>
                        <p className="text-sm text-red-500">({analytics.longestInProgressPR.formattedPureQATime || '0h'} QA)</p>
                        <p className="text-xs text-red-400">{analytics.longestInProgressPR.blockedPercentage || 0}% blocked</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {analytics.inProgressTimes?.slice(1, 4).map((pr, index) => (
                  <div key={pr.prId || index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pr.prName || 'Unknown PR'}</p>
                      <p className="text-xs text-gray-500">{pr.developer || 'Unknown'} • {pr.status || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-600">{pr.formattedTotalDuration || '0h'}</span>
                      <p className="text-xs text-gray-400">({pr.formattedPureQATime || '0h'} QA)</p>
                    </div>
                  </div>
                )) || []}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No PRs in progress</p>
              </div>
            )
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isEnvironmentBased ? 'Environment Test Progress' : 'Completion Records'}
          </h2>
          
          {isEnvironmentBased ? (
            Object.keys(analytics.environmentProgress || {}).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(analytics.environmentProgress).map(([env, progress]) => (
                  <div key={env} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 capitalize">{env} Environment</h3>
                      <span className="text-sm text-gray-600">
                        {progress.total} total tests
                      </span>
                    </div>
                    
                    {progress.total > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div className="flex h-3 rounded-full overflow-hidden">
                              <div 
                                className="bg-green-500" 
                                style={{ width: `${(progress.passed / progress.total) * 100}%` }}
                              ></div>
                              <div 
                                className="bg-red-500" 
                                style={{ width: `${(progress.failed / progress.total) * 100}%` }}
                              ></div>
                              <div 
                                className="bg-yellow-500" 
                                style={{ width: `${(progress.pending / progress.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {Math.round((progress.passed / progress.total) * 100)}%
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 bg-green-100 rounded">
                            <p className="font-medium text-green-800">{progress.passed}</p>
                            <p className="text-green-600">Passed</p>
                          </div>
                          <div className="text-center p-2 bg-red-100 rounded">
                            <p className="font-medium text-red-800">{progress.failed}</p>
                            <p className="text-red-600">Failed</p>
                          </div>
                          <div className="text-center p-2 bg-yellow-100 rounded">
                            <p className="font-medium text-yellow-800">{progress.pending}</p>
                            <p className="text-yellow-600">Pending</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">No tests configured</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl">🏢</span>
                <p className="mt-2 text-gray-500">No environment data available</p>
                <p className="text-sm text-gray-400">Map JIRA tickets and associate test cases to see environment progress</p>
              </div>
            )
          ) : (
            analytics.longestTotalPR ? (
              <div className="space-y-4">
              {/* Time-Based Records */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-yellow-600 mr-2">🕐</span>
                      <p className="font-medium text-yellow-900">Longest Total Cycle</p>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{analytics.longestTotalPR.formattedTotalDuration}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-700">{analytics.longestTotalPR.prName}</p>
                    <p className="text-xs text-yellow-600">Developer: {analytics.longestTotalPR.developer}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
                        <span className="text-yellow-500">Pure QA: </span>
                        <span className="font-medium text-yellow-700">{analytics.longestTotalPR.formattedPureQATime}</span>
                      </div>
                      <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
                        <span className="text-yellow-500">Blocked: </span>
                        <span className="font-medium text-yellow-700">{analytics.longestTotalPR.formattedBlockedTime}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {analytics.fastestPureQAPR && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">⚡</span>
                        <p className="font-medium text-green-900">Fastest QA Completion</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">{analytics.fastestPureQAPR.formattedPureQATime}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-green-700">{analytics.fastestPureQAPR.prName}</p>
                      <p className="text-xs text-green-600">Developer: {analytics.fastestPureQAPR.developer}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
                          <span className="text-green-500">Total Time: </span>
                          <span className="font-medium text-green-700">{analytics.fastestPureQAPR.formattedTotalDuration}</span>
                        </div>
                        <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
                          <span className="text-green-500">Efficiency: </span>
                          <span className="font-medium text-green-700">{100 - analytics.fastestPureQAPR.blockedPercentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Blocking Analysis */}
              {analytics.mostBlockedPR && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-red-600 mr-2">🚫</span>
                      <div>
                        <p className="font-medium text-red-900">Most Blocked PR</p>
                        <p className="text-sm text-red-700">{analytics.mostBlockedPR.prName || 'Unknown PR'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">{analytics.mostBlockedPR.blockedPercentage || 0}%</p>
                      <p className="text-xs text-red-500">blocked time</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-white bg-opacity-50 px-2 py-1 rounded text-center">
                      <p className="text-red-500">Total Time</p>
                      <p className="font-medium text-red-700">{analytics.mostBlockedPR.formattedTotalDuration}</p>
                    </div>
                    <div className="bg-white bg-opacity-50 px-2 py-1 rounded text-center">
                      <p className="text-red-500">QA Time</p>
                      <p className="font-medium text-red-700">{analytics.mostBlockedPR.formattedPureQATime}</p>
                    </div>
                    <div className="bg-white bg-opacity-50 px-2 py-1 rounded text-center">
                      <p className="text-red-500">Blocked Time</p>
                      <p className="font-medium text-red-700">{analytics.mostBlockedPR.formattedBlockedTime || '0h'}</p>
                    </div>
                    <div className="bg-white bg-opacity-50 px-2 py-1 rounded text-center">
                      <p className="text-red-500">Developer</p>
                      <p className="font-medium text-red-700">{analytics.mostBlockedPR.developer || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Average Performance */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">📊</span>
                    <div>
                      <p className="font-medium text-blue-900">Team Average Performance</p>
                      <p className="text-sm text-blue-700">Based on {analytics.completedPRsCount} completed QA cycles</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white bg-opacity-60 p-3 rounded text-center">
                    <p className="text-blue-500 text-xs mb-1">Average QA Time</p>
                    <p className="text-xl font-bold text-blue-700">{analytics.formattedAvgPureQATime}</p>
                    <p className="text-blue-600 text-xs">per PR cycle</p>
                  </div>
                  <div className="bg-white bg-opacity-60 p-3 rounded text-center">
                    <p className="text-blue-500 text-xs mb-1">Average Total Time</p>
                    <p className="text-xl font-bold text-blue-700">{analytics.formattedAvgTotalTime}</p>
                    <p className="text-blue-600 text-xs">per PR cycle</p>
                  </div>
                  <div className="bg-white bg-opacity-60 p-3 rounded text-center">
                    <p className="text-blue-500 text-xs mb-1">Average Blocked</p>
                    <p className="text-xl font-bold text-blue-700">{analytics.avgBlockedPercentage}%</p>
                    <p className="text-blue-600 text-xs">({analytics.formattedAvgBlockedTime})</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No completed PRs in selected timeframe</p>
              </div>
            )
          )}
        </div>

      {!isEnvironmentBased && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">QA Team Performance (Pure Testing Time)</h2>
        
          {analytics.topPerformers && analytics.topPerformers.length > 0 ? (
            <div className="space-y-4">
              {analytics.topPerformers.map((developer, index) => (
                <div key={developer.developer} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full mr-3">
                      <span className="text-sm font-semibold text-primary-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{developer.developer}</p>
                      <p className="text-sm text-gray-600">{developer.completed} QA cycles completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-green-600">{developer.formattedAvgPureQATime}</p>
                      <p className="text-xs text-gray-500">pure QA time</p>
                      <p className="text-xs text-red-500">{developer.blockedPercentage}% blocked</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No completion data available</p>
            </div>
          )}
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {isEnvironmentBased ? 'Ticket Activity Trend' : 'PR Activity Trend'}
        </h2>
        
        {analytics.trendData.some(d => d.created > 0 || d.completed > 0) ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-2 text-xs text-gray-500">
              {analytics.trendData.slice(-7).map((day, index) => (
                <div key={index} className="text-center">
                  <p>{day.date}</p>
                  <div className="mt-2 flex flex-col items-center space-y-1">
                    <div className="w-8 bg-gray-200 rounded-lg overflow-hidden" style={{ height: '60px' }}>
                      {(day.created > 0 || day.completed > 0) && (
                        <div className="w-full flex flex-col justify-end h-full">
                          {day.completed > 0 && (
                            <div className="w-full bg-green-400" 
                                 style={{ height: `${(day.completed / Math.max(...analytics.trendData.map(d => Math.max(d.created, d.completed)))) * 30}px` }}>
                            </div>
                          )}
                          {day.created > 0 && (
                            <div className="w-full bg-blue-400" 
                                 style={{ height: `${(day.created / Math.max(...analytics.trendData.map(d => Math.max(d.created, d.completed)))) * 30}px` }}>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium">
                      <div className="text-blue-600">{day.created}c</div>
                      <div className="text-green-600">{day.completed}✓</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-1"></div>
                <span>Created</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-1"></div>
                <span>Completed</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No PR activity in the selected time range</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default Analytics