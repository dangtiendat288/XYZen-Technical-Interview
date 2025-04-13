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

  const handleViewableItemsChanged = useCallback(
    (info: ViewableItemsChangedInfo) => {
      if (info.viewableItems.length > 0 && info.viewableItems[0].index !== null) {
        setActiveIndex(info.viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  // Render individual video card
  const renderVideoCard = useCallback(({ item, index }: ListRenderItemInfo<FeedItem>) => {
    // Get the pre-created animation value for this item
    const likeAnimation = likeAnimations[item.id];
    const isActive = index === activeIndex;
    
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

    return (
      <View style={[
        styles.videoContainer,
        { height: height - tabBarHeight } // Adjust height to account for tab bar
      ]}>
        {/* Video/Image Background */}
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.videoBackground}
          resizeMode="cover"
        />
        
        {/* Overlay gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        {/* Interaction controls - right side */}
        <View style={styles.interactionBar}>
          <TouchableOpacity style={styles.interactionButton} onPress={handleLikePress}>
            <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
              <Ionicons name="heart" size={28} color={COLORS.primary} />
            </Animated.View>
            <ThemedText style={styles.interactionText}>
              {item.likes > 1000 ? `${(item.likes / 1000).toFixed(1)}M` : `${item.likes}K`}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.interactionButton}>
            <Ionicons name="chatbubble-ellipses" size={26} color={COLORS.white} />
            <ThemedText style={styles.interactionText}>
              {item.comments}K
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.interactionButton}>
            <Ionicons name="share-social" size={26} color={COLORS.white} />
            <ThemedText style={styles.interactionText}>
              {item.shares}K
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.discButton}>
            <Image 
              source={{ uri: item.thumbnail }} 
              style={styles.musicDisc}
            />
          </TouchableOpacity>
        </View>

        {/* Content info - bottom */}
        <View style={styles.contentInfo}>
          <View style={styles.artistRow}>
            <TouchableOpacity style={styles.artistInfo}>
              <ThemedText type="subtitle" style={styles.artistName}>
                {item.artist} {item.isVerified && <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />}
              </ThemedText>
              <ThemedText style={styles.username}>{item.username}</ThemedText>
            </TouchableOpacity>
            
            {/* <TouchableOpacity style={[
              styles.followButton, 
              item.isFollowing ? styles.followingButton : {}
            ]}>
              <ThemedText style={[
                styles.followButtonText, 
                item.isFollowing ? styles.followingButtonText : {}
              ]}>
                {item.isFollowing ? 'Following' : 'Follow'}
              </ThemedText>
            </TouchableOpacity> */}
          </View>

          <ThemedText style={styles.description}>
            {item.description}
          </ThemedText>

          <View style={styles.songInfoContainer}>
            <Ionicons name="musical-notes" size={16} color={COLORS.white} />
            <ThemedText style={styles.songTitle}>{item.songTitle}</ThemedText>
            <View style={styles.soundwave}>
              {[...Array(8)].map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.soundwaveLine,
                    { height: Math.random() * 12 + 4 }
                  ]} 
                />
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }, [activeIndex, likeAnimations, tabBarHeight]);

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
  videoContainer: {
    width,
    justifyContent: 'flex-end',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
  },
  interactionBar: {
    position: 'absolute',
    right: 15,
    bottom: 30, // Adjusted to align with the bottom of the content info section
    alignItems: 'center',
    justifyContent: 'flex-end', // Ensures buttons align from the bottom
    height: 'auto', // Allow the height to adjust to content
  },
  interactionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  interactionText: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 3,
  },
  discButton: {
    marginTop: 10,
    width: 45,
    height: 45,
    borderRadius: 25,
    borderWidth: 10,
    borderColor: '#000',
    overflow: 'hidden',
  },
  musicDisc: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  contentInfo: {
    paddingLeft: 20,
    paddingRight: 80,  // Increased to match the width of the interaction buttons section
    paddingBottom: 30,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  artistInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  username: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  followButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: COLORS.white,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  songInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  songTitle: {
    marginLeft: 8,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  soundwave: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 10,
    height: 14,
  },
  soundwaveLine: {
    width: 2,
    backgroundColor: COLORS.primary,
    marginHorizontal: 1,
    borderRadius: 1,
  },
});