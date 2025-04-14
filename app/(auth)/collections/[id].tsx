import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import VideoPlayer from '@/components/VideoPlayer';
import AddClipsModal from '@/components/collection/AddClipsModal';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';

// Get device dimensions
const { width, height } = Dimensions.get('window');

// Define interfaces for our data types
interface CollectionData {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  itemCount: number;
  createdBy: string;
}

interface PostData {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string;
  userId: string;
  timestamp: any;
  likes: number;
  comments: number;
  collection?: string;
}

export default function CollectionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [showFullView, setShowFullView] = useState(false);
  const [playingVideos, setPlayingVideos] = useState<{[key: string]: boolean}>({});
  const videoRefs = useRef<{[key: string]: Video | null}>({}).current;
  const [likeAnimations, setLikeAnimations] = useState<{[key: string]: Animated.Value}>({});
  
  // For adding clips to collection
  const [showAddClipModal, setShowAddClipModal] = useState(false);
  const [availableClips, setAvailableClips] = useState<PostData[]>([]);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [addingClips, setAddingClips] = useState(false);

  // Fetch collection data and posts
  useEffect(() => {
    const fetchCollectionData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const db = getFirestore();
        
        // Get collection data
        const collectionRef = doc(db, 'collections', id as string);
        const collectionSnap = await getDoc(collectionRef);
        
        if (!collectionSnap.exists()) {
          console.error('Collection not found');
          router.back();
          return;
        }
        
        const collectionDocData = collectionSnap.data();
        setCollectionData({
          id: collectionSnap.id,
          title: collectionDocData.title || 'Untitled Collection',
          description: collectionDocData.description || '',
          coverImage: collectionDocData.coverImage || 'https://via.placeholder.com/300',
          itemCount: collectionDocData.itemCount || 0,
          createdBy: collectionDocData.createdBy || '',
        });
        
        // Get posts in this collection
        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('collection', '==', collectionDocData.title)
        );
        
        const querySnapshot = await getDocs(q);
        const postsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled',
            description: data.description || '',
            mediaUrl: data.mediaUrl || '',
            thumbnailUrl: data.thumbnailUrl || 'https://via.placeholder.com/300',
            userId: data.userId || '',
            timestamp: data.timestamp || null,
            likes: data.likes || 0,
            comments: data.comments || 0,
            collection: data.collection,
          };
        });
        
        setPosts(postsData);

        // Initialize video playback and animation states
        const newPlayingVideos: {[key: string]: boolean} = {};
        const newLikeAnimations: {[key: string]: Animated.Value} = {};
        
        postsData.forEach(post => {
          newPlayingVideos[post.id] = false;
          newLikeAnimations[post.id] = new Animated.Value(1);
        });
        
        setPlayingVideos(newPlayingVideos);
        setLikeAnimations(newLikeAnimations);
      } catch (error) {
        console.error('Error fetching collection data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, [id, router]);

  // Fetch available clips for the add clip modal
  const fetchAvailableClips = async () => {
    if (!user?.uid || !collectionData?.title) return;
    
    try {
      setAddingClips(true);
      
      // Get user's posts that aren't in this collection
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('userId', '==', user.uid),
      );
      
      const querySnapshot = await getDocs(q);
      const allUserPosts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Untitled',
          description: data.description || '',
          mediaUrl: data.mediaUrl || '',
          thumbnailUrl: data.thumbnailUrl || 'https://via.placeholder.com/300',
          userId: data.userId || '',
          timestamp: data.timestamp || null,
          likes: data.likes || 0,
          comments: data.comments || 0,
          collection: data.collection,
        };
      });
      
      // Filter out posts that are already in this collection
      const availablePosts = allUserPosts.filter(
        post => post.collection !== collectionData.title
      );
      
      setAvailableClips(availablePosts);
      setSelectedClips([]);
    } catch (error) {
      console.error('Error fetching available clips:', error);
    } finally {
      setAddingClips(false);
    }
  };

  // Toggle clip selection
  const handleToggleClipSelection = (clipId: string) => {
    setSelectedClips(prev => {
      if (prev.includes(clipId)) {
        return prev.filter(id => id !== clipId);
      } else {
        return [...prev, clipId];
      }
    });
  };

  // Add selected clips to collection
  const handleAddClipsToCollection = async () => {
    if (selectedClips.length === 0 || !collectionData?.title || !id) return;
    
    try {
      setAddingClips(true);
      
      // Update each post's collection field
      for (const clipId of selectedClips) {
        const postRef = doc(db, 'posts', clipId);
        await updateDoc(postRef, {
          collection: collectionData.title
        });
      }
      
      // Update collection's item count
      const collectionRef = doc(db, 'collections', id as string);
      await updateDoc(collectionRef, {
        itemCount: increment(selectedClips.length)
      });
      
      // Refresh the posts list
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('collection', '==', collectionData.title)
      );
      
      const querySnapshot = await getDocs(q);
      const postsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Untitled',
          description: data.description || '',
          mediaUrl: data.mediaUrl || '',
          thumbnailUrl: data.thumbnailUrl || 'https://via.placeholder.com/300',
          userId: data.userId || '',
          timestamp: data.timestamp || null,
          likes: data.likes || 0,
          comments: data.comments || 0,
          collection: data.collection,
        };
      });
      
      setPosts(postsData);
      
      // Update local collection data
      setCollectionData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          itemCount: prev.itemCount + selectedClips.length
        };
      });
      
      // Close the modal
      setShowAddClipModal(false);
    } catch (error) {
      console.error('Error adding clips to collection:', error);
    } finally {
      setAddingClips(false);
    }
  };

  // Check if current user is the collection owner
  const isCollectionOwner = user?.uid === collectionData?.createdBy;

  // Handle post selection for full-view mode
  const handlePostPress = (post: PostData, index: number) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
    setShowFullView(true);
    
    // Pause all videos in grid view
    Object.keys(videoRefs).forEach(id => {
      if (videoRefs[id]) {
        videoRefs[id]?.pauseAsync();
      }
    });
    
    // Set the selected video to play in full view
    const newPlayingState = {...playingVideos};
    Object.keys(newPlayingState).forEach(id => {
      newPlayingState[id] = false;
    });
    newPlayingState[post.id] = true;
    setPlayingVideos(newPlayingState);
  };
  
  // Play/pause toggle for full view
  const handlePlayPause = (postId: string) => {
    const video = videoRefs[postId];
    if (video) {
      if (playingVideos[postId]) {
        video.pauseAsync();
      } else {
        video.playAsync();
      }
      
      // Update playing state
      setPlayingVideos({
        ...playingVideos,
        [postId]: !playingVideos[postId]
      });
    }
  };

  // Handle like animation
  const handleLikePress = (postId: string) => {
    const animation = likeAnimations[postId];
    if (animation) {
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Handle sharing
  const handleShare = async (post: PostData) => {
    try {
      await Share.share({
        message: `Check out this awesome clip: ${post.title}\n${post.mediaUrl}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Exit full-view mode
  const handleCloseFullView = () => {
    setShowFullView(false);
    
    // Pause the video that was playing in full view
    if (selectedPost) {
      const video = videoRefs[selectedPost.id];
      if (video) {
        video.pauseAsync();
      }
      
      setPlayingVideos({
        ...playingVideos,
        [selectedPost.id]: false
      });
    }
  };

  // Navigate to user profile
  const goToUserProfile = (userId: string) => {
    if (userId) {
      router.push({
        pathname: '/profile',
        params: { userId }
      });
    }
  };

  // Render each post in the grid
  const renderPostItem = ({ item, index }: { item: PostData; index: number }) => (
    <TouchableOpacity 
      style={styles.postItem} 
      onPress={() => handlePostPress(item, index)}
    >
      <Image 
        source={{ uri: item.thumbnailUrl }} 
        style={styles.postThumbnail}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
      >
        <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={14} color="#1DB954" />
            <Text style={styles.statText}>{item.likes}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={14} color="#1DB954" />
            <Text style={styles.statText}>{item.comments}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render the full-screen post viewer
  const renderFullPostView = () => {
    if (!selectedPost) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showFullView}
        onRequestClose={handleCloseFullView}
      >
        <View style={styles.fullViewContainer}>
          <StatusBar style="light" />
          
          {/* Header */}
          <View style={styles.fullViewHeader}>
            <TouchableOpacity onPress={handleCloseFullView} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.fullViewTitle}>{selectedPost.title}</Text>
            <TouchableOpacity onPress={() => handleShare(selectedPost)} style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* Video - Fix animation props */}
          <VideoPlayer
            id={selectedPost.id}
            videoUri={selectedPost.mediaUrl}
            thumbnail={selectedPost.thumbnailUrl}
            isPlaying={playingVideos[selectedPost.id] || false}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                // Handle playback status updates
              }
            }}
            showBackButton={false}
            artist={collectionData?.title || 'Unknown Collection'}
            title={selectedPost.title}
            description={selectedPost.description}
            likes={selectedPost.likes}
            comments={selectedPost.comments}
            shares={0}
            isLiked={false}
            username="@user"
            isVerified={false}
            containerHeight={height}
            onPlayPause={() => handlePlayPause(selectedPost.id)}
            onLikePress={() => handleLikePress(selectedPost.id)}
            onUsernamePress={() => goToUserProfile(selectedPost.userId)}
            likeAnimation={likeAnimations[selectedPost.id]}
          />
          
          {/* Removed pagination dots */}
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading collection...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {collectionData?.title || 'Collection'}
        </Text>
        {isCollectionOwner && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              fetchAvailableClips();
              setShowAddClipModal(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={28} color="#1DB954" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Collection Info */}
      <View style={styles.collectionInfo}>
        <Image 
          source={{ uri: collectionData?.coverImage }} 
          style={styles.collectionCover}
        />
        <View style={styles.collectionDetails}>
          <Text style={styles.collectionTitle}>{collectionData?.title}</Text>
          <Text style={styles.collectionDescription} numberOfLines={2}>
            {collectionData?.description || 'No description'}
          </Text>
          <Text style={styles.itemCount}>{posts.length} clips</Text>
        </View>
      </View>
      
      {/* Posts Grid */}
      {posts.length > 0 ? (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.postsGrid}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes" size={64} color="#666" />
          <Text style={styles.emptyText}>
            No clips in this collection yet
            {isCollectionOwner && ' - tap the + button to add clips'}
          </Text>
        </View>
      )}
      
      {/* Full Post View Modal */}
      {renderFullPostView()}
      
      {/* Add Clip Modal */}
      <AddClipsModal
        visible={showAddClipModal}
        collectionTitle={collectionData?.title || ''}
        availableClips={availableClips}
        selectedClips={selectedClips}
        loading={addingClips}
        onClose={() => setShowAddClipModal(false)}
        onAddClips={handleAddClipsToCollection}
        onToggleClipSelection={handleToggleClipSelection}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 38,
    height: 38,
  },
  collectionInfo: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  collectionCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  collectionDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  collectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  collectionDescription: {
    fontSize: 14,
    color: '#B3B3B3',
    marginBottom: 6,
  },
  itemCount: {
    fontSize: 12,
    color: '#1DB954',
  },
  postsGrid: {
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  postItem: {
    flex: 1/3,
    aspectRatio: 0.75,
    margin: 3,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  postThumbnail: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    height: '40%',
    justifyContent: 'flex-end',
  },
  postTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#B3B3B3',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  fullViewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullViewHeader: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    padding: 5,
  },
  fullViewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  shareButton: {
    padding: 5,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    margin: 4,
  },
  activePaginationDot: {
    backgroundColor: '#1DB954',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Styles for the add button
  addButton: {
    padding: 5,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
