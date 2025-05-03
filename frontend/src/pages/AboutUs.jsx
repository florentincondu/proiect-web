import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Globe, Facebook, Instagram, Twitter, ArrowLeft } from 'lucide-react';
import { FaUser } from 'react-icons/fa';
import { useAuth } from '../context/authContext';
import NotificationBell from '../components/NotificationBell';

const AboutUs = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGoBack = () => {
    window.history.back();
  };

  // Team members data
  const teamMembers = [
    {
      name: 'Elena Constantin',
      role: 'CEO & Founder',
      image: 'https://images.unsplash.com/photo-1574701148212-8518049c7b2c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      bio: 'With over 15 years of experience in the hospitality industry, Elena founded Boksy with a vision to revolutionize hotel booking.'
    },
    {
      name: 'Andrei Popescu',
      role: 'CTO',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      bio: 'Andrei leads our technical team, ensuring our platform is fast, secure and user-friendly for all our customers.'
    },
    {
      name: 'Maria Ionescu',
      role: 'Head of Customer Relations',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      bio: 'Maria ensures that every customer has an exceptional experience with Boksy, from booking to checkout.'
    },
    {
      name: 'Alexandru Georgescu',
      role: 'Marketing Director',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&q=80',
      bio: 'Alex crafts our brand strategy and leads our marketing efforts to connect travelers with the perfect accommodations.'
    }
  ];

  // Company stats
  const stats = [
    { label: 'Hotels', value: '10,000+' },
    { label: 'Cities', value: '500+' },
    { label: 'Countries', value: '45' },
    { label: 'Happy Guests', value: '2M+' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a192f] to-[#112240] text-white">
      {/* Navigation */}
      <nav className="bg-[#0a192f]/90 py-4 px-6 backdrop-blur-md sticky top-0 z-50 border-b border-blue-900/30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleGoBack}
              className="mr-2 p-2 bg-[#172a45] hover:bg-[#1e3a5f] rounded-full flex items-center justify-center transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="text-white" />
            </button>
            <h1 
              className="text-2xl font-bold cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <span className="text-blue-400">B</span>oksy
            </h1>
          </div>
          
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <div className="relative group">
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
                      {user?.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt="Profile" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <FaUser className="text-white" />
                      )}
                    </div>
                    <span className="hidden md:block">{user?.firstName || 'User'}</span>
                  </div>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-[#172a45] rounded-md shadow-lg py-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300">
                    <a 
                      href="/profile" 
                      className="block px-4 py-2 text-sm hover:bg-blue-500/20"
                    >
                      Profile
                    </a>
                    <a 
                      href="/my-bookings" 
                      className="block px-4 py-2 text-sm hover:bg-blue-500/20"
                    >
                      My Bookings
                    </a>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-500/20"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm -z-10 rounded-xl"></div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white max-w-3xl mx-auto"
          >
            About <span className="text-blue-400">Boksy</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto mb-10"
          >
            Revolutionizing the way people discover and book accommodations since 2023.
          </motion.p>
        </div>
      </section>
      
      {/* Our Story Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
            <div className="w-20 h-1 bg-blue-500 mx-auto mb-10"></div>
            <p className="text-lg text-gray-300 max-w-4xl mx-auto">
              Boksy was born from a simple idea: make hotel booking simple, transparent, and enjoyable. 
              Founded in Bucharest in 2023, we started with a mission to connect travelers with unique accommodations 
              that match their preferences and budget. Today, we're proud to offer thousands of hotels across 
              Romania and beyond, with a focus on exceptional customer service and a seamless booking experience.
            </p>
          </motion.div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 rounded-lg bg-[#172a45] border border-blue-500/30"
              >
                <p className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">{stat.value}</p>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          
          {/* Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-[#172a45] p-8 rounded-xl border border-blue-500/30"
            >
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-gray-300 mb-4">
                To connect travelers with their ideal accommodations through an intuitive, 
                transparent platform that prioritizes user experience and satisfaction.
              </p>
              <p className="text-gray-300">
                We strive to make every trip memorable by providing access to quality 
                accommodations that meet our users' needs and exceed their expectations.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-[#172a45] p-8 rounded-xl border border-blue-500/30"
            >
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-gray-300 mb-4">
                To become the most trusted hotel booking platform in Europe, known for 
                our exceptional user experience, diverse accommodation options, and dedication 
                to customer satisfaction.
              </p>
              <p className="text-gray-300">
                We envision a world where finding and booking the perfect place to stay is 
                effortless, enjoyable, and always rewarding.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Team Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#112240]">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Meet Our Team</h2>
            <div className="w-20 h-1 bg-blue-500 mx-auto mb-10"></div>
            <p className="text-lg text-gray-300 max-w-4xl mx-auto">
              The passionate individuals behind Boksy who work tirelessly to create the best 
              hotel booking experience for our users.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#172a45] rounded-xl overflow-hidden border border-blue-500/30"
              >
                <img 
                  src={member.image} 
                  alt={member.name} 
                  className="w-full h-60 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                  <p className="text-blue-400 mb-4">{member.role}</p>
                  <p className="text-gray-300 text-sm">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Contact Information Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Get In Touch</h2>
            <div className="w-20 h-1 bg-blue-500 mx-auto mb-10"></div>
            <p className="text-lg text-gray-300 max-w-4xl mx-auto">
              Have questions, suggestions, or just want to say hello? We'd love to hear from you!
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <MapPin className="text-blue-400 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Our Office</h4>
                    <p className="text-gray-300">15 Victoriei Street</p>
                    <p className="text-gray-300">Bucharest, 010022</p>
                    <p className="text-gray-300">Romania</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="text-blue-400 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Phone</h4>
                    <p className="text-gray-300">+40 721 234 567</p>
                    <p className="text-gray-300">+40 21 123 4567 (Office)</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Mail className="text-blue-400 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-gray-300">info@boksy.com</p>
                    <p className="text-gray-300">support@boksy.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="text-blue-400 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Office Hours</h4>
                    <p className="text-gray-300">Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p className="text-gray-300">Weekend: Closed</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Globe className="text-blue-400 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Social Media</h4>
                    <div className="flex space-x-4 mt-2">
                      <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">
                        <Facebook size={20} />
                      </a>
                      <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">
                        <Instagram size={20} />
                      </a>
                      <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors">
                        <Twitter size={20} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-xl overflow-hidden h-full">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2848.8863918855745!2d26.096723376464318!3d44.44240641481611!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b1ff4771c121dd%3A0xbb38c201e9f964e2!2sCalea%20Victoriei%2C%20Bucure%C8%99ti!5e0!3m2!1sen!2sro!4v1686739733041!5m2!1sen!2sro" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0, minHeight: '400px' }} 
                  allowFullScreen="" 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-4 md:px-8 bg-gradient-to-b from-[#0a192f] to-[#020c1b] border-t border-blue-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="pt-8 border-t border-blue-900/30 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">© 2025 Boksy. All rights reserved.</p>
            <div className="flex space-x-6">
              <a href="/contact-us" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm">Contact Us</a>
              <a href="/terms-of-service" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm">Terms of Service</a>
              <a href="/about-us" className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-sm">About Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs; 