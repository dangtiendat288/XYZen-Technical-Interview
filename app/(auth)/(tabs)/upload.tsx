import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Video, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, UploadTask, UploadTaskSnapshot } from 'firebase/storage';
import { getFirestore, collection as firestoreCollection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { router } from 'expo-router';
import * as VideoThumbnails from 'expo-video-thumbnails';

// Define types for the media asset
interface MediaAsset {
  uri: string;
  width?: number;
  height?: number;
  type?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
}

export default function UploadScreen(): JSX.Element {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [collection, setCollection] = useState<string>('');
  const [customCollection, setCustomCollection] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [generatingThumbnails, setGeneratingThumbnails] = useState<boolean>(false);
  const [collections, setCollections] = useState<string[]>(['New Collection...']);
  const [fetchingCollections, setFetchingCollections] = useState<boolean>(true);
  const videoRef = useRef<Video | null>(null);
  
  // Fetch user's collections from Firebase
  useEffect(() => {
    const fetchUserCollections = async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) return;
        
        const db = getFirestore();
        const collectionsQuery = query(
          firestoreCollection(db, 'collections'),
          where('createdBy', '==', auth.currentUser.uid)
        );
        
        const querySnapshot = await getDocs(collectionsQuery);
        const userCollections = ['New Collection...'];
        
        querySnapshot.forEach((doc) => {
          const collectionData = doc.data();
          if (collectionData.title) {
            userCollections.push(collectionData.title);
          }
        });
        
        setCollections(userCollections);
      } catch (error) {
        console.error('Error fetching collections:', error);
        // If there's an error, at least show the "New Collection..." option
        setCollections(['New Collection...']);
      } finally {
        setFetchingCollections(false);
      }
    };
    
    fetchUserCollections();
  }, []);

  // Generate thumbnails when a video is selected
  useEffect(() => {
    if (media) {
      generateThumbnails();
    }
  }, [media]);

  // Generate 3 random thumbnails from the video
  const generateThumbnails = async (): Promise<void> => {
    if (!media) return;

    setGeneratingThumbnails(true);
    setThumbnails([]);
    setSelectedThumbnail(null);

    try {
      // Get video duration using VideoRef
      let duration = 0;
      if (media.duration) {
        duration = media.duration * 1000; // Convert to milliseconds
      } else {
        // Default to 30 seconds if duration isn't available
        duration = 30000;
      }

      // Generate 3 thumbnails at different positions
      const thumbnailsPromises = [0.25, 0.5, 0.75].map(async (position) => {
        const timeInMs = Math.floor(duration * position);
        return await VideoThumbnails.getThumbnailAsync(media.uri, {
          time: timeInMs,
          quality: 0.7,
        });
      });

      const results = await Promise.all(thumbnailsPromises);
      const thumbnailUris = results.map(result => result.uri);
      
      setThumbnails(thumbnailUris);
      setSelectedThumbnail(thumbnailUris[0]); // Select the first thumbnail by default
    } catch (e) {
      console.error("Error generating thumbnails:", e);
      Alert.alert("Error", "Failed to generate thumbnails. Please try another video.");
    } finally {
      setGeneratingThumbnails(false);
    }
  };

  // Request permissions and select media
  const pickMedia = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your media library to upload clips.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMedia(result.assets[0] as MediaAsset);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  // Handle upload to Firebase
  const handleUpload = async (): Promise<void> => {
    if (!media) {
      Alert.alert('Missing Media', 'Please select a video to upload.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please add a title for your clip.');
      return;
    }

    if (!selectedThumbnail) {
      Alert.alert('Missing Thumbnail', 'Please select a thumbnail for your video.');
      return;
    }

    const selectedCollectionName = collection === 'New Collection...' ? customCollection : collection;
    if (!selectedCollectionName.trim()) {
      Alert.alert('Missing Collection', 'Please select or create a collection.');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        Alert.alert('Authentication Error', 'You must be logged in to upload.');
        setLoading(false);
        return;
      }

      const storage = getStorage();
      
      // Upload video to Firebase Storage
      const filename = media.uri.substring(media.uri.lastIndexOf('/') + 1);
      const videoStorageRef = ref(storage, `clips/${auth.currentUser.uid}/${Date.now()}-${filename}`);
      
      // Convert video uri to blob
      const videoResponse = await fetch(media.uri);
      const videoBlob = await videoResponse.blob();
      
      // Upload video blob to Firebase Storage
      const videoUploadTask: UploadTask = uploadBytesResumable(videoStorageRef, videoBlob);
      
      videoUploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          // Track upload progress if needed
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          console.log(`Video upload is ${progress}% done`);
        },
        (error: Error) => {
          setLoading(false);
          console.error('Video upload failed:', error);
          Alert.alert('Upload Failed', 'There was an error uploading your clip. Please try again.');
        },
        async () => {
          try {
            // Video upload completed successfully
            const videoDownloadURL = await getDownloadURL(videoUploadTask.snapshot.ref);
            
            // Upload thumbnail to Firebase Storage
            const thumbnailFilename = selectedThumbnail.substring(selectedThumbnail.lastIndexOf('/') + 1);
            const thumbnailStorageRef = ref(storage, `thumbnails/${auth.currentUser.uid}/${Date.now()}-${thumbnailFilename}`);
            
            // Convert thumbnail uri to blob
            const thumbnailResponse = await fetch(selectedThumbnail);
            const thumbnailBlob = await thumbnailResponse.blob();
            
            // Upload thumbnail blob to Firebase Storage
            const thumbnailUploadTask: UploadTask = uploadBytesResumable(thumbnailStorageRef, thumbnailBlob);
            
            thumbnailUploadTask.on(
              'state_changed',
              (snapshot: UploadTaskSnapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                console.log(`Thumbnail upload is ${progress}% done`);
              },
              (error: Error) => {
                setLoading(false);
                console.error('Thumbnail upload failed:', error);
                Alert.alert('Upload Partially Failed', 'Video uploaded but thumbnail failed. Please try again.');
              },
              async () => {
                // Thumbnail upload completed successfully
                const thumbnailDownloadURL = await getDownloadURL(thumbnailUploadTask.snapshot.ref);
                
                const db = getFirestore();
                
                // Check if it's a new collection and save it if needed
                if (collection === 'New Collection...' && customCollection.trim()) {
                  // Create a new collection document
                  const collectionRef = firestoreCollection(db, 'collections');
                  await addDoc(collectionRef, {
                    title: customCollection.trim(),
                    description: '',
                    coverImage: 'https://via.placeholder.com/300/1DB954/FFFFFF?text=Collection',
                    createdBy: auth.currentUser.uid,
                    timestamp: serverTimestamp(),
                    itemCount: 1 // Starting with this new item
                  });
                } else if (collection !== 'New Collection...') {
                  // Increment the itemCount of the existing collection
                  const collectionsRef = firestoreCollection(db, 'collections');
                  const q = query(collectionsRef, 
                    where('createdBy', '==', auth.currentUser.uid),
                    where('title', '==', collection)
                  );
                  
                  const querySnapshot = await getDocs(q);
                  if (!querySnapshot.empty) {
                    const collectionDoc = querySnapshot.docs[0];
                    const collectionData = collectionDoc.data();
                    
                    // Update itemCount
                    await setDoc(doc(db, 'collections', collectionDoc.id), {
                      ...collectionData,
                      itemCount: (collectionData.itemCount || 0) + 1
                    });
                  }
                }
                
                // Save post data to Firestore
                const postsCollectionRef = firestoreCollection(db, 'posts');
                
                const postData = {
                  userId: auth.currentUser.uid,
                  title,
                  description,
                  mediaUrl: videoDownloadURL,
                  thumbnailUrl: thumbnailDownloadURL,
                  collection: selectedCollectionName,
                  timestamp: serverTimestamp(),
                  likes: 0,
                  comments: 0,
                };
                
                await addDoc(postsCollectionRef, postData);
                
                console.log('Document successfully added to Firestore');            
                // Reset form and show success message
                setMedia(null);
                setTitle('');
                setDescription('');
                setCollection('');
                setCustomCollection('');
                setThumbnails([]);
                setSelectedThumbnail(null);
                setLoading(false);
                
                Alert.alert(
                  'Upload Success', 
                  'Your clip has been uploaded successfully!',
                  [{ text: 'OK', onPress: () => router.replace('/(auth)/(tabs)/profile') }]
                );
              }
            );
          } catch (error) {
            console.error('Error uploading thumbnail or adding document:', error);
            setLoading(false);
            Alert.alert(
              'Upload Partially Successful', 
              'Your video was uploaded, but we couldn\'t save all details. Please try again or contact support.',
              [{ text: 'OK' }]
            );
          }
        }
      );
    } catch (error) {
      setLoading(false);
      console.error('Error during upload:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>        
        
        {/* Media Preview or Upload Button */}
        <View style={styles.mediaContainer}>
          {media ? (
            <>
              <Video
                ref={videoRef}
                source={{ uri: media.uri }}
                style={styles.mediaPreview}
                useNativeControls
                resizeMode="contain"
                isLooping
              />
              <TouchableOpacity 
                style={styles.changeMediaButton}
                onPress={pickMedia}
              >
                <Text style={styles.changeMediaText}>Change Video</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={pickMedia}
            >
              <Ionicons name="cloud-upload-outline" size={50} color="#1DB954" />
              <Text style={styles.uploadText}>Select Video</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Thumbnail Selection */}
        {media && (
          <View style={styles.thumbnailSection}>
            <Text style={styles.label}>Choose Thumbnail</Text>
            
            {generatingThumbnails ? (
              <View style={styles.thumbnailLoading}>
                <ActivityIndicator color="#1DB954" size="large" />
                <Text style={styles.thumbnailLoadingText}>Generating thumbnails...</Text>
              </View>
            ) : (
              <View style={styles.thumbnailContainer}>
                {thumbnails.map((thumbnail, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.thumbnailItem,
                      selectedThumbnail === thumbnail && styles.selectedThumbnailItem
                    ]}
                    onPress={() => setSelectedThumbnail(thumbnail)}
                  >
                    <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
                    {selectedThumbnail === thumbnail && (
                      <View style={styles.selectedThumbnailOverlay}>
                        <Ionicons name="checkmark-circle" size={24} color="#1DB954" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        
        {/* Clip Details Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Add a catchy title"
            placeholderTextColor="#666"
            maxLength={60}
          />
          
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell people about this clip..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          
          <Text style={styles.label}>Collection</Text>
          {fetchingCollections ? (
            <ActivityIndicator color="#1DB954" size="small" style={{marginVertical: 10}} />
          ) : (
            <View style={styles.collectionsContainer}>
              {collections.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.collectionButton,
                    collection === item && styles.selectedCollectionButton
                  ]}
                  onPress={() => setCollection(item)}
                >
                  <Text 
                    style={[
                      styles.collectionButtonText,
                      collection === item && styles.selectedCollectionButtonText
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {collection === 'New Collection...' && (
            <TextInput
              style={styles.input}
              value={customCollection}
              onChangeText={setCustomCollection}
              placeholder="Enter new collection name"
              placeholderTextColor="#666"
              maxLength={40}
            />
          )}
          
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (!media || !title.trim() || !selectedThumbnail) && styles.disabledButton
            ]}
            onPress={handleUpload}
            disabled={!media || !title.trim() || !selectedThumbnail || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Upload Clip</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    padding: 20,    
  },  
  mediaContainer: {
    height: 250,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  uploadText: {
    color: '#1DB954',
    marginTop: 10,
    fontSize: 16,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  changeMediaButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  changeMediaText: {
    color: '#fff',
    fontSize: 12,
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  collectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 10,
  },
  collectionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 8,
  },
  selectedCollectionButton: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  collectionButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedCollectionButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#1DB954',
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#0F5C2A',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  thumbnailSection: {
    marginBottom: 20,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  thumbnailItem: {
    width: '32%',
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnailItem: {
    borderColor: '#1DB954',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  selectedThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 3,
    borderBottomLeftRadius: 8,
  },
  thumbnailLoading: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailLoadingText: {
    color: '#1DB954',
    marginTop: 10,
  },
});
