import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaSearch, FaEllipsisV, FaEdit, FaKey, FaUserShield, FaUserCog, FaHistory, FaEnvelope, FaBan } from 'react-icons/fa';
import axios from 'axios';

const UserManagement = () => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isViewHistoryModalOpen, setIsViewHistoryModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userBookingHistory, setUserBookingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockInfo, setBlockInfo] = useState({
    reason: '',
    duration: '1' // Default 1 day
  });
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      


      const userData = response.data.users || response.data;
      const transformedUsers = userData.map(user => ({
        ...user,
        status: user.status || 'active', // Default status if not provided
        role: user.role || 'client', // Default role if not provided
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(), // Combine first and last name if needed

        bookingCount: countUserBookings(user),
        reviewCount: countUserReviews(user),
        loginCount: user.loginCount || 0
      }));
      
      setUsers(transformedUsers);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users. Please try again later.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };


  const countUserBookings = (user) => {

    if (user.properties && Array.isArray(user.properties)) {
      return user.properties.reduce((sum, property) => sum + (property.bookings || 0), 0);
    }
    

    if (user.bookings && typeof user.bookings === 'number') {
      return user.bookings;
    }
    

    if (user.activityLogs && Array.isArray(user.activityLogs)) {
      return user.activityLogs.filter(log => 
        log.action === 'booking_created' || 
        log.action === 'booking_confirmed'
      ).length;
    }
    
    return 0;
  };
  

  const countUserReviews = (user) => {

    if (user.reviews && typeof user.reviews === 'number') {
      return user.reviews;
    }
    

    if (user.activityLogs && Array.isArray(user.activityLogs)) {
      return user.activityLogs.filter(log => 
        log.action === 'review_created' || 
        log.action === 'review_submitted'
      ).length;
    }
    
    return 0;
  };

  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  };
  
  const handleEditUser = (user) => {
    setCurrentUser(user);
    setIsEditModalOpen(true);
  };
  
  const handleBlockUser = async (user) => {
    setCurrentUser(user);
    setBlockModalOpen(true);
  };
  
  const handleConfirmBlock = async () => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/users/${currentUser._id}`,
        {
          status: 'blocked',
          blockReason: blockInfo.reason,
          blockDuration: blockInfo.duration
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      

      setUsers(users.map(user => 
        user._id === currentUser._id ? {
          ...user,
          ...response.data,
          status: 'blocked'
        } : user
      ));
      
      setBlockModalOpen(false);
      setBlockInfo({ reason: '', duration: '1' });
      setError(null);
    } catch (err) {
      setError('Failed to block user. Please try again later.');
      console.error('Error blocking user:', err);
    }
  };
  
  const handleViewHistory = async (user) => {
    setCurrentUser(user);
    setIsViewHistoryModalOpen(true);
    setHistoryLoading(true);
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/users/${user._id}/bookings`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setUserBookingHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch user history:', err);
      setError('Failed to fetch user history');
    } finally {
      setHistoryLoading(false);
    }
  };
  
  const handleUpdateUser = async (updatedUser) => {
    try {
      // Create userData without status - status should be handled automatically based on login activity
      const userData = {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      };

      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/users/${updatedUser._id}`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setUsers(users.map(user => 
        user._id === updatedUser._id ? {
          ...user,
          ...response.data,
          name: response.data.name || user.name,
          email: response.data.email || user.email,
          role: response.data.role || 'client'
        } : user
      ));
      
      setIsEditModalOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to update user. Please try again later.');
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      

      setUsers(users.filter(user => user._id !== userId));
      setError(null);
    } catch (err) {
      setError('Failed to delete user. Please try again later.');
      console.error('Error deleting user:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'inactive':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'blocked':
        return 'bg-red-500/20 text-red-400';
      case 'unverified':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400';
      case 'customer':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSearch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <p className="text-gray-400">View and manage user accounts and permissions</p>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="sm:col-span-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                <FaSearch />
              </span>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Role</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:border-blue-500"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Status</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 focus:ring-opacity-50"
                      onChange={handleSelectAll}
                      checked={selectedUsers.length > 0 && selectedUsers.length === users.length}
                    />
                    User
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-400">Loading users...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-3 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 focus:ring-opacity-50"
                          onChange={() => handleSelectUser(user._id)}
                          checked={selectedUsers.includes(user._id)}
                        />
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center text-blue-400 uppercase font-bold text-sm">
                          {user.name ? user.name.charAt(0) : 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium">{user.name}</div>
                          <div className="text-sm text-gray-400">{user._id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{user.email}</div>
                      {user.phone && <div className="text-sm text-gray-400">{user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Bookings: {user.bookingCount || 0} | Reviews: {user.reviewCount || 0} | Logins: {user.loginCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit User"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleViewHistory(user)}
                          className="text-gray-400 hover:text-gray-300 transition-colors"
                          title="View History"
                        >
                          <FaHistory />
                        </button>
                        {user.status !== 'blocked' && (
                          <button
                            onClick={() => handleBlockUser(user)}
                            className="text-yellow-400 hover:text-yellow-300 transition-colors"
                            title="Block User"
                          >
                            <FaBan />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete User"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Scrolling Indicator */}
        <div className="md:hidden text-center text-xs text-gray-400 py-2 bg-gray-750">
          Scroll horizontally to see all data
        </div>
      </div>
      
      {/* Edit User Modal */}
      {isEditModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg mx-4">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">Edit User</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    defaultValue={currentUser.name}
                    onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    defaultValue={currentUser.email}
                    onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Role
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                    defaultValue={currentUser.role}
                    onChange={(e) => setCurrentUser({...currentUser, role: e.target.value})}
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                    <option value="host">Host</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Status
                  </label>
                  <div className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(currentUser.status)}`}>
                      {currentUser.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">Status is automatically set based on user activity</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-700 px-6 py-4 flex justify-end space-x-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(currentUser)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Block User Modal */}
      {blockModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-lg mx-4">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">Block User</h3>
              <button onClick={() => setBlockModalOpen(false)} className="text-gray-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Block Reason
                  </label>
                  <textarea
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    value={blockInfo.reason}
                    onChange={(e) => setBlockInfo({...blockInfo, reason: e.target.value})}
                    rows="3"
                    placeholder="Enter reason for blocking..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Block Duration (days)
                  </label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                    value={blockInfo.duration}
                    onChange={(e) => setBlockInfo({...blockInfo, duration: e.target.value})}
                  >
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="0">Permanent</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-700 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setBlockModalOpen(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlock}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* View History Modal */}
      {isViewHistoryModalOpen && currentUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl mx-4">
            <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">User History - {currentUser.name}</h3>
              <button onClick={() => setIsViewHistoryModalOpen(false)} className="text-gray-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-400">Loading history...</p>
                </div>
              ) : userBookingHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  No booking history found for this user.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Booking ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Hotel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Check In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Check Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {userBookingHistory.map((booking) => (
                        <tr key={booking._id} className="hover:bg-gray-750">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {booking._id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {booking.hotel?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Date(booking.checkIn).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {new Date(booking.checkOut).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            ${booking.totalAmount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-gray-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setIsViewHistoryModalOpen(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;