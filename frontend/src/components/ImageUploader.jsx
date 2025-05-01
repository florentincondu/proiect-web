import React, { useState, useRef } from 'react';
import { uploadHotelImages } from '../api/hotels';
import { useSelector } from 'react-redux';

/**
 * Component pentru încărcarea imaginilor
 * @param {Object} props
 * @param {Function} props.onImagesUploaded - Callback apelat după încărcarea cu succes a imaginilor
 */
const ImageUploader = ({ onImagesUploaded }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  
  const { token } = useSelector(state => state.auth);
  
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Verificări pentru fișiere
    const validFiles = files.filter(file => {
      // Verificăm dacă este imagine
      if (!file.type.match('image.*')) {
        setError('Vă rugăm să selectați doar fișiere imagine (JPEG, PNG, etc.)');
        return false;
      }
      
      // Verificăm dimensiunea (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Dimensiunea imaginii nu poate depăși 5MB');
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    setError('');
    setSelectedFiles(validFiles);
    
    // Generăm previzualizări
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Vă rugăm să selectați cel puțin o imagine');
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    try {
      const imageUrls = await uploadHotelImages(selectedFiles, token);
      onImagesUploaded(imageUrls);
      
      // Reset după încărcare
      setSelectedFiles([]);
      setPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.message || 'Eroare la încărcarea imaginilor');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemovePreview = (index) => {
    const newPreviews = [...previews];
    const newSelectedFiles = [...selectedFiles];
    
    // Eliberăm URL-ul pentru previzualizare
    URL.revokeObjectURL(newPreviews[index]);
    
    newPreviews.splice(index, 1);
    newSelectedFiles.splice(index, 1);
    
    setPreviews(newPreviews);
    setSelectedFiles(newSelectedFiles);
  };
  
  return (
    <div className="image-uploader-container">
      <div className="file-input-container">
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
        />
        <button 
          type="button" 
          className="upload-button"
          onClick={() => fileInputRef.current.click()}
        >
          Selectează imagini
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {previews.length > 0 && (
        <div className="previews-container">
          <h4>Imagini selectate ({previews.length})</h4>
          <div className="previews-grid">
            {previews.map((preview, index) => (
              <div key={index} className="preview-item">
                <img src={preview} alt={`Preview ${index}`} />
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => handleRemovePreview(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            className="submit-button"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Se încarcă...' : 'Încarcă imaginile'}
          </button>
        </div>
      )}
      
      <style jsx>{`
        .image-uploader-container {
          margin-bottom: 20px;
        }
        
        .file-input {
          display: none;
        }
        
        .upload-button, .submit-button {
          padding: 8px 16px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }
        
        .upload-button:hover, .submit-button:hover {
          background-color: #2980b9;
        }
        
        .upload-button:disabled, .submit-button:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #e74c3c;
          margin-top: 8px;
          font-size: 14px;
        }
        
        .previews-container {
          margin-top: 16px;
        }
        
        .previews-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 12px;
          margin-bottom: 16px;
        }
        
        .preview-item {
          position: relative;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          height: 150px;
        }
        
        .preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .remove-button {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.8);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #e74c3c;
        }
        
        .submit-button {
          margin-top: 12px;
          background-color: #27ae60;
        }
        
        .submit-button:hover {
          background-color: #219653;
        }
      `}</style>
    </div>
  );
};

export default ImageUploader; 