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
import { COLORS, SIZES } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import SignOutButton from '@/components/profile/SignOutButton';

// Mock data for testing
const mockCollections = [
  {
    id: '1',
    title: 'Upcoming EP Previews',
    description: 'Sneak peeks of tracks from my upcoming EP',
    coverImage: 'https://via.placeholder.com/150',
    itemCount: 5,
  },
  {
    id: '2',
    title: 'Studio Freestyles',
    description: 'Raw moments from the studio sessions',
    coverImage: 'https://via.placeholder.com/150',
    itemCount: 8,
  },
  {
    id: '3',
    title: 'Fan Collabs',
    description: 'Collaborations with amazing fans',
    coverImage: 'https://via.placeholder.com/150',
    itemCount: 3,
  },
];

// Mock data for recent clips
const recentClips = [
  { id: '1', thumbnail: 'https://via.placeholder.com/100', title: 'New beat drop' },
  { id: '2', thumbnail: 'https://via.placeholder.com/100', title: 'Acoustic version' },
  { id: '3', thumbnail: 'https://via.placeholder.com/100', title: 'Behind the scenes' },
  { id: '4', thumbnail: 'https://via.placeholder.com/100', title: 'Lyrics test' },
];

const CollectionCard = ({ collection, onPress }: any) => (
  <TouchableOpacity style={styles.collectionCard} onPress={onPress}>
    <Image
      source={{ uri: collection.coverImage }}
      style={styles.collectionCover}
    />
    <View style={styles.collectionInfo}>
      <ThemedText type="defaultSemiBold">{collection.title}</ThemedText>
      <ThemedText style={styles.collectionDescription}>{collection.description}</ThemedText>
      <ThemedText style={styles.itemCount}>{collection.itemCount} clips</ThemedText>
    </View>
  </TouchableOpacity>
);

const ClipThumbnail = ({ clip }: any) => (
  <TouchableOpacity style={styles.clipThumbnail}>
    <Image source={{ uri: clip.thumbnail }} style={styles.thumbnailImage} />
    <ThemedText style={styles.clipTitle} numberOfLines={1}>{clip.title}</ThemedText>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState(mockCollections);

  // In a real app, this would fetch data from Firebase
  useEffect(() => {
    // Simulating data loading
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const navigateToCollection = (collectionId: string) => {
    router.push(`/collections/${collectionId}`);
  };

  const navigateToCreateCollection = () => {
    router.push('/collections/create');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/100' }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <ThemedText type="title">{user?.email?.split('@')[0] || 'Artist Name'}</ThemedText>
              <ThemedText style={styles.username}>@{user?.email?.split('@')[0] || 'username'}</ThemedText>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold">128</ThemedText>
                  <ThemedText style={styles.statLabel}>Clips</ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold">1.2K</ThemedText>
                  <ThemedText style={styles.statLabel}>Followers</ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold">348</ThemedText>
                  <ThemedText style={styles.statLabel}>Following</ThemedText>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.bioSection}>
            <ThemedText>Music producer & artist based in Los Angeles.</ThemedText>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton}>
              <ThemedText style={styles.buttonText}>Edit Profile</ThemedText>
            </TouchableOpacity>
            <SignOutButton />
          </View>
        </View>

        {/* Recent Clips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Recent Clips</ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.seeAllText}>See all</ThemedText>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={recentClips}
            renderItem={({ item }) => <ClipThumbnail clip={item} />}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentClipsContainer}
          />
        </View>

        {/* Collections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Collections</ThemedText>
            <TouchableOpacity onPress={navigateToCreateCollection}>
              <View style={styles.createButton}>
                <FontAwesome name="plus" size={14} color={COLORS.primary} />
                <ThemedText style={styles.createButtonText}>Create</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : (
            collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onPress={() => navigateToCollection(collection.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Add padding for status bar
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
  username: {
    color: COLORS.gray,
    marginVertical: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  stat: {
    marginRight: 20,
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
  },
  bioSection: {
    marginTop: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
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
  seeAllText: {
    color: COLORS.primary,
  },
  collectionCard: {
    flexDirection: 'row',
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
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
  collectionDescription: {
    color: COLORS.gray,
    fontSize: 12,
    marginVertical: 4,
  },
  itemCount: {
    fontSize: 12,
    color: COLORS.gray,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: COLORS.primary,
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
  },
  clipTitle: {
    fontSize: 12,
  },
  loader: {
    marginVertical: 20,
  },
});
