import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Video, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, UploadTask, UploadTaskSnapshot } from 'firebase/storage';
import { getFirestore, collection as firestoreCollection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { router } from 'expo-router';

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
  const videoRef = useRef<Video | null>(null);
  
  // Hardcoded collections for now - in real app, these would be fetched from Firebase
  const collections: string[] = ['New Collection...', 'Unreleased Previews', 'Studio Sessions', 'Fan Collaborations'];

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

    const selectedCollection = collection === 'New Collection...' ? customCollection : collection;
    if (!selectedCollection.trim()) {
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

      // Upload media to Firebase Storage
      const storage = getStorage();
      const filename = media.uri.substring(media.uri.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `clips/${auth.currentUser.uid}/${Date.now()}-${filename}`);
      
      // Convert uri to blob
      const response = await fetch(media.uri);
      const blob = await response.blob();
      
      // Upload blob to Firebase Storage
      const uploadTask: UploadTask = uploadBytesResumable(storageRef, blob);
      
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          // Track upload progress if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error: Error) => {
          setLoading(false);
          console.error('Upload failed:', error);
          Alert.alert('Upload Failed', 'There was an error uploading your clip. Please try again.');
        },
        async () => {
          try {
            // Upload completed successfully
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save post data to Firestore
            const db = getFirestore();
            
            // Use firestoreCollection instead of collection to avoid the naming conflict
            const postsCollectionRef = firestoreCollection(db, 'posts');
            
            const postData = {
              userId: auth.currentUser.uid,
              title,
              description,
              mediaUrl: downloadURL,
              collection: selectedCollection,
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
            setLoading(false);
            
            Alert.alert(
              'Upload Success', 
              'Your clip has been uploaded successfully!',
              [{ text: 'OK', onPress: () => router.push('/feed') }]
            );
          } catch (error) {
            console.error('Error adding document to Firestore:', error);
            setLoading(false);
            Alert.alert(
              'Upload Partially Successful', 
              'Your video was uploaded, but we couldn\'t save the details. Please try again or contact support.',
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Upload New Clip</Text>
        
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
            style={[styles.submitButton, (!media || !title.trim()) && styles.disabledButton]}
            onPress={handleUpload}
            disabled={!media || !title.trim() || loading}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
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
});
