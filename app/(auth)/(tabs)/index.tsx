import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Animated, TouchableOpacity, ViewToken, ListRenderItemInfo, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { COLORS, SIZES } from '@/constants/theme';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import VideoPlayer from '@/components/VideoPlayer';
import { Video, AVPlaybackStatus } from 'expo-av';
import { getLikedPosts } from '@/services/likeService';

// Firebase imports
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Get device dimensions for full-screen experience
const { width, height } = Dimensions.get('window');

// Define TypeScript interfaces for feed data
interface FeedItem {
  id: string;
  artist: string;
  username: string;
  title: string;
  description: string;
  songTitle?: string;
  likes: number;
  comments: number;
  shares: number;
  videoUri: string;
  thumbnail: string;
  isVerified: boolean;
  isFollowing?: boolean;
  userId: string; // Make userId required since we'll use it for username lookup
  collection?: string; // Add collection field
}

// Add an interface for user data
interface UserData {
  displayName?: string;
  username?: string;
  isVerified?: boolean;
}

// Cache for user data to prevent repeated lookups
interface UserCache {
  [userId: string]: UserData;
}

// Default empty state for feed
const EMPTY_FEED: FeedItem[] = [];

// Remove the ADMIN_UID constant since we're fetching all posts

export default function FeedScreen(): React.ReactElement {
  const { user } = useAuth();
  const router = useRouter();
  const [feedData, setFeedData] = useState<FeedItem[]>(EMPTY_FEED);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<Animated.FlatList<FeedItem>>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const videoRefs = useRef<{[key: string]: Video | null}>({}).current;
  const [playingVideos, setPlayingVideos] = useState<{[key: string]: boolean}>({});
  // Add reference to store the unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Get safe area insets and tab bar height
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  // Create a map of like animations for each item
  const likeAnimations = useRef<AnimationMap>({}).current;

  // Track liked status of posts
  const [likedStatus, setLikedStatus] = useState<Record<string, boolean>>({});

  // Add user cache to avoid repeated lookups
  const [userCache, setUserCache] = useState<UserCache>({});
  
  // Load liked status for posts - only use this to initialize the UI
  useEffect(() => {
    const loadLikedStatus = async () => {
      if (!user) return;
      
      try {
        const likedPosts = await getLikedPosts();
        const newLikedStatus: Record<string, boolean> = {};
        
        feedData.forEach(post => {
          newLikedStatus[post.id] = likedPosts.includes(post.id);
        });
        
        setLikedStatus(newLikedStatus);
      } catch (error) {
        console.error("Error loading liked status:", error);
      }
    };
    
    loadLikedStatus();
  }, [feedData, user]);

  // Function to get user data
  const getUserData = async (userId: string): Promise<UserData | null> => {
    // Check cache first
    if (userCache[userId]) {
      return userCache[userId];
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        // Update cache
        setUserCache(prev => ({
          ...prev,
          [userId]: userData
        }));
        return userData;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching user data for ${userId}:`, error);
      return null;
    }
  };

  // Fetch all posts from Firestore
  useEffect(() => {
    const fetchAllPosts = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Query all posts without filtering by user ID
        const postsRef = collection(db, 'posts');
        const postsQuery = query(
          postsRef,
          orderBy('timestamp', 'desc'),
          limit(20) // Increased limit to show more posts
        );
        
        // Set up a real-time listener for posts
        const unsubscribeListener = onSnapshot(postsQuery, 
          async (postsSnapshot) => {
            if (postsSnapshot.empty) {
              setFeedData(EMPTY_FEED);
              setLoading(false);
              return;
            }
            
            // Get all unique user IDs from posts to batch fetch user data
            const userIds = [...new Set(postsSnapshot.docs.map(doc => doc.data().userId))];
            
            // Prefetch user data for all user IDs that aren't in cache
            const userFetchPromises = userIds
              .filter(id => !userCache[id])
              .map(getUserData);
            
            // Wait for all user data to be fetched
            await Promise.all(userFetchPromises);
            
            // Transform the post data to match our FeedItem interface
            const posts = await Promise.all(postsSnapshot.docs.map(async (doc) => {
              const data = doc.data();
              const userId = data.userId;
              
              // Get user data (from cache or fetch it)
              let username = '@user'; // Default username
              let isVerified = false;
              
              if (userId) {
                const userData = await getUserData(userId);
                if (userData) {
                  username = userData.username ? `@${userData.username}` : 
                            (userData.displayName ? `@${userData.displayName.toLowerCase().replace(/\s+/g, '')}` : '@user');
                  isVerified = userData.isVerified || false;
                }
              }
              
              return {
                id: doc.id,
                artist: data.title || 'Unknown Artist',
                username: username,
                title: data.title || 'Untitled',
                description: data.description || '',
                likes: data.likes || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                videoUri: data.mediaUrl || '',
                thumbnail: data.thumbnailUrl || 'https://via.placeholder.com/640x360/000000/FFFFFF?text=Video',
                isVerified: isVerified,
                isFollowing: false,
                userId: userId,
                collection: data.collection || ''
              };
            }));
            
            setFeedData(posts);
            
            // Initialize animation and playback state for each item
            const newLikeAnimations: AnimationMap = {};
            const newPlayingVideos: {[key: string]: boolean} = {};
            
            posts.forEach(post => {
              newLikeAnimations[post.id] = new Animated.Value(1);
              newPlayingVideos[post.id] = false;
            });
            
            // Play the first video if there are any posts
            if (posts.length > 0) {
              newPlayingVideos[posts[0].id] = true;
            }
            
            // Update the animation and playback references
            Object.assign(likeAnimations, newLikeAnimations);
            setPlayingVideos(newPlayingVideos);
            
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching posts:', error);
            setError('Failed to load feed. Please try again.');
            setLoading(false);
          }
        );
        
        // Store the unsubscribe function in the ref
        unsubscribeRef.current = unsubscribeListener;
      } catch (err) {
        console.error('Error setting up posts listener:', err);
        setError('Failed to load feed. Please try again.');
        setLoading(false);
      }
    };
    
    // Call the function
    fetchAllPosts();
    
    // Clean up the listener when component unmounts
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user, userCache]);

  // Handle scroll events to determine active video
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  // Handle viewable items change in FlatList
  const handleViewableItemsChanged = useCallback(
    (info: ViewableItemsChangedInfo) => {
      if (info.viewableItems.length > 0 && info.viewableItems[0].index !== null) {
        const newIndex = info.viewableItems[0].index;
        setActiveIndex(newIndex);
        
        // Play the current video and pause others
        const newPlayingState = {...playingVideos};
        
        // First set all to false
        Object.keys(newPlayingState).forEach(id => {
          newPlayingState[id] = false;
        });
        
        // Then set the active one to true
        if (info.viewableItems[0].item && info.viewableItems[0].item.id) {
          const activeItemId = info.viewableItems[0].item.id;
          newPlayingState[activeItemId] = true;
          
          // Play the active video
          if (videoRefs[activeItemId]) {
            videoRefs[activeItemId]?.playAsync();
          }
        }
        
        setPlayingVideos(newPlayingState);
      }
    },
    [playingVideos, videoRefs]
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  // Update the local liked status when VideoPlayer triggers a like (for UI consistency only)
  const handleLikeChange = (postId: string, isLiked: boolean) => {
    // Update the liked status map
    setLikedStatus(prev => ({
      ...prev,
      [postId]: isLiked
    }));
  };

  // Render individual video card using the shared VideoPlayer component
  const renderVideoCard = useCallback(({ item, index }: ListRenderItemInfo<FeedItem>) => {
    // Get the pre-created animation value for this item
    const likeAnimation = likeAnimations[item.id];
    const isPlaying = index === activeIndex;
    const isLiked = likedStatus[item.id] || false;
    
    // Add collection tag if available
    const description = item.collection 
      ? `${item.description}\n#${item.collection.replace(/\s+/g, '')}`
      : item.description;
    
    const handlePlayPause = () => {
      const video = videoRefs[item.id];
      if (video) {
        if (playingVideos[item.id]) {
          video.pauseAsync();
        } else {
          video.playAsync();
        }
        
        // Update playing state
        setPlayingVideos({
          ...playingVideos,
          [item.id]: !playingVideos[item.id]
        });
      }
    };

    return (
      <VideoPlayer
        id={item.id}
        videoUri={item.videoUri}
        thumbnail={item.thumbnail}
        isPlaying={playingVideos[item.id] || false}
        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            // You can handle additional video events here if needed
          }
        }}
        likeAnimation={likeAnimation}
        artist={item.artist}
        username={item.username}
        description={description}
        title={item.songTitle || item.title}
        likes={item.likes}
        comments={item.comments}
        shares={item.shares}
        isVerified={item.isVerified}
        isLiked={isLiked}
        onPlayPause={handlePlayPause}
        onLikePress={(newStatus) => handleLikeChange(item.id, newStatus)}
        containerHeight={height - tabBarHeight}
        showBackButton={false}
      />
    );
  }, [activeIndex, likeAnimations, playingVideos, tabBarHeight, videoRefs, likedStatus]);

  // If loading, show loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <ThemedText style={styles.loadingText}>Loading videos...</ThemedText>
      </View>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.primary} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setFeedData(EMPTY_FEED)}
        >
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // If no posts found, show empty state
  if (feedData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-outline" size={48} color={COLORS.primary} />
        <ThemedText style={styles.emptyText}>No videos found</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header overlay with gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']}
        style={styles.headerGradient}
        pointerEvents="none"
      >
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>For You</ThemedText>
          <View style={styles.headerIndicator} />
          <ThemedText type="title" style={styles.headerTitleInactive}>Following</ThemedText>
        </View>
      </LinearGradient>

      {/* Main feed content */}
      <Animated.FlatList
        ref={flatListRef}
        data={feedData}
        renderItem={renderVideoCard}
        keyExtractor={(item: FeedItem) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height - tabBarHeight} // Adjust snap interval
        snapToAlignment="start"
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={handleViewableItemsChanged}
        onScroll={handleScroll}
        style={styles.feedList}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerTitleInactive: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  headerIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginHorizontal: 8,
  },
  feedList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.white,
  },
});