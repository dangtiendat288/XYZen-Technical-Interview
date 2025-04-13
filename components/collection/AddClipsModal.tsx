import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Define interfaces for the component
interface PostData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  collection?: string;
}

interface AddClipsModalProps {
  visible: boolean;
  collectionTitle: string;
  availableClips: PostData[];
  selectedClips: string[];
  loading: boolean;
  onClose: () => void;
  onAddClips: () => void;
  onToggleClipSelection: (clipId: string) => void;
}

const AddClipsModal = ({
  visible,
  collectionTitle,
  availableClips,
  selectedClips,
  loading,
  onClose,
  onAddClips,
  onToggleClipSelection,
}: AddClipsModalProps) => {
  
  // Render each available clip
  const renderAvailableClipItem = ({ item }: { item: PostData }) => (
    <TouchableOpacity 
      style={[
        styles.availableClipItem,
        selectedClips.includes(item.id) && styles.selectedClipItem
      ]} 
      onPress={() => onToggleClipSelection(item.id)}
    >
      <Image 
        source={{ uri: item.thumbnailUrl }} 
        style={styles.availableClipThumbnail}
        resizeMode="cover"
      />
      <View style={styles.availableClipInfo}>
        <Text style={styles.availableClipTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.availableClipDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
      </View>
      <View style={styles.availableClipCheckbox}>
        {selectedClips.includes(item.id) && (
          <Ionicons name="checkmark-circle" size={24} color="#1DB954" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add to {collectionTitle}</Text>
          <TouchableOpacity 
            style={[
              styles.modalAddButton, 
              selectedClips.length === 0 && styles.modalAddButtonDisabled
            ]}
            onPress={onAddClips}
            disabled={selectedClips.length === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalAddButtonText}>
                Add ({selectedClips.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        {loading && availableClips.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text style={styles.loadingText}>Loading your clips...</Text>
          </View>
        ) : availableClips.length > 0 ? (
          <FlatList
            data={availableClips}
            renderItem={renderAvailableClipItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.availableClipsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes" size={64} color="#666" />
            <Text style={styles.emptyText}>
              No clips available to add. Upload some new clips first!
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginLeft: 10,
  },
  modalAddButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  modalAddButtonDisabled: {
    backgroundColor: '#0F5C2A',
    opacity: 0.7,
  },
  modalAddButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#B3B3B3',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  availableClipsList: {
    padding: 10,
  },
  availableClipItem: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedClipItem: {
    borderColor: '#1DB954',
  },
  availableClipThumbnail: {
    width: 80,
    height: 80,
  },
  availableClipInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  availableClipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  availableClipDescription: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  availableClipCheckbox: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AddClipsModal;
