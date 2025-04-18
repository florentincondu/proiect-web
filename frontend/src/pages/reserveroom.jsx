import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ReserveRoom = () => {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [newFeedback, setNewFeedback] = useState({ name: '', rating: 5, comment: '' });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  

  const aedToRon = 1.2;


  useEffect(() => {

    const fetchHotel = () => {

      const hotelData = {
        id: parseInt(hotelId),
        name: "Hilton Hotel",
        location: "Dubai Marina",
        price: 549,
        description: "Situat în inima Dubai Marina, Hilton Hotel oferă camere luxoase cu vedere panoramică asupra golfului. Hotelul dispune de piscine interioare și exterioare, centru SPA, restaurante de lux și acces direct la plajă. Serviciile premium și facilitățile moderne fac din acest hotel alegerea perfectă pentru vacanțe de vis în Dubai.",
        utilities: [
          { name: "Wi-Fi", icon: "wifi" },
          { name: "Aer condiționat", icon: "snow" },
          { name: "Piscină", icon: "droplet" },
          { name: "Sală de fitness", icon: "dumbbell" },
          { name: "Restaurant", icon: "utensils" },
          { name: "Spa", icon: "spa" },
          { name: "Parcare gratuită", icon: "car" },
          { name: "Room service", icon: "concierge-bell" }
        ],
        rooms: [
          { 
            id: 1, 
            type: "Cameră Standard", 
            price: 549, 
            occupancy: 2, 
            bedType: "Pat matrimonial sau 2 paturi single", 
            size: "32 mp",
            amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr"]
          },
          { 
            id: 2, 
            type: "Cameră Deluxe", 
            price: 749, 
            occupancy: 2, 
            bedType: "Pat King size", 
            size: "42 mp",
            amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr", "Balcon privat", "Espressor"]
          },
          { 
            id: 3, 
            type: "Suită Junior", 
            price: 1049, 
            occupancy: 3, 
            bedType: "Pat King size și canapea extensibilă", 
            size: "55 mp",
            amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr", "Balcon privat", "Espressor", "Zonă de living"]
          },
          { 
            id: 4, 
            type: "Suită Executivă", 
            price: 1549, 
            occupancy: 4, 
            bedType: "Pat King size și canapea extensibilă", 
            size: "75 mp",
            amenities: ["TV LCD", "Mini-bar", "Seif", "Uscător de păr", "Terasă privată", "Espressor", "Zonă de living", "Jacuzzi"]
          }
        ],
        feedback: [
          { id: 1, name: "Maria P.", rating: 5, date: "15 Februarie 2023", comment: "O experiență extraordinară! Personalul este foarte amabil și locația este superbă. Recomand cu căldură!" },
          { id: 2, name: "Alexandru M.", rating: 4, date: "23 Martie 2023", comment: "Camere spațioase și curate, vedere excelentă. Micul dejun ar putea fi îmbunătățit." },
          { id: 3, name: "Elena D.", rating: 5, date: "10 Aprilie 2023", comment: "Am stat în camera Deluxe și a fost extraordinară. Priveliștea este spectaculoasă iar serviciile impecabile." }
        ],
        images: [
          "/images/hotel1.jpg",
          "/images/hotel1_room1.jpg",
          "/images/hotel1_room2.jpg",
          "/images/hotel1_pool.jpg",
          "/images/hotel1_restaurant.jpg",
          "/images/hotel1_lobby.jpg"
        ]
        
      };
      
      setHotel(hotelData);
      
    };
    
    fetchHotel();
  }, [hotelId]);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
  };

  const handleBookNow = () => {
    if (selectedRoom) {
      navigate(`/checkout/${hotelId}/${selectedRoom.id}`);
    } else {
      alert("Vă rugăm să selectați un tip de cameră");
    }
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    

    const newFeedbackItem = {
      id: hotel.feedback.length + 1,
      name: newFeedback.name,
      rating: newFeedback.rating,
      date: new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
      comment: newFeedback.comment
    };
    
    setHotel({
      ...hotel,
      feedback: [...hotel.feedback, newFeedbackItem]
    });
    
    setNewFeedback({ name: '', rating: 5, comment: '' });
    setShowFeedbackForm(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === hotel.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? hotel.images.length - 1 : prev - 1));
  };

  if (!hotel) {
    return (
      <div className="min-h-screen bg-[#0a192f] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a192f] text-white p-4 md:p-8">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Înapoi
      </button>
      
      <div className="max-w-6xl mx-auto">
        {/* Hotel Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{hotel.name}</h1>
            <p className="text-blue-400 flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {hotel.location}
            </p>
            
            {/* Star rating display */}
            <div className="flex items-center mb-4">
              {[...Array(5)].map((_, index) => (
                <svg 
                  key={index} 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 ${index < 4 ? "text-yellow-400" : "text-gray-400"}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-2 text-sm text-gray-300">(120 recenzii)</span>
            </div>
          </div>
          
          <div className="bg-[#172a45] p-4 rounded-lg shadow-lg">
            <p className="text-sm text-gray-300 mb-1">Preț începând de la</p>
            <p className="text-2xl font-bold">{Math.round(hotel.price * aedToRon)} Lei</p>
            <p className="text-sm text-gray-300 mb-4">pe noapte</p>
          </div>
        </div>
        
        {/* Gallery */}
        <div className="relative mb-8 bg-[#172a45] rounded-lg overflow-hidden">
          <div className="aspect-w-16 aspect-h-9">
            <img 
              src={hotel.images[currentImageIndex]} 
              alt={`${hotel.name} imagine ${currentImageIndex + 1}`} 
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
          
          {/* Navigation arrows */}
          <button 
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Gallery thumbnails */}
          <div className="flex overflow-x-auto p-2 bg-[#0f2847] space-x-2">
            {hotel.images.map((image, index) => (
              <button 
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 ${currentImageIndex === index ? 'ring-2 ring-blue-500' : ''}`}
              >
                <img 
                  src={image} 
                  alt={`Thumbnail ${index + 1}`} 
                  className="h-16 w-24 object-cover rounded"
                />
              </button>
            ))}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="mb-8">
          <div className="flex border-b border-[#2d3a4f] mb-6">
            <button 
              onClick={() => setActiveTab('description')}
              className={`py-2 px-4 font-medium ${activeTab === 'description' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Descriere
            </button>
            <button 
              onClick={() => setActiveTab('rooms')}
              className={`py-2 px-4 font-medium ${activeTab === 'rooms' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Camere
            </button>
            <button 
              onClick={() => setActiveTab('utilities')}
              className={`py-2 px-4 font-medium ${activeTab === 'utilities' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Facilități
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={`py-2 px-4 font-medium ${activeTab === 'feedback' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
            >
              Recenzii
            </button>
          </div>
          
          {/* Tab content */}
          <div className="bg-[#172a45] rounded-lg p-6">
            {/* Description Tab */}
            {activeTab === 'description' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Despre {hotel.name}</h2>
                <p className="mb-6">{hotel.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1e3a5f] p-4 rounded-lg">
                    <h3 className="font-bold mb-2">Check-in / Check-out</h3>
                    <p className="text-sm">Check-in: de la 14:00</p>
                    <p className="text-sm">Check-out: până la 12:00</p>
                  </div>
                  <div className="bg-[#1e3a5f] p-4 rounded-lg">
                    <h3 className="font-bold mb-2">Politica de anulare</h3>
                    <p className="text-sm">Anulare gratuită cu până la 48 de ore înainte de check-in.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Tipuri de camere</h2>
                <div className="space-y-4">
                  {hotel.rooms.map((room) => (
                    <div 
                      key={room.id} 
                      className={`border ${selectedRoom?.id === room.id ? 'border-blue-500' : 'border-[#2d3a4f]'} rounded-lg p-4 cursor-pointer transition-colors`}
                      onClick={() => handleRoomSelect(room)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="mb-4 md:mb-0">
                          <h3 className="font-bold text-lg">{room.type}</h3>
                          <p className="text-gray-300 text-sm">
                            <span className="mr-3">{room.size}</span>
                            <span className="mr-3">{room.occupancy} persoane</span>
                            <span>{room.bedType}</span>
                          </p>
                          
                          <div className="mt-2">
                            <p className="text-sm font-medium mb-1">Dotări cameră:</p>
                            <div className="flex flex-wrap gap-2">
                              {room.amenities.map((amenity, i) => (
                                <span key={i} className="text-xs bg-[#263b59] px-2 py-1 rounded">
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Preț pe noapte</p>
                          <p className="text-xl font-bold">{Math.round(room.price * aedToRon)} Lei</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleBookNow}
                    disabled={!selectedRoom}
                    className={`px-6 py-3 rounded-lg font-medium ${selectedRoom ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 cursor-not-allowed'} transition-colors`}
                  >
                    {selectedRoom ? 'Rezervă acum' : 'Selectează o cameră'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Utilities Tab */}
            {activeTab === 'utilities' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Facilități hotel</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {hotel.utilities.map((utility, index) => (
                    <div key={index} className="bg-[#1e3a5f] p-4 rounded-lg flex items-center">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span>{utility.name}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8">
                  <h3 className="text-lg font-bold mb-3">Politici hotel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1e3a5f] p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Regulamente</h4>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Check-in de la 14:00
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Check-out până la 12:00
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Camerele sunt nefumători
                        </li>
                      </ul>
                    </div>
                    <div className="bg-[#1e3a5f] p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Plăți acceptate</h4>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Cărți de credit/debit
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Plată online în avans
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Numerar
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Recenzii clienți</h2>
                  <button 
                    onClick={() => setShowFeedbackForm(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Adaugă recenzie
                  </button>
                </div>
                
                {/* Feedback listing */}
                <div className="space-y-6">
                  {hotel.feedback.map((item) => (
                    <div key={item.id} className="border-b border-[#2d3a4f] pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{item.name}</h3>
                          <p className="text-xs text-gray-400">{item.date}</p>
                        </div>
                        <div className="flex">
                          {[...Array(5)].map((_, index) => (
                            <svg 
                              key={index} 
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4 w-4 ${index < item.rating ? "text-yellow-400" : "text-gray-400"}`} 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300">{item.comment}</p>
                    </div>
                  ))}
                </div>
                
                {/* Feedback form modal */}
                {showFeedbackForm && (
                  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#172a45] p-6 rounded-xl max-w-md w-full shadow-2xl">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Adaugă o recenzie</h3>
                        <button onClick={() => setShowFeedbackForm(false)}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <form onSubmit={handleFeedbackSubmit}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Nume</label>
                          <input
                            type="text"
                            value={newFeedback.name}
                            onChange={(e) => setNewFeedback({...newFeedback, name: e.target.value})}
                            className="w-full p-2 bg-[#1e3a5f] rounded-lg text-white border border-[#2d3a4f] focus:outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Nota (1-5)</label>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => setNewFeedback({...newFeedback, rating})}
                                className="mr-1 focus:outline-none"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className={`h-6 w-6 ${rating <= newFeedback.rating ? "text-yellow-400" : "text-gray-400"} hover:text-yellow-300 transition-colors`}
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3 .921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784 .57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81 .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <label className="block text-sm font-medium mb-2">Comentariu</label>
                          <textarea
                            value={newFeedback.comment}
                            onChange={(e) => setNewFeedback({...newFeedback, comment: e.target.value})}
                            className="w-full p-2 bg-[#1e3a5f] rounded-lg text-white border border-[#2d3a4f] focus:outline-none focus:border-blue-500 min-h-[100px]"
                            required
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowFeedbackForm(false)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            Anulează
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                          >
                            Trimite recenzie
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveRoom;