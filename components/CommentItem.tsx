import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { COLORS } from '@/constants/theme';

interface Comment {
  id: string;
  text: string;
  username: string;
  userPhotoURL?: string;
  timestamp: Date;
  likes: number;
}

interface CommentItemProps {
  item: Comment;
  isLiked: boolean;
  timeAgo: string;
  onLike: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  item, 
  isLiked, 
  timeAgo,
  onLike 
}) => {
  return (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        {item.userPhotoURL ? (
          <View style={styles.avatarContainer}>
            <View style={styles.avatarImageContainer}>
              <TouchableOpacity>
                <View style={styles.avatarCircle}>
                  <View style={styles.avatarInner}>
                    {item.userPhotoURL ? (
                      <TouchableOpacity>
                        <View style={styles.avatarImageWrapper}>
                          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                          <View style={styles.avatarContent}>
                            {item.userPhotoURL ? (
                              <View style={styles.avatarImageContent}>
                                <View style={styles.avatarBorder} />
                              </View>
                            ) : (
                              <Ionicons name="person" size={16} color={COLORS.white} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="person" size={16} color={COLORS.white} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={18} color={COLORS.white} />
          </View>
        )}
      </View>
      
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <ThemedText style={styles.username}>@{item.username}</ThemedText>
          <ThemedText style={styles.timestamp}>{timeAgo}</ThemedText>
        </View>
        <ThemedText style={styles.commentText}>{item.text}</ThemedText>
        
        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={styles.likeButton} 
            onPress={() => onLike(item.id)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={isLiked ? COLORS.primary : COLORS.white} 
            />
            <ThemedText style={[
              styles.likeCount, 
              isLiked && { color: COLORS.primary }
            ]}>
              {item.likes}
            </ThemedText>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.replyButton}>
            <ThemedText style={styles.replyText}>Reply</ThemedText>
          </TouchableOpacity> */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default CommentItem;
