import React, { useState } from 'react'
import { useQA } from '../contexts/QAContext'

function UploadTraces() {
  const { state, actions } = useQA()
  const [formData, setFormData] = useState({
    prId: '',
    intent: 'e2e',
    tags: '',
    notes: ''
  })
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const intentOptions = [
    { value: 'regression', label: 'Regression', description: 'Tests to ensure existing functionality still works' },
    { value: 'e2e', label: 'End-to-End', description: 'Complete user journey tests' },
    { value: 'smoke', label: 'Smoke', description: 'Basic functionality verification' },
    { value: 'api', label: 'API', description: 'Backend API endpoint tests' },
    { value: 'ui', label: 'UI', description: 'User interface component tests' },
    { value: 'performance', label: 'Performance', description: 'Load and performance tests' }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const traceFiles = files.filter(file => 
      file.name.endsWith('.zip') || 
      file.name.endsWith('.json') || 
      file.name.includes('trace')
    )
    
    setSelectedFiles(traceFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })))
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.prId) {
      actions.showNotification('Please select a PR', 'error')
      return
    }
    
    if (selectedFiles.length === 0) {
      actions.showNotification('Please select trace files to upload', 'error')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Prepare upload data
      const uploadData = {
        prId: formData.prId,
        intent: formData.intent,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        notes: formData.notes,
        traceFiles: selectedFiles.map(f => ({
          name: f.name,
          filename: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified,
          // In a real implementation, you'd upload the actual file content
          content: `trace_data_${Date.now()}` // Simulated content
        }))
      }

      // Call the upload traces API
      const result = await actions.uploadTraces(uploadData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      // Reset form
      setFormData({
        prId: '',
        intent: 'e2e',
        tags: '',
        notes: ''
      })
      setSelectedFiles([])

    } catch (error) {
      console.error('Upload error:', error)
      actions.showNotification('Failed to upload trace files', 'error')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Playwright Traces</h1>
        <p className="text-gray-600">Upload trace files to automatically extract test cases and results</p>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PR Selection *
              </label>
              <select
                name="prId"
                required
                className="select"
                value={formData.prId}
                onChange={handleInputChange}
              >
                <option value="">Select a PR</option>
                {state.prs.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {pr.title} ({pr.branch || 'feature'} → {pr.baseBranch || 'main'})
                  </option>
                ))}
              </select>
              {state.prs.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No PRs available. Create a PR first to upload traces.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Intent *
              </label>
              <select
                name="intent"
                className="select"
                value={formData.intent}
                onChange={handleInputChange}
              >
                {intentOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intent Description
            </label>
            <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
              {intentOptions.find(opt => opt.value === formData.intent)?.description}
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              className="input"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="login, authentication, critical (comma-separated)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add tags to categorize and filter test cases extracted from traces
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              className="textarea"
              rows={3}
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about this test run..."
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trace Files</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="space-y-2">
              <span className="text-4xl">📁</span>
              <div>
                <label htmlFor="trace-upload" className="cursor-pointer">
                  <span className="text-primary-600 hover:text-primary-500 font-medium">
                    Click to upload
                  </span>
                  <span className="text-gray-500"> or drag and drop</span>
                </label>
                <input
                  id="trace-upload"
                  type="file"
                  multiple
                  accept=".zip,.json,.har"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-gray-500">
                Playwright trace files (.zip), JSON reports, or HAR files
              </p>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {selectedFiles.map((fileInfo, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {fileInfo.name.endsWith('.zip') ? '🗜️' :
                         fileInfo.name.endsWith('.json') ? '📄' : '📁'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{fileInfo.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(fileInfo.size)} • 
                          {new Date(fileInfo.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-danger-600 hover:text-danger-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploading...</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {uploadProgress < 50 ? 'Uploading files...' :
                 uploadProgress < 90 ? 'Processing traces...' :
                 'Extracting test cases...'}
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setFormData({
                prId: '',
                intent: 'e2e',
                tags: '',
                notes: ''
              })
              setSelectedFiles([])
            }}
            className="btn btn-secondary"
            disabled={uploading}
          >
            Clear Form
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || !formData.prId || selectedFiles.length === 0}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
          </button>
        </div>
      </form>

      {/* Upload History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h2>
        
        <div className="text-center py-8">
          <span className="text-4xl">🎬</span>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No uploads yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload your first Playwright trace files to get started
          </p>
        </div>
      </div>

      {/* Help Section */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-2">💡 How to Generate Playwright Traces</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1. Enable tracing in your Playwright config:</strong></p>
          <pre className="bg-blue-100 p-2 rounded text-xs font-mono">
{`use: {
  trace: 'on-first-retry',
  // or 'retain-on-failure'
}`}
          </pre>
          
          <p><strong>2. Or enable in your test:</strong></p>
          <pre className="bg-blue-100 p-2 rounded text-xs font-mono">
{`await context.tracing.start({ screenshots: true, snapshots: true });
// ... your test code ...
await context.tracing.stop({ path: 'trace.zip' });`}
          </pre>
          
          <p><strong>3. Upload the generated trace files</strong> to automatically extract test cases and results</p>
        </div>
      </div>
    </div>
  )
}

export default UploadTraces