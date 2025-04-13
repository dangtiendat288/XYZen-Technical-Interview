import { getFirestore, doc, addDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, deleteDoc, DocumentData } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();

export interface Comment {
  id: string;
  text: string;
  username: string;
  userPhotoURL?: string;
  timestamp: Date;
  likes: number;
}

/**
 * Add a new comment to a post
 * @param videoId The ID of the post to comment on
 * @param commentText The comment text
 * @param userProfile User profile information
 * @returns Promise resolving to success status and comment ID
 */
export async function addComment(
  videoId: string,
  commentText: string,
  userProfile: {username?: string, photoURL?: string} | null
): Promise<{success: boolean, commentId?: string}> {
  try {
    if (!auth.currentUser || !commentText.trim()) {
      return { success: false };
    }

    const username = userProfile?.username || auth.currentUser.email?.split('@')[0] || 'anonymous';
    
    // Add the comment to Firestore
    const commentRef = await addDoc(collection(db, 'comments'), {
      videoId,
      text: commentText.trim(),
      userId: auth.currentUser.uid,
      username,
      userPhotoURL: userProfile?.photoURL || '',
      timestamp: serverTimestamp(),
      likes: 0
    });
    
    // Update comment count on the video document
    const videoRef = doc(db, 'posts', videoId);
    await updateDoc(videoRef, {
      comments: increment(1)
    });
    
    return { success: true, commentId: commentRef.id };
  } catch (error) {
    console.error('Error posting comment:', error);
    return { success: false };
  }
}

/**
 * Delete a comment from a post
 * @param commentId The ID of the comment to delete
 * @param videoId The ID of the post the comment belongs to
 * @returns Promise resolving to success status
 */
export async function deleteComment(
  commentId: string,
  videoId: string
): Promise<{success: boolean}> {
  try {
    if (!auth.currentUser) {
      return { success: false };
    }
    
    // Get the comment to verify ownership
    const commentRef = doc(db, 'comments', commentId);
    
    // Delete the comment
    await deleteDoc(commentRef);
    
    // Update comment count on the video document
    const videoRef = doc(db, 'posts', videoId);
    await updateDoc(videoRef, {
      comments: increment(-1)
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false };
  }
}

/**
 * Get comments for a specific post with real-time updates
 * @param videoId The ID of the post to get comments for
 * @param callback Callback function that receives comment updates
 * @returns Function to unsubscribe from the listener
 */
export function getCommentsWithRealTimeUpdates(
  videoId: string,
  callback: (comments: Comment[]) => void
): () => void {
  if (!videoId) {
    callback([]);
    return () => {};
  }
  
  const commentsRef = collection(db, 'comments');
  const commentsQuery = query(
    commentsRef,
    where('videoId', '==', videoId),
    orderBy('timestamp', 'desc')
  );
  
  const unsubscribe = onSnapshot(
    commentsQuery, 
    (snapshot) => {
      const commentsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          username: data.username || 'anonymous',
          userPhotoURL: data.userPhotoURL || '',
          timestamp: data.timestamp?.toDate() || new Date(),
          likes: data.likes || 0
        };
      });
      
      callback(commentsList);
    },
    (error) => {
      console.error('Error fetching comments:', error);
      callback([]);
    }
  );
  
  return unsubscribe;
}

/**
 * Toggle like status for a comment
 * @param commentId The ID of the comment to like/unlike
 * @param isCurrentlyLiked Current like status to determine action
 * @returns Promise with the new like status
 */
export async function toggleCommentLike(
  commentId: string,
  isCurrentlyLiked: boolean
): Promise<{ success: boolean; newLikeStatus: boolean }> {
  if (!auth.currentUser) {
    return { success: false, newLikeStatus: isCurrentlyLiked };
  }

  try {
    const commentRef = doc(db, "comments", commentId);
    
    // Update like count
    await updateDoc(commentRef, {
      likes: increment(isCurrentlyLiked ? -1 : 1)
    });
    
    return { success: true, newLikeStatus: !isCurrentlyLiked };
  } catch (error) {
    console.error("Error toggling comment like:", error);
    return { success: false, newLikeStatus: isCurrentlyLiked };
  }
}
