import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { COLORS } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import CommentItem from './CommentItem';

// Firebase imports
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/firebase/config';

const { width, height } = Dimensions.get('window');

interface Comment {
  id: string;
  text: string;
  username: string;
  userPhotoURL?: string;
  timestamp: Date;
  likes: number;
}

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  commentCount: number;
  onCommentCountChange: (newCount: number) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  onClose,
  videoId,
  commentCount,
  onCommentCountChange
}) => {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [likedComments, setLikedComments] = useState<{[key: string]: boolean}>({});
  const slideAnim = useRef(new Animated.Value(height)).current;
  const inputRef = useRef<TextInput>(null);
  
  // Format time since comment was posted
  const formatTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000; // years
    if (interval > 1) return Math.floor(interval) + "y";
    
    interval = seconds / 2592000; // months
    if (interval > 1) return Math.floor(interval) + "m";
    
    interval = seconds / 86400; // days
    if (interval > 1) return Math.floor(interval) + "d";
    
    interval = seconds / 3600; // hours
    if (interval > 1) return Math.floor(interval) + "h";
    
    interval = seconds / 60; // minutes
    if (interval > 1) return Math.floor(interval) + "m";
    
    return Math.floor(seconds) + "s";
  };

  // Set up listener for comments when modal opens
  useEffect(() => {
    let commentsUnsubscribe: (() => void) | null = null;
    
    if (visible && videoId) {
      setLoading(true);
      
      const commentsRef = collection(db, 'comments');
      const commentsQuery = query(
        commentsRef,
        where('videoId', '==', videoId),
        orderBy('timestamp', 'desc')
      );
      
      commentsUnsubscribe = onSnapshot(commentsQuery, 
        (snapshot) => {
          const commentsList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              text: data.text || '',
              username: data.username || 'anonymous',
              userPhotoURL: data.userPhotoURL || '',
              timestamp: data.timestamp?.toDate() || new Date(),
              likes: data.likes || 0
            };
          });
          
          setComments(commentsList);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching comments:', error);
          setLoading(false);
        }
      );
      
      // Slide up animation when modal opens
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8
      }).start();
    } else {
      // Slide down animation when modal closes
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
    
    return () => {
      if (commentsUnsubscribe) {
        commentsUnsubscribe();
      }
    };
  }, [visible, videoId, slideAnim]);

  const handlePostComment = async () => {
    if (!user || !newComment.trim() || posting) return;
    
    try {
      setPosting(true);
      Keyboard.dismiss();
      
      const username = userProfile?.username || user.email?.split('@')[0] || 'anonymous';
      
      // Add the comment to Firestore
      await addDoc(collection(db, 'comments'), {
        videoId,
        text: newComment.trim(),
        userId: user.uid,
        username,
        userPhotoURL: userProfile?.photoURL || '',
        timestamp: serverTimestamp(),
        likes: 0
      });
      
      // Update comment count on the video document
      const videoRef = doc(db, 'posts', videoId);
      await updateDoc(videoRef, {
        comments: increment(1)
      });
      
      // Update local state for UI
      onCommentCountChange(commentCount + 1);
      setNewComment('');
      setPosting(false);
    } catch (error) {
      console.error('Error posting comment:', error);
      setPosting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    // Toggle like state optimistically
    setLikedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
    
    try {
      // Update like count in Firestore
      const commentRef = doc(db, 'comments', commentId);
      await updateDoc(commentRef, {
        likes: increment(likedComments[commentId] ? -1 : 1)
      });
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert optimistic update if failed
      setLikedComments(prev => ({
        ...prev,
        [commentId]: !prev[commentId]
      }));
    }
  };

  const renderCommentItem = ({ item }: { item: Comment }) => {
    const isLiked = likedComments[item.id] || false;
    const timeAgo = formatTimeSince(item.timestamp);
    
    return (
      <CommentItem
        item={item}
        isLiked={isLiked}
        timeAgo={timeAgo}
        onLike={handleLikeComment}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
            style={styles.modalBody}
          >
            {/* Modal header */}
            <View style={styles.header}>
              <View style={styles.dragIndicator} />
              <ThemedText style={styles.commentsTitle}>
                {commentCount} Comments
              </ThemedText>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {/* Comments list */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={COLORS.primary} />
                <ThemedText style={styles.emptyText}>
                  No comments yet. Be the first!
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={comments}
                renderItem={renderCommentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.commentsList}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Comment input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
              style={styles.inputContainer}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Add a comment..."
                  placeholderTextColor="#999"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    !newComment.trim() && styles.sendButtonDisabled
                  ]}
                  disabled={!newComment.trim() || posting}
                  onPress={handlePostComment}
                >
                  {posting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.75, // Take up 75% of screen height
    width: '100%',
    overflow: 'hidden',
    paddingBottom: 40
  },
  modalBody: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    position: 'relative',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#3A3A3A',
    borderRadius: 2.5,
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
  },
  commentsList: {
    padding: 16,
    paddingBottom: 80,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    color: COLORS.white,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.white,
    marginVertical: 4,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  likeCount: {
    marginLeft: 4,
    fontSize: 12,
    color: '#888',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyText: {
    fontSize: 12,
    color: '#888',
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    backgroundColor: '#121212',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    color: COLORS.white,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
  },
  // Avatar complex styles
  avatarContainer: {
    width: 40,
    height: 40,
    overflow: 'hidden',
  },
  avatarImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImageWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImageContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
});

export default CommentModal;