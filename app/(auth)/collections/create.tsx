import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { getFirestore, collection as firestoreCollection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';

// Define interface for the cover image
interface CoverImage {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string;
}

export default function CreateCollectionScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coverImage, setCoverImage] = useState<CoverImage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Request permissions and select cover image
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your media library to select a cover image.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCoverImage(result.assets[0] as CoverImage);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select an image. Please try again.');
    }
  };

  // Handle creating a new collection
  const handleCreateCollection = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please add a title for your collection.');
      return;
    }

    setLoading(true);
    
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        Alert.alert('Authentication Error', 'You must be logged in to create a collection.');
        setLoading(false);
        return;
      }

      // Collection data with default cover if none selected
      let collectionData = {
        title: title.trim(),
        description: description.trim(),
        coverImage: 'https://via.placeholder.com/300/1DB954/FFFFFF?text=Collection',
        createdBy: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        itemCount: 0 // Start with 0 items
      };

      // If a custom cover image was selected, upload it
      if (coverImage) {
        const storage = getStorage();
        const filename = coverImage.uri.substring(coverImage.uri.lastIndexOf('/') + 1);
        const imageStorageRef = ref(storage, `collections/${auth.currentUser.uid}/${Date.now()}-${filename}`);
        
        // Convert image uri to blob
        const imageResponse = await fetch(coverImage.uri);
        const imageBlob = await imageResponse.blob();
        
        // Upload image blob to Firebase Storage
        const uploadTask = uploadBytesResumable(imageStorageRef, imageBlob);
        
        // Monitor upload and get download URL when complete
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              // Track upload progress if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Image upload is ${progress}% done`);
            },
            (error) => {
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              collectionData.coverImage = downloadURL;
              resolve();
            }
          );
        });
      }

      // Save collection data to Firestore
      const db = getFirestore();
      const collectionsRef = firestoreCollection(db, 'collections');
      await addDoc(collectionsRef, collectionData);
      
      // Reset form and show success message
      setLoading(false);
      Alert.alert(
        'Collection Created',
        'Your collection has been created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating collection:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to create collection. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Collection</Text>
          <View style={styles.placeholderRight} />
        </View>
        
        {/* Cover Image Selection */}
        <View style={styles.coverImageContainer}>
          {coverImage ? (
            <>
              <Image
                source={{ uri: coverImage.uri }}
                style={styles.coverImagePreview}
              />
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={pickImage}
              >
                <Text style={styles.changeImageText}>Change Cover</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={50} color="#1DB954" />
              <Text style={styles.uploadText}>Select Cover Image</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Collection Details Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Collection Title"
            placeholderTextColor="#666"
            maxLength={40}
          />
          
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what this collection is about..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          
          {/* Create Button */}
          <TouchableOpacity 
            style={[
              styles.createButton, 
              !title.trim() && styles.disabledButton
            ]}
            onPress={handleCreateCollection}
            disabled={!title.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Collection</Text>
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
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholderRight: {
    width: 28,
    height: 28,
  },
  coverImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  coverImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
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
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
