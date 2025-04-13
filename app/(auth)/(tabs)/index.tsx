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

// Firebase imports
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
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
}

interface AnimationMap {
  [key: string]: Animated.Value;
}

interface ViewableItemsChangedInfo {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

// Default empty state for feed
const EMPTY_FEED: FeedItem[] = [];

// Define admin UID directly for more efficient querying
const ADMIN_UID = 'dPBw1hnBrEM4MKiALDaix1hk5E83';

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

  // Fetch admin posts from Firestore
  useEffect(() => {
    const fetchAdminPosts = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use the admin UID directly instead of querying for it
        const postsRef = collection(db, 'posts');
        const postsQuery = query(
          postsRef,
          where('userId', '==', ADMIN_UID),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        // Set up a real-time listener for posts
        const unsubscribeListener = onSnapshot(postsQuery, 
          (postsSnapshot) => {
            if (postsSnapshot.empty) {
              setFeedData(EMPTY_FEED);
              setLoading(false);
              return;
            }
            
            // Transform the post data to match our FeedItem interface
            const posts = postsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                artist: data.title || 'Unknown Artist',
                username: `@${data.username || 'admin'}`,
                title: data.title || 'Untitled',
                description: data.description || '',
                likes: data.likes || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                videoUri: data.mediaUrl || '',
                thumbnail: data.thumbnailUrl || 'https://via.placeholder.com/640x360/000000/FFFFFF?text=Video',
                isVerified: true,
                isFollowing: false
              };
            });
            
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
            console.error('Error fetching admin posts:', error);
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
    
    // Call the function without storing its return value
    fetchAdminPosts();
    
    // Clean up the listener when component unmounts
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user]);

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

  // Render individual video card using the shared VideoPlayer component
  const renderVideoCard = useCallback(({ item, index }: ListRenderItemInfo<FeedItem>) => {
    // Get the pre-created animation value for this item
    const likeAnimation = likeAnimations[item.id];
    const isPlaying = index === activeIndex;
    
    const handleLikePress = () => {
      Animated.sequence([
        Animated.timing(likeAnimation, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(likeAnimation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    };
    
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
        description={item.description}
        title={item.songTitle}
        likes={item.likes}
        comments={item.comments}
        shares={item.shares}
        isVerified={item.isVerified}
        onPlayPause={handlePlayPause}
        onLikePress={handleLikePress}
        containerHeight={height - tabBarHeight}
        showBackButton={false}
      />
    );
  }, [activeIndex, likeAnimations, playingVideos, tabBarHeight, videoRefs]);

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