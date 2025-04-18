const calculateTotalPrice = () => {
  if (!hotel || !hotel.rooms) return 0;
  
  const room = hotel.rooms.find(r => r.id === selectedRoom);
  const roomPrice = room && typeof room.price === 'number' ? room.price : hotel.basePrice;
  

  const nightsCount = dates && dates.start && dates.end 
    ? Math.max(1, Math.ceil((new Date(dates.end) - new Date(dates.start)) / (1000 * 60 * 60 * 24)))
    : 1;
  
  return roomPrice * nightsCount * (adults + children * 0.5);
};


const PriceDisplay = () => {
  const room = hotel.rooms.find(r => r.id === selectedRoom);
  const roomPrice = room && typeof room.price === 'number' ? room.price : hotel.basePrice;
  
  return (
    <div className="price-container">
      <span className="price">{roomPrice} RON</span>
      <span className="night">/noapte</span>
    </div>
  );
}; 