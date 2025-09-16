import React, { useMemo } from 'react'
import { useQA } from '../contexts/QAContext'

function Analytics() {
  const { state, actions } = useQA()

  // Calculate analytics data
  const analytics = useMemo(() => {
    const prs = state.prs
    const timeRange = state.filters.analytics.timeRange

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
      topPerformers
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
          <h1 className="text-2xl font-bold text-gray-900">QA Analytics</h1>
          <p className="text-gray-600">Insights into QA testing performance and efficiency</p>
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
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total PRs</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalPRs}</p>
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
              <p className="text-2xl font-semibold text-green-600">{analytics.formattedAvgPureQATime}</p>
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
              <p className="text-2xl font-semibold text-orange-600">{analytics.formattedAvgTotalTime}</p>
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
              <p className="text-2xl font-semibold text-red-600">{analytics.formattedAvgBlockedTime}</p>
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
              <p className="text-2xl font-semibold text-yellow-600">{analytics.avgBlockedPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* PR Completion Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Longest Running PRs</h2>
          
          {analytics.longestInProgressPR ? (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900">{analytics.longestInProgressPR.prName}</p>
                    <p className="text-sm text-red-600">Developer: {analytics.longestInProgressPR.developer}</p>
                    <p className="text-sm text-red-600">Status: {analytics.longestInProgressPR.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">{analytics.longestInProgressPR.formattedDuration}</p>
                    <p className="text-xs text-red-500">In progress</p>
                  </div>
                </div>
              </div>
              
              {analytics.inProgressTimes.slice(1, 4).map((pr, index) => (
                <div key={pr.prId} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pr.prName}</p>
                    <p className="text-xs text-gray-500">{pr.developer} • {pr.status}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{pr.formattedDuration}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No PRs in progress</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Completion Records</h2>
          
          {analytics.longestTotalPR ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-yellow-900">Longest Completed</p>
                    <p className="text-sm text-yellow-700">{analytics.longestCompletedPR.prName}</p>
                    <p className="text-xs text-yellow-600">{analytics.longestCompletedPR.developer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-yellow-600">{analytics.longestCompletedPR.formattedDuration}</p>
                  </div>
                </div>
              </div>
              
              {analytics.fastestCompletedPR && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-900">Fastest Completed</p>
                      <p className="text-sm text-green-700">{analytics.fastestCompletedPR.prName}</p>
                      <p className="text-xs text-green-600">{analytics.fastestCompletedPR.developer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">{analytics.fastestPureQAPR.formattedPureQATime}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Average Completion</p>
                    <p className="text-sm text-blue-700">Based on {analytics.completedPRsCount} completed PRs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">{analytics.formattedAvgPureQATime}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No completed PRs in selected timeframe</p>
            </div>
          )}
        </div>
      </div>

      {/* Developer Performance */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">QA Team Performance (Pure Testing Time)</h2>
        
        {analytics.topPerformers.length > 0 ? (
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


      {/* PR Activity Trend */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">PR Activity Trend</h2>
        
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
  )
}

export default Analytics