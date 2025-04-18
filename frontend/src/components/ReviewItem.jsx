import { useState, useEffect } from 'react';
import { AiFillStar, AiOutlineStar, AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { FaThumbsUp, FaRegThumbsUp, FaReply, FaSpinner } from 'react-icons/fa';
import { BsChat } from 'react-icons/bs';
import axios from 'axios';
import { useAuth } from '../context/authContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ReviewItem = ({ review, hotelId }) => {
  const { isAuthenticated, user } = useAuth();
  const [reactions, setReactions] = useState({ likes: 0, hearts: 0 });
  const [userReactions, setUserReactions] = useState({ likes: false, hearts: false });
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);


  useEffect(() => {
    if (review._id) {
      fetchReactions();
      fetchComments();
    }
  }, [review._id]);


  useEffect(() => {
    if (comments.length > 0 && !showComments) {
      setShowComments(true);
    }
  }, [comments]);

  const fetchReactions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reviews/${review._id}/reactions`, {
        headers: {
          Authorization: isAuthenticated ? `Bearer ${localStorage.getItem('token')}` : ''
        }
      });
      setReactions({
        likes: response.data.likes,
        hearts: response.data.hearts
      });
      setUserReactions(response.data.userReactions || { likes: false, hearts: false });
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const fetchComments = async () => {
    if (commentsLoaded) return; // Don't fetch if already loaded
    
    setIsFetching(true);
    try {
      console.log('Fetching comments for review:', review._id);
      const response = await axios.get(`${API_BASE_URL}/api/reviews/${review._id}/comments`);
      console.log('Comments response:', response.data);
      
      if (response.data && response.data.comments) {
        setComments(response.data.comments);
        setCommentsLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setIsFetching(false);
    }
  };

  const toggleComments = () => {
    setShowComments(prev => !prev);
    

    if (!showComments && !commentsLoaded && !isFetching) {
      fetchComments();
    }
  };

  const handleReaction = async (type) => {
    if (!isAuthenticated) {
      alert('Trebuie să fiți autentificat pentru a reacționa la recenzii');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/reviews/${review._id}/reaction`,
        { type },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );


      setReactions(prev => ({
        ...prev,
        [type]: response.data.reactionCount
      }));
      
      setUserReactions(prev => ({
        ...prev,
        [type]: response.data.hasReacted
      }));
    } catch (error) {
      console.error(`Error toggling ${type} reaction:`, error);
      alert(`A apărut o eroare la procesarea reacției. Vă rugăm să încercați din nou.`);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Trebuie să fiți autentificat pentru a adăuga comentarii');
      return;
    }
    
    if (!newComment.trim()) {
      return;
    }
    
    setIsSubmittingComment(true);
    try {
      console.log('Submitting comment to review:', review._id, 'Text:', newComment);
      const response = await axios.post(
        `${API_BASE_URL}/api/reviews/${review._id}/comments`,
        { text: newComment },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      console.log('Comment submit response:', response.data);
      

      if (response.data && response.data.comment) {
        setComments(prev => [response.data.comment, ...prev]);
        setNewComment(''); // Clear input
        

        setCommentsLoaded(true);
        

        if (!showComments) {
          setShowComments(true);
        }
      } else {
        console.error('Received invalid response format when submitting comment');
        alert('A apărut o eroare la trimiterea comentariului. Vă rugăm să încercați din nou.');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('A apărut o eroare la trimiterea comentariului. Vă rugăm să încercați din nou.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!isAuthenticated) return;
    
    if (!confirm('Sigur doriți să ștergeți acest comentariu?')) return;
    
    try {
      await axios.delete(
        `${API_BASE_URL}/api/reviews/${review._id}/comments/${commentId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      

      setComments(prev => prev.filter(comment => comment._id !== commentId));
      

      if (comments.length <= 1) {


      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('A apărut o eroare la ștergerea comentariului.');
    }
  };

  const canDeleteComment = (comment) => {
    if (!isAuthenticated || !user) return false;
    return user._id === comment.user._id || user.role === 'admin';
  };

  return (
    <div className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium">{review.user?.name || 'Utilizator anonim'}</h4>
          <div className="text-xs text-gray-400">
            {new Date(review.createdAt).toLocaleDateString('ro-RO', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
            {review.isVerifiedStay && (
              <span className="ml-2 bg-green-900/50 text-green-400 px-2 py-0.5 rounded text-xs">
                Sejur verificat
              </span>
            )}
          </div>
        </div>
        <div className="flex text-yellow-400">
          {[...Array(5)].map((_, i) => (
            <span key={i}>
              {i < review.rating ? <AiFillStar /> : <AiOutlineStar />}
            </span>
          ))}
        </div>
      </div>
      
      {review.title && (
        <h5 className="font-medium mb-2">{review.title}</h5>
      )}
      
      <p className="text-gray-300 mb-3">{review.comment}</p>
      
      {/* Reactions and comments */}
      <div className="mt-4 border-t border-gray-700 pt-3">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => handleReaction('likes')}
            className={`flex items-center space-x-1 text-sm ${userReactions.likes ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-400 transition`}
            aria-label={userReactions.likes ? "Remove like" : "Like this review"}
          >
            {userReactions.likes ? <FaThumbsUp /> : <FaRegThumbsUp />}
            <span>{reactions.likes}</span>
          </button>
          
          <button 
            onClick={() => handleReaction('hearts')}
            className={`flex items-center space-x-1 text-sm ${userReactions.hearts ? 'text-red-400' : 'text-gray-400'} hover:text-red-400 transition`}
            aria-label={userReactions.hearts ? "Remove heart" : "Heart this review"}
          >
            {userReactions.hearts ? <AiFillHeart /> : <AiOutlineHeart />}
            <span>{reactions.hearts}</span>
          </button>
          
          <button 
            onClick={toggleComments}
            className={`flex items-center space-x-1 text-sm ${
              comments.length > 0 ? 'text-blue-400' : 'text-gray-400'
            } hover:text-gray-300 transition`}
            aria-label={showComments ? "Hide comments" : "Show comments"}
          >
            <BsChat />
            <span>Comentarii {comments.length > 0 && `(${comments.length})`}</span>
          </button>
        </div>
        
        {/* Comments section with animation */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showComments ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="mt-3 space-y-3">
            {/* Comment form */}
            {isAuthenticated && (
              <form onSubmit={handleSubmitComment} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adaugă un comentariu..."
                  className="flex-grow px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors"
                  disabled={isSubmittingComment}
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center w-10 h-10"
                >
                  {isSubmittingComment ? <FaSpinner className="animate-spin" /> : <FaReply />}
                </button>
              </form>
            )}
            
            {/* Comments list with improved loading state */}
            {isFetching ? (
              <div className="text-center py-4 text-gray-400 flex justify-center items-center">
                <FaSpinner className="animate-spin mr-2" />
                <span>Se încarcă comentariile...</span>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map(comment => (
                  <div key={comment._id} className="bg-gray-800/80 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                    <div className="flex justify-between">
                      <div className="font-medium text-sm">{comment.user.name}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString('ro-RO', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                    <p className="text-sm mt-1">{comment.text}</p>
                    
                    {canDeleteComment(comment) && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
                      >
                        Șterge
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-gray-400 italic">Nu există comentarii încă</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewItem; 