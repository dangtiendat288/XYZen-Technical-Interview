import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment, addDoc, Timestamp, getDoc, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

// Interface for Feed Items
export interface FeedItem {
  id: string;
  artist: string;
  username: string;
  title: string;
  description: string;
  songTitle: string;
  likes: number;
  comments: number;
  shares: number;
  videoUri: string;
  thumbnail: string;
  isVerified: boolean;
  isFollowing: boolean;
  userId: string;
  createdAt: Date;
}

// Get feed items
export const getFeedItems = async (limitCount = 10): Promise<FeedItem[]> => {
  try {
    const feedRef = collection(db, 'posts');
    const q = query(feedRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const feedItems: FeedItem[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Get user info for the post
      const userDoc = await getDoc(doc(db, 'users', data.userId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      feedItems.push({
        id: docSnapshot.id,
        artist: userData.displayName || userData.username || 'Unknown artist',
        username: userData.username ? `@${userData.username}` : '@user',
        title: data.title || '',
        description: data.description || '',
        songTitle: data.songTitle || 'Untitled',
        likes: data.likeCount || 0,
        comments: data.commentCount || 0,
        shares: data.shareCount || 0,
        videoUri: data.videoUrl || '',
        thumbnail: data.thumbnailUrl || data.videoUrl || '',
        isVerified: userData.isVerified || false,
        isFollowing: false, // This would require a check against current user's following list
        userId: data.userId,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    }
    
    return feedItems;
  } catch (error) {
    console.error('Error getting feed items:', error);
    throw error;
  }
};

// Like a post
export const likePost = async (postId: string, userId: string) => {
  try {
    // First check if user already liked the post
    const likesRef = collection(db, 'likes');
    const q = query(likesRef, where('postId', '==', postId), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Add new like
      await addDoc(collection(db, 'likes'), {
        postId,
        userId,
        createdAt: Timestamp.now(),
      });
      
      // Update like count on post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likeCount: increment(1)
      });
      
      return true;
    } else {
      // User already liked the post
      return false;
    }
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
};

// Add a comment
export const addComment = async (postId: string, userId: string, text: string) => {
  try {
    // Add the comment
    await addDoc(collection(db, 'comments'), {
      postId,
      userId,
      text,
      createdAt: Timestamp.now(),
    });
    
    // Update comment count on post
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      commentCount: increment(1)
    });
    
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Upload media for a new post
export const uploadMedia = async (
  file: Blob, 
  userId: string, 
  metadata = { contentType: 'video/mp4' }
) => {
  return new Promise<string>((resolve, reject) => {
    const storageRef = ref(storage, `posts/${userId}/${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        // Track upload progress if needed
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload is ${progress}% done`);
      },
      (error) => {
        // Handle errors
        reject(error);
      },
      async () => {
        // Upload completed successfully
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

// Create a new post
export const createPost = async (
  userId: string,
  videoUrl: string,
  thumbnailUrl: string,
  title: string,
  description: string,
  songTitle: string
) => {
  try {
    const postData = {
      userId,
      videoUrl,
      thumbnailUrl,
      title,
      description,
      songTitle,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'posts'), postData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};
