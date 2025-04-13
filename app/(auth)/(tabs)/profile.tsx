import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Animated
} from 'react-native';
import { Video, AVPlaybackStatus } from 'expo-av';
import { useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/context/AuthContext';
import SignOutButton from '@/components/profile/SignOutButton';
import VideoPlayer from '@/components/VideoPlayer';

// Firebase imports
import { getFirestore, collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';

// Get device dimensions
const { width, height } = Dimensions.get('window');

// Define interfaces for our data types
interface UserProfileData {
  displayName: string;
  username: string;
  bio: string;
  photoURL: string;
  followersCount: number;
  followingCount: number;
  clipCount: number;
}

interface CollectionData {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  itemCount: number;
}

interface ClipData {
  id: string;
  thumbnail: string;
  title: string;
}

// Enhanced ClipData interface to match feed items
interface EnhancedClipData {
  id: string;
  thumbnail: string;
  videoUri: string;
  title: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  artist: string;
  username: string;
  isVerified: boolean;
}

const CollectionCard = ({ collection, onPress }: { collection: CollectionData, onPress: () => void }) => (
  <TouchableOpacity style={styles.collectionCard} onPress={onPress}>
    <Image
      source={{ uri: collection.coverImage }}
      style={styles.collectionCover}
    />
    <View style={styles.collectionInfo}>
      <ThemedText style={styles.collectionTitle}>{collection.title}</ThemedText>
      <Text style={styles.collectionDescription}>{collection.description}</Text>
      <Text style={styles.itemCount}>{collection.itemCount} clips</Text>
    </View>
  </TouchableOpacity>
);

const ClipThumbnail = ({ clip, onPress }: { clip: ClipData, onPress: () => void }) => (
  <TouchableOpacity style={styles.clipThumbnail} onPress={onPress}>
    <Image source={{ uri: clip.thumbnail }} style={styles.thumbnailImage} />
    <Text style={styles.clipTitle} numberOfLines={1}>{clip.title}</Text>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [recentClips, setRecentClips] = useState<ClipData[]>([]);
  const [enhancedClips, setEnhancedClips] = useState<EnhancedClipData[]>([]);
  const [viewMode, setViewMode] = useState<'profile' | 'clips'>('profile');
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const tabBarHeight = useBottomTabBarHeight();
  
  // For animations in clip view
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<EnhancedClipData>>(null);
  
  // Like animations
  const [likeAnimations, setLikeAnimations] = useState<{[key: string]: Animated.Value}>({});
  const [playingVideos, setPlayingVideos] = useState<{[key: string]: boolean}>({});
  const videoRefs = useRef<{[key: string]: Video | null}>({}).current;

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!user?.uid) return;
    
    try {
      // User profile is already fetched through the AuthContext
      // Just format the data
      setProfileData({
        displayName: userProfile?.displayName || user?.email?.split('@')[0] || 'Artist Name',
        username: userProfile?.username || user?.email?.split('@')[0] || 'username',
        bio: userProfile?.bio || 'Music producer & artist based in Los Angeles.',
        photoURL: userProfile?.photoURL || 'https://www.comfortzone.com/-/media/project/oneweb/comfortzone/images/blog/how-can-i-soothe-and-calm-my-cat.jpeg?h=717&iar=0&w=1000&hash=4B47BC0AD485430E429977C30A7A37DF',
        followersCount: userProfile?.followersCount || 0,
        followingCount: userProfile?.followingCount || 0,
        clipCount: 0, // Will be updated when we fetch clips
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Enhanced fetch user clips function
  const fetchUserClips = async () => {
    if (!user?.uid) return;
    
    try {
      // Query posts created by this user
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef, 
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      // Set recent clips (take latest 10)
      const clipsArray = querySnapshot.docs
        .slice(0, 10)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            thumbnail: data.thumbnailUrl || data.mediaUrl || 'https://via.placeholder.com/100',
            title: data.title || 'Untitled Clip'
          };
        });
      
      setRecentClips(clipsArray);
      
      // Create enhanced clips data for feed-style viewing
      const enhancedArray = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const clip = {
          id: doc.id,
          thumbnail: data.thumbnailUrl || data.mediaUrl || 'https://via.placeholder.com/100',
          videoUri: data.mediaUrl || '',
          title: data.title || 'Untitled Clip',
          description: data.description || 'No description provided',
          likes: data.likes || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
          artist: userProfile?.displayName || user.email?.split('@')[0] || 'Unknown Artist',
          username: userProfile?.username ? `@${userProfile.username}` : '@user',
          isVerified: userProfile?.isVerified || false
        };
        
        // Initialize animation for this clip
        likeAnimations[doc.id] = new Animated.Value(1);
        // Initialize video playback state
        playingVideos[doc.id] = false;
        
        return clip;
      });
      
      setEnhancedClips(enhancedArray);
      setLikeAnimations({...likeAnimations}); // Update state with new animations
      setPlayingVideos({...playingVideos});
      
      // Update the profile data with clip count
      setProfileData(prevData => {
        if (!prevData) return prevData;
        
        const totalClips = querySnapshot.docs.length;
        return {
          ...prevData,
          clipCount: totalClips
        };
      });
      
    } catch (error) {
      console.error('Error fetching clips:', error);
    }
  };

  // Fetch user collections from Firestore
  const fetchUserCollections = async () => {
    if (!user?.uid) return;
    
    try {
      // Query collections created by this user
      const collectionsRef = collection(db, 'posts');
      const q = query(
        collectionsRef, 
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      // Process the query results to group by collection
      const collectionsMap = new Map<string, { posts: any[], timestamp: Date }>();
      
      querySnapshot.forEach(doc => {
        const postData = doc.data();
        const collectionName = postData.collection;
        
        if (!collectionsMap.has(collectionName)) {
          collectionsMap.set(collectionName, {
            posts: [{ id: doc.id, ...postData }],
            timestamp: postData.timestamp?.toDate() || new Date()
          });
        } else {
          const existingCollection = collectionsMap.get(collectionName);
          if (existingCollection) {
            existingCollection.posts.push({ id: doc.id, ...postData });
          }
        }
      });
      
      // Convert the map to an array for display
      const collectionsArray = Array.from(collectionsMap, ([key, value]) => {
        // Choose the first post's thumbnail as the collection cover
        const firstPost = value.posts[0];
        return {
          id: key,
          title: key,
          description: `Collection of ${value.posts.length} clips`,
          coverImage: firstPost.thumbnailUrl || firstPost.mediaUrl || 'https://via.placeholder.com/150',
          itemCount: value.posts.length,
        };
      });
      
      setCollections(collectionsArray);
      
      // Update the profile data with clip count
      setProfileData(prevData => {
        if (!prevData) return prevData;
        
        const totalClips = querySnapshot.docs.length;
        return {
          ...prevData,
          clipCount: totalClips
        };
      });
      
      // Set recent clips (take latest 10)
      const recentClipsArray = querySnapshot.docs
        .slice(0, 10)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            thumbnail: data.thumbnailUrl || data.mediaUrl || 'https://via.placeholder.com/100',
            title: data.title || 'Untitled Clip'
          };
        });
      
      setRecentClips(recentClipsArray);
      
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchUserProfile();
        await fetchUserClips(); // Use the new function that sets both basic and enhanced clips
        await fetchUserCollections();
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadData();
    }
  }, [user]);

  const navigateToCollection = (collectionId: string) => {
    router.push(`/collections/${collectionId}`);
  };

  const navigateToCreateCollection = () => {
    router.push('/collections/create');
  };
  
  // Switch to full-screen clips view
  const showClipsView = (initialClipIndex: number = 0) => {
    setActiveClipIndex(initialClipIndex);
    setViewMode('clips');
  };
  
  // Return to profile view
  const showProfileView = () => {
    setViewMode('profile');
  };
  
  // Handle viewable items change in FlatList
  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const newIndex = viewableItems[0].index;
      setActiveClipIndex(newIndex);
      
      // Play the current video and pause others
      const newPlayingState = {...playingVideos};
      
      // First set all to false
      Object.keys(newPlayingState).forEach(id => {
        newPlayingState[id] = false;
      });
      
      // Then set the active one to true
      if (viewableItems[0].item && viewableItems[0].item.id) {
        const activeItemId = viewableItems[0].item.id;
        newPlayingState[activeItemId] = true;
        
        // Play the active video
        if (videoRefs[activeItemId]) {
          videoRefs[activeItemId]?.playAsync();
        }
      }
      
      setPlayingVideos(newPlayingState);
    }
  }, [playingVideos, videoRefs]);
  
  // Handle like animation
  const handleLikePress = (clipId: string) => {
    const animation = likeAnimations[clipId];
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

  // Render each clip in feed view with video playback
  const renderClipItem = ({ item, index }) => {
    const likeAnimation = likeAnimations[item.id];
    const isPlaying = playingVideos[item.id] || false;
    
    const handlePlayPause = () => {
      const video = videoRefs[item.id];
      if (video) {
        if (isPlaying) {
          video.pauseAsync();
        } else {
          video.playAsync();
        }
        
        // Update playing state
        setPlayingVideos({
          ...playingVideos,
          [item.id]: !isPlaying
        });
      }
    };
    
    const handleVideoRef = (ref: Video | null) => {
      if (ref) {
        videoRefs[item.id] = ref;
      }
    };
    
    return (
      <VideoPlayer
        id={item.id}
        videoUri={item.videoUri}
        thumbnail={item.thumbnail}
        isPlaying={isPlaying}
        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            // Handle playback status updates if needed
          }
        }}
        likeAnimation={likeAnimation}
        artist={item.artist}
        username={item.username}
        description={item.description}
        title={item.title}
        likes={item.likes}
        comments={item.comments}
        shares={item.shares}
        isVerified={item.isVerified}
        onPlayPause={handlePlayPause}
        onLikePress={() => handleLikePress(item.id)}
        containerHeight={height - tabBarHeight}
        showBackButton={true}
        onBackPress={() => {
          // Stop all videos when returning to profile view
          Object.keys(videoRefs).forEach(id => {
            videoRefs[id]?.pauseAsync();
          });
          showProfileView();
        }}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Show full-screen clips view if in clip mode
  if (viewMode === 'clips') {
    return (
      <View style={styles.clipsViewContainer}>
        <Animated.FlatList
          ref={flatListRef}
          data={enhancedClips}
          renderItem={renderClipItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height - tabBarHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          viewabilityConfig={{ 
            itemVisiblePercentThreshold: 80,
            minimumViewTime: 300
          }}
          onViewableItemsChanged={handleViewableItemsChanged}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          initialScrollIndex={activeClipIndex}
          getItemLayout={(data, index) => ({
            length: height - tabBarHeight,
            offset: (height - tabBarHeight) * index,
            index,
          })}
        />
      </View>
    );
  }

  // Regular profile view
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Image 
              source={{ uri: profileData?.photoURL || 'https://www.comfortzone.com/-/media/project/oneweb/comfortzone/images/blog/how-can-i-soothe-and-calm-my-cat.jpeg?h=717&iar=0&w=1000&hash=4B47BC0AD485430E429977C30A7A37DF' }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{profileData?.displayName}</Text>
              <Text style={styles.username}>@{profileData?.username}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statCount}>{profileData?.clipCount || 0}</Text>
                  <Text style={styles.statLabel}>Clips</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statCount}>{profileData?.followersCount || 0}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statCount}>{profileData?.followingCount || 0}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{profileData?.bio}</Text>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
            <SignOutButton />
          </View>
        </View>

        {/* Recent Clips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Clips</Text>
            <TouchableOpacity onPress={() => showClipsView(0)}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {recentClips.length > 0 ? (
            <FlatList
              data={recentClips}
              renderItem={({ item, index }) => (
                <ClipThumbnail 
                  clip={item} 
                  onPress={() => showClipsView(index)}
                />
              )}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentClipsContainer}
            />
          ) : (
            <Text style={styles.emptyText}>No clips uploaded yet</Text>
          )}
        </View>

        {/* Collections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Collections</Text>
            <TouchableOpacity onPress={navigateToCreateCollection}>
              <View style={styles.createButton}>
                <FontAwesome name="plus" size={14} color="#1DB954" />
                <Text style={styles.createButtonText}>Create</Text>
              </View>
            </TouchableOpacity>
          </View>

          {collections.length > 0 ? (
            collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onPress={() => navigateToCollection(collection.id)}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No collections created yet</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  username: {
    color: '#B3B3B3',
    marginVertical: 2,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  stat: {
    marginRight: 20,
  },
  statCount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statLabel: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  bioSection: {
    marginTop: 15,
  },
  bioText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seeAllText: {
    color: '#1DB954',
  },
  collectionCard: {
    flexDirection: 'row',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  collectionCover: {
    width: 80,
    height: 80,
  },
  collectionInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  collectionDescription: {
    color: '#B3B3B3',
    fontSize: 12,
    marginVertical: 4,
  },
  itemCount: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#1DB954',
    marginLeft: 5,
  },
  recentClipsContainer: {
    paddingRight: 20,
  },
  clipThumbnail: {
    width: 100,
    marginRight: 10,
  },
  thumbnailImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
    marginBottom: 5,
    backgroundColor: '#1E1E1E',
  },
  clipTitle: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyText: {
    color: '#B3B3B3',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  // New styles for clips view
  clipsViewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});
