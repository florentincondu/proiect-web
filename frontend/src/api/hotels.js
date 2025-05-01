import axios from 'axios';
import { API_URL } from './config';

/**
 * Încarcă imaginile pentru un hotel
 * @param {File[]} images - Array de fișiere imagine pentru încărcare
 * @param {string} token - Token-ul de autentificare
 * @returns {Promise<string[]>} - Array de URL-uri ale imaginilor încărcate
 */
export const uploadHotelImages = async (images, token) => {
  try {
    const formData = new FormData();
    
    // Adăugam fiecare imagine la formData
    images.forEach(image => {
      formData.append('hotelImages', image);
    });
    
    const response = await axios.post(
      `${API_URL}/api/hotels/upload-images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    if (response.data.success) {
      return response.data.imageUrls;
    } else {
      throw new Error(response.data.message || 'Eroare la încărcarea imaginilor');
    }
  } catch (error) {
    console.error('Eroare la încărcarea imaginilor:', error);
    throw error;
  }
}; 