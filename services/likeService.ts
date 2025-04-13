import { getFirestore, doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();

/**
 * Check if a user has liked a specific post
 * @param postId The ID of the post to check
 * @returns Promise resolving to a boolean indicating like status
 */
export async function checkIfPostLiked(postId: string): Promise<boolean> {
  try {
    if (!auth.currentUser) {
      return false;
    }

    const userId = auth.currentUser.uid;
    
    // Method 1: Check user's likedPosts array (more efficient)
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists() && userDoc.data().likedPosts) {
      const likedPosts = userDoc.data().likedPosts || [];
      return likedPosts.includes(postId);
    }
    
    // Method 2: Check post's likedBy array
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (postDoc.exists() && postDoc.data().likedBy) {
      const likedBy = postDoc.data().likedBy || [];
      return likedBy.includes(userId);
    }

    return false;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
}

/**
 * Toggle like status for a post
 * @param postId The ID of the post to like/unlike
 * @param isCurrentlyLiked Current like status to determine action
 * @returns Promise with the new like status and count delta
 */
export async function togglePostLike(
  postId: string, 
  isCurrentlyLiked: boolean
): Promise<{ success: boolean; newLikeStatus: boolean; countDelta: number }> {
  if (!auth.currentUser) {
    console.log("User not logged in");
    return { success: false, newLikeStatus: isCurrentlyLiked, countDelta: 0 };
  }

  const userId = auth.currentUser.uid;
  const postRef = doc(db, "posts", postId);
  const userRef = doc(db, "users", userId);
  
  // New like status is the opposite of current
  const newLikeStatus = !isCurrentlyLiked;
  
  try {
    if (newLikeStatus) {
      // Like the post
      await updateDoc(postRef, {
        likes: increment(1),
        likedBy: arrayUnion(userId)
      });
      
      // Add to user's liked posts
      await updateDoc(userRef, {
        likedPosts: arrayUnion(postId)
      });
      
      return { success: true, newLikeStatus: true, countDelta: 1 };
    } else {
      // Unlike the post
      await updateDoc(postRef, {
        likes: increment(-1),
        likedBy: arrayRemove(userId)
      });
      
      // Remove from user's liked posts
      await updateDoc(userRef, {
        likedPosts: arrayRemove(postId)
      });
      
      return { success: true, newLikeStatus: false, countDelta: -1 };
    }
  } catch (error) {
    console.error("Error toggling like status:", error);
    
    // Handle field not existing errors
    try {
      // Fallback to just updating the likes counter
      await updateDoc(postRef, {
        likes: increment(newLikeStatus ? 1 : -1)
      });
      
      // Try to update the user document
      try {
        await updateDoc(userRef, {
          likedPosts: newLikeStatus ? arrayUnion(postId) : arrayRemove(postId)
        });
      } catch (userUpdateError) {
        console.error("Failed to update user liked posts:", userUpdateError);
      }
      
      return { success: true, newLikeStatus, countDelta: newLikeStatus ? 1 : -1 };
    } catch (fallbackError) {
      console.error("Failed even with fallback approach:", fallbackError);
      return { success: false, newLikeStatus: isCurrentlyLiked, countDelta: 0 };
    }
  }
}

/**
 * Get all posts liked by the current user
 * @returns Promise resolving to array of post IDs
 */
export async function getLikedPosts(): Promise<string[]> {
  try {
    if (!auth.currentUser) {
      return [];
    }

    const userId = auth.currentUser.uid;
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists() && userDoc.data().likedPosts) {
      return userDoc.data().likedPosts || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting liked posts:', error);
    return [];
  }
}
