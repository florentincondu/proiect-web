import React from 'react';
import { FaCheck, FaExclamationTriangle, FaShieldAlt, FaFileContract, FaInfoCircle } from 'react-icons/fa';

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      {/* Main container with glass effect */}
      <div className="w-full max-w-6xl overflow-hidden rounded-xl shadow-lg bg-gray-900 bg-opacity-90 backdrop-blur-sm flex flex-col z-10 relative my-10">
        {/* Header */}
        <div className="w-full p-8 flex justify-between items-center border-b border-gray-700">
          <div className="text-white font-bold text-2xl">
            <span className="text-blue-500">Boksy</span>
          </div>
          <a href="/homepage" className="text-blue-400 hover:underline">Return to Homepage</a>
        </div>
        
        {/* Content */}
        <div className="w-full p-8 md:p-10 flex flex-col">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-gray-300">Last Updated: April 14, 2025</p>
          </div>
          
          {/* Introduction */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FaFileContract className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Introduction</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Welcome to Boksy. These Terms of Service ("Terms") govern your use of the Boksy website, mobile application, 
              and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms. 
              If you disagree with any part of the Terms, you may not access the Service.
            </p>
          </div>
          
          {/* Definitions */}
          <div className="mb-8 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <FaInfoCircle className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Definitions</h2>
            </div>
            <ul className="text-gray-300 space-y-2">
              <li><strong className="text-blue-400">"Service"</strong> refers to the Boksy website, mobile application, API, and related services.</li>
              <li><strong className="text-blue-400">"User"</strong> refers to any individual who accesses or uses the Service.</li>
              <li><strong className="text-blue-400">"Listing"</strong> refers to any accommodation property advertised on the Service.</li>
              <li><strong className="text-blue-400">"Host"</strong> refers to any User who offers a Listing on the Service.</li>
              <li><strong className="text-blue-400">"Guest"</strong> refers to any User who books or inquires about a Listing on the Service.</li>
              <li><strong className="text-blue-400">"Booking"</strong> refers to a reservation of a Listing by a Guest.</li>
            </ul>
          </div>
          
          {/* User Accounts */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FaShieldAlt className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">User Accounts</h2>
            </div>
            <p className="text-gray-300 mb-4">
              To access certain features of the Service, you must register for an account. When you register, you agree to provide accurate, current, and complete information about yourself as prompted by our registration forms.
            </p>
            <p className="text-gray-300 mb-4">
              You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <p className="text-gray-300 mb-4">
              We reserve the right to suspend or terminate your account if any information provided during registration or thereafter proves to be inaccurate, false, or misleading.
            </p>
          </div>
          
          {/* Bookings and Payments */}
          <div className="mb-8 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <FaCheck className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Bookings and Payments</h2>
            </div>
            <p className="text-gray-300 mb-4">
              When you book a Listing through the Service, you agree to pay all applicable fees and taxes.
            </p>
            <p className="text-gray-300 mb-4">
              Booking fees are non-refundable unless otherwise specified in our Cancellation Policy or as required by law.
            </p>
            <p className="text-gray-300 mb-4">
              Boksy may, in its sole discretion, offer promotions, referral programs, or other incentives. Any such benefits are subject to additional terms and conditions as specified at the time they are offered.
            </p>
          </div>
          
          {/* Host Obligations */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FaCheck className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Host Obligations</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Hosts are responsible for ensuring that their Listings comply with all applicable laws, regulations, and third-party agreements.
            </p>
            <p className="text-gray-300 mb-4">
              Hosts must provide accurate information about their Listings, including description, amenities, availability, and pricing.
            </p>
            <p className="text-gray-300 mb-4">
              Hosts are responsible for maintaining their Listings in a clean, safe, and habitable condition, and for providing any advertised amenities.
            </p>
          </div>
          
          {/* Guest Obligations */}
          <div className="mb-8 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <FaCheck className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Guest Obligations</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Guests must comply with all rules and restrictions specified in the Listing description, as well as any additional instructions provided by the Host.
            </p>
            <p className="text-gray-300 mb-4">
              Guests are responsible for their behavior during their stay and for any damage they cause to the Listing.
            </p>
            <p className="text-gray-300 mb-4">
              Guests must not use the Listing for any illegal or unauthorized purpose, or in a manner that could damage, disable, overburden, or impair the Service.
            </p>
          </div>
          
          {/* Prohibited Activities */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FaExclamationTriangle className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Prohibited Activities</h2>
            </div>
            <p className="text-gray-300 mb-4">
              You may not use the Service for any illegal or unauthorized purpose. You agree not to:
            </p>
            <ul className="text-gray-300 space-y-2 pl-6 list-disc">
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Post false, inaccurate, misleading, defamatory, or libelous content</li>
              <li>Transfer your account to another party without our consent</li>
              <li>Create more than one account per person</li>
              <li>Use the Service to distribute unsolicited commercial messages ("spam")</li>
              <li>Use the Service for any harmful or fraudulent activities</li>
              <li>Attempt to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service</li>
            </ul>
          </div>
          
          {/* Intellectual Property */}
          <div className="mb-8 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <FaShieldAlt className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Intellectual Property</h2>
            </div>
            <p className="text-gray-300 mb-4">
              The Service and its original content, features, and functionality are owned by Boksy and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
            <p className="text-gray-300 mb-4">
              By submitting content to the Service, you grant Boksy a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content in connection with providing the Service.
            </p>
          </div>
          
          {/* Limitation of Liability */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FaExclamationTriangle className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Limitation of Liability</h2>
            </div>
            <p className="text-gray-300 mb-4">
              To the maximum extent permitted by law, Boksy and its affiliates, officers, employees, agents, partners, and licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="text-gray-300 space-y-2 pl-6 list-disc">
              <li>Your access to or use of or inability to access or use the Service</li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Any content obtained from the Service</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
          </div>
          
          {/* Indemnification */}
          <div className="mb-8 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <FaShieldAlt className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Indemnification</h2>
            </div>
            <p className="text-gray-300 mb-4">
              You agree to defend, indemnify, and hold harmless Boksy and its affiliates, officers, employees, agents, partners, and licensors from and against any claims, liabilities, damages, losses, and expenses, including without limitation reasonable attorney's fees, arising out of or in any way connected with:
            </p>
            <ul className="text-gray-300 space-y-2 pl-6 list-disc">
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party right, including without limitation any intellectual property right, publicity, confidentiality, property, or privacy right</li>
              <li>Any claim that your content caused damage to a third party</li>
            </ul>
          </div>
          
          {/* Modifications */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FaInfoCircle className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Modifications</h2>
            </div>
            <p className="text-gray-300 mb-4">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any material changes by posting the new Terms on the Service. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
            </p>
          </div>
          
          {/* Governing Law */}
          <div className="mb-8 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <FaFileContract className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Governing Law</h2>
            </div>
            <p className="text-gray-300 mb-4">
              These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
            </p>
            <p className="text-gray-300 mb-4">
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
            </p>
          </div>
          
          {/* Contact Us */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FaInfoCircle className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Contact Us</h2>
            </div>
            <p className="text-gray-300 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-300">
              <strong className="text-blue-400">Email:</strong> legal@boksy.com<br />
              <strong className="text-blue-400">Address:</strong> Boksy Headquarters, 123 Booking Street, Travel City, TC 12345
            </p>
          </div>
          
          {/* Acknowledgement */}
          <div className="mb-8 bg-blue-900 bg-opacity-30 p-6 rounded-lg border border-blue-800">
            <div className="flex items-center mb-4">
              <FaCheck className="text-blue-500 mr-3 text-xl" />
              <h2 className="text-2xl font-bold text-white">Acknowledgement</h2>
            </div>
            <p className="text-gray-300 mb-4">
              By using the Service, you acknowledge that you have read these Terms of Service, understood them, and agree to be bound by them. If you do not agree to these Terms, you must not use the Service.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="w-full p-8 border-t border-gray-700 text-center">
          <p className="text-gray-400">© 2025 Boksy. All rights reserved.</p>
          <div className="mt-4 flex justify-center space-x-4">
            <a href="/privacy-policy" className="text-blue-400 hover:underline">Privacy Policy</a>
            <a href="/terms-of-service" className="text-blue-400 hover:underline">Terms of Service</a>
            <a href="/contact" className="text-blue-400 hover:underline">Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;