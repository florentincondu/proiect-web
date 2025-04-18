import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

const AdminApprovalConfirmation = () => {
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userToken, setUserToken] = useState('');
  const [approvalAttempted, setApprovalAttempted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const processRequest = async () => {

      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const email = params.get('email');
      const path = location.pathname;

      console.log(`Processing admin request on path: ${path} with token: ${token} and email: ${email}`);
      

      if (email) {
        setUserEmail(email);
      }
      
      if (token) {
        setUserToken(token);
      }
      

      const isApproval = path.includes('/approve');
      const isRejection = path.includes('/reject');
      
      if (!token && !email) {

        const statusParam = params.get('status');
        const messageParam = params.get('message');
        
        setStatus(statusParam || 'approved');
        setMessage(messageParam || 'Admin request has been processed successfully.');
        setLoading(false);
        setProcessingComplete(true);
        return;
      }
      

      if (approvalAttempted) {
        setLoading(false);
        return;
      }
      
      if (isApproval || isRejection) {
        setApprovalAttempted(true);
        try {
          let response;
          let apiEndpoint = '';
          
          if (isApproval) {

            apiEndpoint = `${API_URL}/api/admin-approval/approve`;
            const queryParams = [];
            
            if (token) queryParams.push(`token=${token}`);
            if (email) queryParams.push(`email=${email}`);
            
            if (queryParams.length > 0) {
              apiEndpoint += `?${queryParams.join('&')}`;
            }
            
            console.log(`Making approval request to: ${apiEndpoint}`);
            

            response = await axios.get(apiEndpoint);
            setStatus('approved');
            setMessage(`Admin access approved successfully. A verification code has been sent to the user's email.`);
            
            if (response.data && response.data.email) {
              setUserEmail(response.data.email);
            } else if (email) {
              setUserEmail(email);
            }
          } else if (isRejection) {

            apiEndpoint = `${API_URL}/api/admin-approval/reject`;
            const queryParams = [];
            
            if (token) queryParams.push(`token=${token}`);
            if (email) queryParams.push(`email=${email}`);
            
            if (queryParams.length > 0) {
              apiEndpoint += `?${queryParams.join('&')}`;
            }
            
            console.log(`Making rejection request to: ${apiEndpoint}`);
            

            response = await axios.get(apiEndpoint);
            setStatus('rejected');
            setMessage('Admin access request has been rejected. The user has been notified.');
            
            if (response.data && response.data.email) {
              setUserEmail(response.data.email);
            } else if (email) {
              setUserEmail(email);
            }
          }
          
          console.log('Admin request processed:', response?.data);
        } catch (error) {
          console.error('Error processing admin request:', error);
          setStatus('error');
          setMessage('There was an error processing the admin request. Please try again.');
        } finally {
          setLoading(false);
          setProcessingComplete(true);
        }
      } else {

        setStatus('approved');
        setMessage('Admin request has been processed successfully.');
        setLoading(false);
        setProcessingComplete(true);
      }
    };
    
    processRequest();
  }, [location, API_URL, approvalAttempted]);

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <FaSpinner className="mx-auto text-blue-500 text-6xl mb-4 animate-spin" />
          <h1 className="text-2xl font-bold mb-4">Processing Admin Request</h1>
          <p className="text-gray-300 mb-6">
            Please wait while we process the admin request and send the verification code...
          </p>
        </>
      );
    }
    
    if (status === 'approved') {
      return (
        <>
          <FaCheckCircle className="mx-auto text-green-500 text-6xl mb-4" />
          <h1 className="text-2xl font-bold mb-4">Admin Request Approved</h1>
          <p className="text-gray-300 mb-6">
            {message || 'The admin request has been approved. A verification code has been sent to the user\'s email.'}
          </p>
          {userEmail && (
            <p className="text-blue-300 font-semibold mb-4">
              Email sent to: {userEmail}
            </p>
          )}
          <div className="bg-gray-700 p-4 rounded-lg text-left mb-6">
            <h2 className="font-bold text-yellow-400 mb-2">Next Steps:</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>The user will receive an email with a 6-digit verification code</li>
              <li>They must enter this code on the verification page</li>
              <li>After verification, they will have admin access</li>
            </ul>
          </div>
          
          {/* Add button to go to verification page */}
          {userEmail && userToken && (
            <div className="mt-6">
              <button
                onClick={() => navigate(`/admin-verification?token=${userToken}&email=${userEmail}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Go to Verification Page
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Click this button to enter the verification code
              </p>
            </div>
          )}
          {userEmail && !userToken && (
            <div className="mt-6">
              <button
                onClick={() => navigate(`/admin-verification?email=${userEmail}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Go to Verification Page
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Click this button to enter the verification code
              </p>
            </div>
          )}
        </>
      );
    }
    
    if (status === 'rejected') {
      return (
        <>
          <FaTimesCircle className="mx-auto text-red-500 text-6xl mb-4" />
          <h1 className="text-2xl font-bold mb-4">Admin Request Rejected</h1>
          <p className="text-gray-300 mb-6">
            {message || 'The admin request has been rejected. The user has been notified.'}
          </p>
          {userEmail && (
            <p className="text-blue-300 font-semibold mb-4">
              Notification sent to: {userEmail}
            </p>
          )}
        </>
      );
    }
    

    return (
      <>
        <FaTimesCircle className="mx-auto text-red-500 text-6xl mb-4" />
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-gray-300 mb-6">
          {message || 'There was an error processing the request. Please try again.'}
        </p>
        <div className="bg-red-800/30 p-4 rounded-lg mb-4">
          <p className="text-xs text-red-300">
            If you reached this page from an email, please check if the link was correctly copied. 
            You can try closing this page and clicking the link in the email again.
          </p>
        </div>
      </>
    );
  };


  const handleHomeClick = (e) => {
    e.preventDefault();

    if (window.confirm('Are you sure you want to leave this page? The admin verification has been completed.')) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-white text-center">
        {renderContent()}
        
        {processingComplete && (
          <>
            <p className="text-sm text-gray-400 mt-4">
              The verification process is complete.
            </p>
            <p className="text-xs text-blue-300 mt-2">
              The admin verification code has been sent to the user's email.
              <br />They need to enter this code on the verification page.
            </p>
            <p className="text-xs text-gray-400 mt-4">
              You can now safely close this window.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminApprovalConfirmation; 