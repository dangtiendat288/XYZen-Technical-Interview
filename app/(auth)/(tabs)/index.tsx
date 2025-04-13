import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Image, Animated, TouchableOpacity, ViewToken, ListRenderItemInfo } from 'react-native';
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

// Get device dimensions for full-screen experience
const { width, height } = Dimensions.get('window');

// Define TypeScript interfaces for feed data
interface FeedItem {
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
}

interface AnimationMap {
  [key: string]: Animated.Value;
}

interface ViewableItemsChangedInfo {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

// Mock data for the feed
const MOCK_FEED_DATA: FeedItem[] = [
  {
    id: '1',
    artist: 'Adele',
    username: '@adele',
    title: 'New album preview',
    description: 'Sneak peek at my upcoming album. What do you think?',
    songTitle: 'Echoes of Tomorrow',
    likes: 1.2, // in millions
    comments: 45.3, // in thousands
    shares: 12.4, // in thousands
    videoUri: 'https://example.com/video1.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
    isVerified: true,
    isFollowing: true,
  },
  {
    id: '2',
    artist: 'The Weeknd',
    username: '@theweeknd',
    title: 'Studio session',
    description: 'Late night vibes while working on something special',
    songTitle: 'Midnight Confessions',
    likes: 890, // in thousands
    comments: 32.1, // in thousands
    shares: 15.7, // in thousands
    videoUri: 'https://example.com/video2.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
    isVerified: true,
    isFollowing: false,
  },
  {
    id: '3',
    artist: 'Billie Eilish',
    username: '@billieeilish',
    title: 'Unreleased track',
    description: 'Trying something new. Thoughts?',
    songTitle: 'Whispers in the Dark',
    likes: 2.4, // in millions
    comments: 78.5, // in thousands
    shares: 45.1, // in thousands
    videoUri: 'https://example.com/video3.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81',
    isVerified: true,
    isFollowing: true,
  },
];

export default function FeedScreen(): React.ReactElement {
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<Animated.FlatList<FeedItem>>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const videoRefs = useRef<{[key: string]: Video | null}>({}).current;
  const [playingVideos, setPlayingVideos] = useState<{[key: string]: boolean}>(
    MOCK_FEED_DATA.reduce((acc, item) => {
      acc[item.id] = false;
      return acc;
    }, {} as {[key: string]: boolean})
  );
  
  // Get safe area insets and tab bar height
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  // Create a map of like animations for each item
  const likeAnimations = useRef<AnimationMap>(
    MOCK_FEED_DATA.reduce((acc: AnimationMap, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {})
  ).current;

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
        data={MOCK_FEED_DATA}
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
});