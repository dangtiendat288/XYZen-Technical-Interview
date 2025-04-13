import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Text,
  Image,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/context/AuthContext';
import SignOutButton from '@/components/profile/SignOutButton';

// Firebase imports
import { getFirestore, collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/config';

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

const ClipThumbnail = ({ clip }: { clip: ClipData }) => (
  <TouchableOpacity style={styles.clipThumbnail}>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

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
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {recentClips.length > 0 ? (
            <FlatList
              data={recentClips}
              renderItem={({ item }) => <ClipThumbnail clip={item} />}
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
  }
});
