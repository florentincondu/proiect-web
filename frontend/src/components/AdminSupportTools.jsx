import React, { useState, useEffect } from 'react';
import { FaEnvelope, FaFileAlt, FaTools, FaSearch, FaDownload, FaExclamationTriangle, FaReply, FaTimes } from 'react-icons/fa';
import axios from 'axios';

const AdminSupportTools = () => {

  const [activeTab, setActiveTab] = useState('contacts');
  const [contactSubmissions, setContactSubmissions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [completionTime, setCompletionTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isToggling, setIsToggling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [showResponseModal, setShowResponseModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchContactSubmissions();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'maintenance') {
      fetchMaintenanceStatus();
    }
  }, [activeTab]);


  const fetchContactSubmissions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || '';
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/contact-submissions`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          },
          params: {
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            search: searchTerm || undefined
          }
        }
      );
      setContactSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching contact submissions:', error);
      setError(error.response?.data?.message || 'Failed to fetch contact submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || '';
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/system-logs`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error.response?.data?.message || 'Failed to fetch system logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMaintenanceStatus = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || '';
      
      console.log('Fetching maintenance status');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/maintenance-status`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Maintenance status response:', response.data);
      setMaintenanceMode(response.data.maintenanceMode);
      setMaintenanceMessage(response.data.message || '');
      
      if (response.data.completionTime) {
        // Convert to local datetime-local format
        const date = new Date(response.data.completionTime);
        const localDatetime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
          .toISOString()
          .slice(0, 16);
        setCompletionTime(localDatetime);
      } else {
        setCompletionTime('');
      }
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
      setError(error.response?.data?.message || 'Failed to fetch maintenance status');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    setIsToggling(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token') || '';
      
      console.log('Toggling maintenance mode, current state:', maintenanceMode);
      console.log('Using API URL:', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/maintenance-mode`);
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/maintenance-mode`,
        { 
          enabled: !maintenanceMode,
          message: maintenanceMessage,
          completionTime: completionTime ? new Date(completionTime).toISOString() : null
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Maintenance mode toggle response:', response.data);
      setMaintenanceMode(response.data.maintenanceMode);
      setSuccess(`Maintenance mode ${response.data.maintenanceMode ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      setError(error.response?.data?.message || 'Failed to toggle maintenance mode. Please check your connection and try again.');
    } finally {
      setIsToggling(false);
    }
  };

  const respondToSubmission = async () => {
    if (!selectedSubmission || !responseText.trim()) {
      setError('Please select a submission and enter a response');
      return;
    }

    setIsSendingResponse(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token') || '';
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/contact-submissions/${selectedSubmission._id}/respond`,
        { response: responseText },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Update submission in the list
      setContactSubmissions(prevSubmissions => 
        prevSubmissions.map(sub => 
          sub._id === selectedSubmission._id ? response.data.submission : sub
        )
      );
      
      setSuccess('Response sent successfully to ' + selectedSubmission.email);
      setShowResponseModal(false);
      setResponseText('');
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error sending response:', error);
      setError(error.response?.data?.message || 'Failed to send response');
    } finally {
      setIsSendingResponse(false);
    }
  };

  const downloadLogs = () => {

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    

    const link = document.createElement('a');
    link.href = url;
    link.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const filteredSubmissions = contactSubmissions.filter(submission => {
    const matchesSearch = searchTerm === '' || 
                          submission.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          submission.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          submission.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          submission.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || submission.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getStatusClass = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-100';
      case 'reviewing': return 'bg-purple-500/20 text-purple-100';
      case 'responded': return 'bg-green-500/20 text-green-100';
      case 'closed': return 'bg-gray-500/20 text-gray-100';
      default: return 'bg-gray-500/20 text-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'new': return 'New';
      case 'reviewing': return 'Reviewing';
      case 'responded': return 'Responded';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getLogLevelClass = (level) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const saveMaintenanceCustomization = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token') || '';
      
      console.log('Saving maintenance customization with message:', maintenanceMessage);
      console.log('Completion time:', completionTime);
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/maintenance-customization`,
        { 
          message: maintenanceMessage,
          completionTime: completionTime ? new Date(completionTime).toISOString() : null
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Maintenance customization saved:', response.data);
      setSuccess('Maintenance customization saved successfully');
    } catch (error) {
      console.error('Error saving maintenance customization:', error);
      setError(error.response?.data?.message || 'Failed to save maintenance customization');
    } finally {
      setIsSaving(false);
    }
  };

  const openResponseModal = (submission) => {
    setSelectedSubmission(submission);
    setResponseText('');
    setShowResponseModal(true);
  };

  const closeResponseModal = () => {
    setShowResponseModal(false);
    setSelectedSubmission(null);
    setResponseText('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">
          Support Tools
          <span className="text-blue-500 ml-2">Dashboard</span>
        </h1>

        {/* Notification messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-100 p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {/* Navigation tabs */}
        <div className="flex flex-wrap overflow-x-auto border-b border-gray-700 mb-6">
          <button
            className={`px-4 sm:px-6 py-3 font-medium flex items-center whitespace-nowrap ${
              activeTab === 'contacts' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('contacts')}
          >
            <FaEnvelope className="mr-2" /> Contact Submissions
          </button>
          <button
            className={`px-4 sm:px-6 py-3 font-medium flex items-center whitespace-nowrap ${
              activeTab === 'logs' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            <FaFileAlt className="mr-2" /> System Logs
          </button>
          <button
            className={`px-4 sm:px-6 py-3 font-medium flex items-center whitespace-nowrap ${
              activeTab === 'maintenance' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('maintenance')}
          >
            <FaTools className="mr-2" /> Maintenance Mode
          </button>
        </div>

        {/* Content area */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
          {/* Contact Submissions Tab */}
          {activeTab === 'contacts' && (
            <div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
                <h2 className="text-xl font-semibold flex items-center">
                  <FaEnvelope className="mr-2 text-blue-400" /> Contact Form Submissions
                </h2>
                
                <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-3 w-full lg:w-auto">
                  {/* Search filter */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search submissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-700 rounded-md w-full"
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  </div>
                  
                  {/* Status filter */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="py-2 px-3 bg-gray-700 rounded-md w-full lg:w-auto"
                  >
                    <option value="all">All Statuses</option>
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="responded">Responded</option>
                    <option value="closed">Closed</option>
                  </select>
                  
                  {/* Refresh button */}
                  <button
                    onClick={fetchContactSubmissions}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredSubmissions.length > 0 ? (
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr className="bg-gray-700/50 text-left">
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Date</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Name</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Email</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Subject</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Status</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.map((submission) => (
                          <tr key={submission._id} className="border-t border-gray-700 hover:bg-gray-700/30">
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-400">
                              {new Date(submission.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-sm">{submission.name}</td>
                            <td className="px-3 sm:px-4 py-3 text-sm">{submission.email}</td>
                            <td className="px-3 sm:px-4 py-3 text-sm">{submission.subject}</td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(submission.status)}`}>
                                {getStatusText(submission.status)}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <button
                                onClick={() => openResponseModal(submission)}
                                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center"
                                disabled={submission.status === 'responded'}
                              >
                                <FaReply className="mr-1" /> Respond
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>No contact submissions found</p>
                </div>
              )}
            </div>
          )}

          {/* System Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
                <h2 className="text-xl font-semibold flex items-center">
                  <FaFileAlt className="mr-2 text-blue-400" /> System Logs
                </h2>
                
                <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-3 w-full lg:w-auto">
                  {/* Search filter */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-700 rounded-md w-full"
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  </div>
                  
                  {/* Download button */}
                  <button
                    onClick={downloadLogs}
                    disabled={isLoading || logs.length === 0}
                    className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaDownload className="mr-2" /> Download Logs
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredLogs.length > 0 ? (
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr className="bg-gray-700/50 text-left">
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Time</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Level</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Source</th>
                          <th className="px-3 sm:px-4 py-3 font-medium text-sm">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log, index) => (
                          <tr key={index} className="border-t border-gray-700 hover:bg-gray-700/30">
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className={`font-medium text-xs sm:text-sm ${getLogLevelClass(log.level)}`}>
                                {log.level.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm">{log.source}</td>
                            <td className="px-3 sm:px-4 py-3 font-mono text-xs sm:text-sm">
                              {log.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>No system logs found</p>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Mode Tab */}
          {activeTab === 'maintenance' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <FaTools className="mr-2 text-blue-400" /> Maintenance Mode
                </h2>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="bg-gray-700/30 rounded-lg p-4 sm:p-6">
                  <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
                    <div className={`text-6xl mb-4 ${maintenanceMode ? 'text-yellow-400' : 'text-green-400'}`}>
                      <FaExclamationTriangle className={maintenanceMode ? 'block' : 'hidden'} />
                      <FaTools className={!maintenanceMode ? 'block' : 'hidden'} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                      {maintenanceMode ? 'Maintenance Mode is ACTIVE' : 'Maintenance Mode is OFF'}
                    </h3>
                    <p className="text-gray-400 max-w-lg mb-6">
                      {maintenanceMode 
                        ? 'Your website is currently in maintenance mode. Only administrators can access the site.'
                        : 'Your website is currently accessible to all users.'}
                    </p>
                    
                    {maintenanceMode && maintenanceMessage && (
                      <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 sm:p-6 max-w-lg w-full mb-6">
                        <h4 className="font-semibold mb-2 text-blue-200">Current Maintenance Notice</h4>
                        <p className="text-white mb-3">{maintenanceMessage}</p>
                        {completionTime && (
                          <p className="text-blue-200 font-medium">
                            Expected return: {new Date(completionTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-lg w-full mb-6">
                      <h4 className="font-semibold mb-2">What happens in maintenance mode?</h4>
                      <ul className="text-gray-400 text-left text-sm space-y-2">
                        <li>• Regular users will see a maintenance page</li>
                        <li>• All booking functionality will be disabled</li>
                        <li>• Administrators can still access the admin panel</li>
                        <li>• API endpoints will return 503 Service Unavailable</li>
                      </ul>
                    </div>
                    
                    <button
                      onClick={toggleMaintenanceMode}
                      disabled={isToggling}
                      className={`w-full md:w-auto py-3 px-6 rounded-md font-medium flex items-center justify-center transition-colors ${
                        maintenanceMode
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isToggling ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Processing...
                        </>
                      ) : maintenanceMode ? (
                        'Disable Maintenance Mode'
                      ) : (
                        'Enable Maintenance Mode'
                      )}
                    </button>
                  </div>
                  
                  {/* Customization Options */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-medium mb-4">Maintenance Page Customization</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Maintenance Message
                        </label>
                        <textarea
                          className="w-full bg-gray-700 rounded p-3 text-sm text-white"
                          rows="3"
                          placeholder="We are currently performing scheduled maintenance. Please check back later."
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                        ></textarea>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Estimated Completion Time
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full bg-gray-700 rounded p-3 text-sm text-white"
                          value={completionTime}
                          onChange={(e) => setCompletionTime(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 text-right">
                      <button
                        onClick={saveMaintenanceCustomization}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm disabled:opacity-50 flex items-center ml-auto"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          'Save Customization'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-700 p-4">
              <h3 className="text-xl font-semibold">Respond to Contact Submission</h3>
              <button 
                onClick={closeResponseModal}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4 bg-gray-700/30 rounded-lg p-3">
                <h4 className="font-medium text-blue-300 mb-2">Submission Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-400">From:</span> {selectedSubmission.name}
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span> {selectedSubmission.email}
                  </div>
                  <div>
                    <span className="text-gray-400">Date:</span> {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-400">Subject:</span> {selectedSubmission.subject}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-gray-400">Message:</span>
                  <div className="bg-gray-800 p-3 rounded mt-1 whitespace-pre-wrap">{selectedSubmission.message}</div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Your Response
                </label>
                <textarea
                  className="w-full bg-gray-700 rounded p-3 text-white min-h-[150px]"
                  placeholder="Enter your response to this contact submission..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={closeResponseModal}
                  className="px-4 py-2 text-gray-400 hover:text-white mr-3"
                >
                  Cancel
                </button>
                <button
                  onClick={respondToSubmission}
                  disabled={isSendingResponse || !responseText.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingResponse ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaReply className="mr-2" /> Send Response
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupportTools;