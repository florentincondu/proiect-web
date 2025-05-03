/**
 * Utilitar pentru calcularea și gestionarea disponibilității camerelor
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Calculează disponibilitatea camerelor în mod determinist pe baza proprietăților hotelului
 * 
 * @param {object} hotel - Obiectul hotel cu proprietățile necesare
 * @param {string} roomType - Tipul camerei pentru care se calculează disponibilitatea
 * @returns {number} - Numărul de camere disponibile
 */
export const calculateRoomAvailability = (hotel, roomType) => {
  if (!hotel) return 0;
  
  // Disponibilitatea de bază pe baza rating-ului și prețului
  const rating = parseFloat(hotel.rating || hotel.averageRating || 4.0);
  const basePrice = parseFloat(hotel.price || hotel.basePrice || hotel.estimatedPrice || 500);
  
  // Calculează un scor de calitate de la 0-10
  let qualityScore = (rating / 5) * 10; // Scală 0-10 bazată pe rating
  
  // Ajustează pe baza gamei de preț (prețurile mai mari ar putea indica hoteluri mai exclusive cu mai puține camere)
  // Prețurile sub 300 RON primesc mai multă disponibilitate, prețurile peste 800 RON primesc mai puțină
  const priceAdjustment = basePrice < 300 ? 2 : basePrice > 800 ? -2 : 0;
  qualityScore += priceAdjustment;
  
  // Ajustează pe baza tipului de cameră
  let roomTypeMultiplier = 1;
  switch(roomType) {
    case 'Standard':
    case 'single':
    case 'double':
      roomTypeMultiplier = 0.5; // Mai multe camere standard
      break;
    case 'Deluxe':
    case 'triple':
      roomTypeMultiplier = 0.4; // Mai puține camere deluxe
      break;
    case 'Suite':
    case 'quad':
      roomTypeMultiplier = 0.2; // Și mai puține suite
      break;
    default:
      roomTypeMultiplier = 0.3;
  }
  
  // Calculează numărul de camere și asigură-te că este un număr întreg
  // Scor de calitate mai mare = mai multe camere (max = qualityScore * roomTypeMultiplier)
  let calculatedRooms = Math.floor(qualityScore * roomTypeMultiplier);
  
  // Ajustări suplimentare bazate pe tipul/categoria hotelului, dacă sunt disponibile
  if (hotel.types && Array.isArray(hotel.types)) {
    // Hotelurile marcate ca "resort" sau "hotel" au probabil mai multe camere
    if (hotel.types.some(type => type.includes('resort') || type === 'hotel')) {
      calculatedRooms += 2;
    }
    // Hostelurile sau cazările mici au mai puține camere
    if (hotel.types.some(type => type.includes('hostel') || type.includes('motel'))) {
      calculatedRooms -= 1;
    }
  }
  
  // Asigură-te că avem un număr valid (minim 0)
  return Math.max(0, calculatedRooms);
};

/**
 * Verifică disponibilitatea camerelor pentru un hotel
 * 
 * @param {string} hotelId - ID-ul hotelului
 * @param {Array} rooms - Array cu camerele pentru care se verifică disponibilitatea
 * @param {Date} checkInDate - Data de check-in 
 * @param {Date} checkOutDate - Data de check-out
 * @param {object} hotel - Obiectul hotel complet
 * @returns {object} - Un obiect cu disponibilitatea pentru fiecare tip de cameră
 */
export const checkRoomsAvailability = async (hotelId, rooms, checkInDate, checkOutDate, hotel) => {
  if (!hotelId || !rooms || rooms.length === 0) return {};
  
  try {
    const startDate = checkInDate.toISOString().split('T')[0];
    const endDate = checkOutDate.toISOString().split('T')[0];
    const availability = {};
    
    // Verifică dacă este un hotel din surse externe
    const isExternalHotel = hotel.source === 'external';
    
    console.log(`Checking availability for hotel ${hotelId} (${isExternalHotel ? 'external' : 'internal'}) for dates ${startDate} to ${endDate}`);
    
    // Verifică fiecare tip de cameră
    for (const room of rooms) {
      try {
        const roomType = room.type;
        console.log('Checking availability for room:', roomType, 'in hotel:', hotelId);
        
        if (isExternalHotel) {
          // Pentru hoteluri din API extern, calculează disponibilitatea determinist
          const totalRooms = calculateRoomAvailability(hotel, roomType);
          
          // Vom urmări rezervările în localStorage pentru a simula persistența
          const bookings = JSON.parse(localStorage.getItem('hotelBookings') || '{}');
          const hotelBookings = bookings[hotelId] || {};
          const roomBookings = hotelBookings[roomType] || 0;
          
          // Calculează camerele disponibile
          const availableRooms = Math.max(0, totalRooms - roomBookings);
          
          // Verifică dacă data de check-in este după sau egală cu nextAvailableDate din localStorage (dacă există)
          const savedNextAvailableDate = localStorage.getItem(`nextAvailable_${hotelId}_${roomType}`);
          let isBookable = availableRooms > 0;
          
          // Dacă avem o dată salvată pentru disponibilitate viitoare, verificăm dacă data de check-in este după sau egală cu aceasta
          if (savedNextAvailableDate && availableRooms === 0) {
            const nextDateObj = new Date(savedNextAvailableDate);
            const checkInDateObj = new Date(startDate);
            
            // Dacă check-in-ul este după sau egal cu data disponibilă, camera devine disponibilă
            if (checkInDateObj >= nextDateObj) {
              isBookable = true;
              console.log(`Room ${roomType} is available because check-in date (${startDate}) is on/after next available date (${savedNextAvailableDate})`);
            }
          }
          
          // Pentru hotelurile externe, următoarea dată disponibilă este cea de checkout curentă
          // dacă nu sunt disponibile camere pentru perioada solicitată
          const nextDate = !isBookable ? endDate : null;
          
          // Salvează nextAvailableDate în localStorage pentru utilizare ulterioară
          if (nextDate) {
            localStorage.setItem(`nextAvailable_${hotelId}_${roomType}`, nextDate);
          }
          
          console.log(`External hotel room ${roomType}: available=${isBookable}, nextDate=${nextDate}`);
          
          availability[roomType] = {
            available: isBookable,
            price: room.price,
            totalRooms: totalRooms,
            availableRooms: isBookable ? Math.max(1, availableRooms) : 0,
            capacity: room.persons || room.capacity || (roomType === 'Suite' ? 4 : 2),
            nextAvailableDate: isBookable ? null : nextDate
          };
        } else {
          // Pentru hoteluri interne, folosește API-ul
          const axios = await import('axios');
          const response = await axios.default.post(`${API_BASE_URL}/api/hotels/check-availability`, {
            hotelId,
            startDate,
            endDate,
            roomType,
            roomId: room._id || room.id // Trimite ambele formate de ID
          });
          
          // Calculează camerele disponibile total
          const totalRoomCount = room.count || 5; // Valoare implicită 5 dacă count nu este specificat
          const bookedRoomCount = response.data.bookedCount || 0;
          const availableRoomCount = totalRoomCount - bookedRoomCount;
          
          // Verifică dacă data solicitată coincide cu nextAvailableDate (dacă există)
          let isBookable = response.data.available;
          const savedNextAvailableDate = localStorage.getItem(`nextAvailable_${hotelId}_${roomType}`);
          
          if (savedNextAvailableDate && !isBookable) {
            const nextDateObj = new Date(savedNextAvailableDate);
            const checkInDateObj = new Date(startDate);
            
            // Dacă check-in-ul este după sau egal cu data disponibilă, camera devine disponibilă
            if (checkInDateObj >= nextDateObj) {
              isBookable = true;
              console.log(`Room ${roomType} is available because check-in date (${startDate}) is on/after next available date (${savedNextAvailableDate})`);
            }
          }
          
          // Dacă API-ul returnează o dată specifică, o folosim, altfel folosim data de checkout
          const nextAvailableFromAPI = isBookable ? null : (response.data.nextAvailableDate || endDate);
          
          // Salvează nextAvailableDate în localStorage pentru utilizare ulterioară
          if (nextAvailableFromAPI) {
            localStorage.setItem(`nextAvailable_${hotelId}_${roomType}`, nextAvailableFromAPI);
          }
          
          console.log(`Internal hotel room ${roomType}: available=${isBookable}, nextDate=${nextAvailableFromAPI}`);
          
          availability[roomType] = {
            available: isBookable,
            price: room.price,
            totalRooms: totalRoomCount,
            availableRooms: isBookable ? Math.max(1, availableRoomCount) : 0,
            capacity: room.persons || room.capacity || (roomType === 'Suite' ? 4 : 2),
            nextAvailableDate: isBookable ? null : nextAvailableFromAPI
          };
        }
      } catch (err) {
        console.error(`Error checking availability for room ${room.type}:`, err);
        
        // Fallback pentru cazuri de eroare - calculează disponibilitatea determinist
        const totalRooms = calculateRoomAvailability(hotel, room.type);
        
        // Verifică în localStorage dacă avem o dată salvată pentru disponibilitate viitoare
        const savedNextAvailableDate = localStorage.getItem(`nextAvailable_${hotelId}_${room.type}`);
        let isBookable = totalRooms > 0;
        
        if (savedNextAvailableDate && !isBookable) {
          const nextDateObj = new Date(savedNextAvailableDate);
          const checkInDateObj = new Date(startDate);
          
          // Dacă check-in-ul este după sau egal cu data disponibilă, camera devine disponibilă
          if (checkInDateObj >= nextDateObj) {
            isBookable = true;
            console.log(`Room ${room.type} is available because check-in date (${startDate}) is on/after next available date (${savedNextAvailableDate})`);
          }
        }
        
        availability[room.type] = { 
          available: isBookable, 
          price: room.price,
          totalRooms: totalRooms,
          availableRooms: isBookable ? Math.max(1, totalRooms) : 0,
          capacity: room.persons || room.capacity || (room.type === 'Suite' ? 4 : 2),
          nextAvailableDate: isBookable ? null : endDate // Folosim data de checkout ca fallback
        };
      }
    }
    
    return availability;
  } catch (error) {
    console.error('Error checking room availability:', error);
    return {};
  }
};

/**
 * Verifică dacă un hotel are camere care pot găzdui un anumit număr de persoane
 * 
 * @param {object} hotel - Obiectul hotel
 * @param {number} guestCount - Numărul de persoane care trebuie găzduite
 * @returns {boolean} - true dacă hotelul poate găzdui numărul specificat de persoane
 */
export const canAccommodateGuests = (hotel, guestCount) => {
  if (!hotel) return false;
  
  // Pentru hoteluri cu date explicite despre camere
  if (hotel.rooms && Array.isArray(hotel.rooms)) {
    return hotel.rooms.some(room => {
      const capacity = room.capacity || room.persons || 0;
      return capacity >= guestCount;
    });
  }
  
  // Pentru hoteluri fără date explicite despre camere, folosim maxGuests dacă este disponibil
  if (hotel.maxGuests) {
    return hotel.maxGuests >= guestCount;
  }
  
  // Implicit - presupunem că hotelurile standard pot găzdui până la 4 persoane
  return guestCount <= 4;
};

/**
 * Generează o dată viitoare disponibilă pentru un hotel sau cameră indisponibilă
 * 
 * @param {Date} checkOutDate - Data actuală de checkout care este indisponibilă
 * @returns {string} - Data disponibilă în format YYYY-MM-DD
 */
export const generateNextAvailableDate = (checkOutDate) => {
  try {
    // Dacă avem o dată de checkout, aceeași zi este data disponibilă
    // pentru că checkout-ul este dimineața iar check-in-ul după-amiază
    if (checkOutDate) {
      // Asigurăm-ne că avem un obiect Date
      const checkOutDateObj = checkOutDate instanceof Date ? checkOutDate : new Date(checkOutDate);
      
      // Verifică dacă data este validă
      if (isNaN(checkOutDateObj.getTime())) {
        console.error('Invalid checkout date:', checkOutDate);
        const today = new Date();
        return today.toISOString().split('T')[0];
      }
      
      // Folosim direct data de checkout ca fiind următoarea disponibilă
      return checkOutDateObj.toISOString().split('T')[0];
    }
    
    // Altfel, folosim data curentă ca fallback
    const today = new Date();
    return today.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error generating next available date:', error);
    // În caz de eroare, returnăm data curentă
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
};

/**
 * Filtrează camerele disponibile în funcție de capacitate și disponibilitate
 * 
 * @param {object} hotel - Obiectul hotel
 * @param {object} roomAvailability - Obiect cu disponibilitatea fiecărei camere
 * @param {number} guestCount - Numărul de persoane care trebuie găzduite
 * @returns {object} - Obiect filtrat cu camerele disponibile care pot găzdui numărul de persoane
 */
export const filterAvailableRooms = (hotel, roomAvailability, guestCount) => {
  if (!hotel || !roomAvailability || !hotel.rooms) return {};
  
  const filteredAvailability = {};
  
  for (const room of hotel.rooms) {
    const roomType = room.type;
    const availability = roomAvailability[roomType];
    
    if (availability) {
      const capacity = room.capacity || room.persons || 2;
      const canAccommodate = capacity >= guestCount;
      
      if (canAccommodate) {
        filteredAvailability[roomType] = availability;
      }
    }
  }
  
  return filteredAvailability;
}; 