import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaFileAlt, FaTools, FaSearch, FaDownload, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';

const AdminSupportTools = () => {

  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isToggling, setIsToggling] = useState(false);


  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'maintenance') {
      fetchMaintenanceStatus();
    }
  }, [activeTab]);


  const fetchTickets = async () => {
    setIsLoading(true);
    setError('');
    try {

      const token = localStorage.getItem('token') || '';
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/support-tickets`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError(error.response?.data?.message || 'Failed to fetch support tickets');
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
        { enabled: !maintenanceMode },
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

  const updateTicketStatus = async (ticketId, newStatus) => {
    setIsLoading(true);
    setError('');
    try {

      const token = localStorage.getItem('token') || '';
      
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/support/admin/tickets/${ticketId}/status`,
        { status: newStatus },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setTickets(tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      ));
      setSuccess('Ticket status updated successfully');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setError(error.response?.data?.message || 'Failed to update ticket status');
    } finally {
      setIsLoading(false);
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


  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = selectedPriority === 'all' || ticket.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-100';
      case 'medium': return 'bg-yellow-500/20 text-yellow-100';
      case 'low': return 'bg-green-500/20 text-green-100';
      default: return 'bg-gray-500/20 text-gray-100';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-100';
      case 'in_progress': return 'bg-purple-500/20 text-purple-100';
      case 'resolved': return 'bg-green-500/20 text-green-100';
      case 'closed': return 'bg-gray-500/20 text-gray-100';
      default: return 'bg-gray-500/20 text-gray-100';
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
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
        <div className="flex border-b border-gray-700 mb-6">
          <button
            className={`px-6 py-3 font-medium flex items-center ${
              activeTab === 'tickets' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('tickets')}
          >
            <FaTicketAlt className="mr-2" /> Support Tickets
          </button>
          <button
            className={`px-6 py-3 font-medium flex items-center ${
              activeTab === 'logs' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            <FaFileAlt className="mr-2" /> System Logs
          </button>
          <button
            className={`px-6 py-3 font-medium flex items-center ${
              activeTab === 'maintenance' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('maintenance')}
          >
            <FaTools className="mr-2" /> Maintenance Mode
          </button>
        </div>

        {/* Content area */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          {/* Support Tickets Tab */}
          {activeTab === 'tickets' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
                <h2 className="text-xl font-semibold flex items-center">
                  <FaTicketAlt className="mr-2 text-blue-400" /> User Support Tickets
                </h2>
                
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 w-full md:w-auto">
                  {/* Search filter */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-700 rounded-md w-full md:w-64"
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  </div>
                  
                  {/* Priority filter */}
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="py-2 px-3 bg-gray-700 rounded-md"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                  
                  {/* Status filter */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="py-2 px-3 bg-gray-700 rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredTickets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-700/50 text-left">
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Priority</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Created</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                          <td className="px-4 py-3 font-mono text-sm">{ticket.id.substring(0, 8)}</td>
                          <td className="px-4 py-3">{ticket.title}</td>
                          <td className="px-4 py-3">{ticket.userId}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityClass(ticket.priority)}`}>
                              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(ticket.status)}`}>
                              {ticket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={ticket.status}
                              onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                              className="bg-gray-700 text-sm rounded p-1 border border-gray-600"
                              disabled={isLoading}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>No support tickets found</p>
                </div>
              )}
            </div>
          )}

          {/* System Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
                <h2 className="text-xl font-semibold flex items-center">
                  <FaFileAlt className="mr-2 text-blue-400" /> System Logs
                </h2>
                
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 w-full md:w-auto">
                  {/* Search filter */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-700 rounded-md w-full md:w-64"
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-700/50 text-left">
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Level</th>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, index) => (
                        <tr key={index} className="border-t border-gray-700 hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${getLogLevelClass(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{log.source}</td>
                          <td className="px-4 py-3 font-mono text-sm">
                            {log.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <div className="bg-gray-700/30 rounded-lg p-6">
                  <div className="flex flex-col items-center text-center mb-8">
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
                    
                    <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mb-6">
                      <h4 className="font-semibold mb-2">What happens in maintenance mode?</h4>
                      <ul className="text-gray-400 text-left space-y-2">
                        <li>• Regular users will see a maintenance page</li>
                        <li>• All booking functionality will be disabled</li>
                        <li>• Administrators can still access the admin panel</li>
                        <li>• API endpoints will return 503 Service Unavailable</li>
                      </ul>
                    </div>
                    
                    <button
                      onClick={toggleMaintenanceMode}
                      disabled={isToggling}
                      className={`py-3 px-6 rounded-md font-medium flex items-center justify-center transition-colors ${
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
                          className="w-full bg-gray-700 rounded p-3 text-white"
                          rows="3"
                          placeholder="We are currently performing scheduled maintenance. Please check back later."
                          disabled={!maintenanceMode}
                        ></textarea>
                      </div>
                      
                      <div className="bg-gray-800 p-4 rounded">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Estimated Completion Time
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full bg-gray-700 rounded p-3 text-white"
                          disabled={!maintenanceMode}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 text-right">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50"
                        disabled={!maintenanceMode}
                      >
                        Save Customization
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTools;