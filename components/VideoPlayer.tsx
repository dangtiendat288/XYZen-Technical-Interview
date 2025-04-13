import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Text, 
  Dimensions, 
  Animated 
} from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/theme';
import CommentModal from './CommentModal';
import { togglePostLike } from '@/services/likeService';

const { width, height } = Dimensions.get('window');

interface VideoPlayerProps {
  id: string;
  videoUri: string;
  thumbnail: string;
  isPlaying: boolean;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  likeAnimation: Animated.Value;
  artist: string;
  username: string;
  description: string;
  title: string;
  likes: number;
  comments: number;
  shares: number;
  isVerified?: boolean;
  isLiked?: boolean;
  onPlayPause?: () => void;
  onLikePress?: (newStatus: boolean) => void;
  containerHeight?: number;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  id,
  videoUri,
  thumbnail,
  isPlaying,
  onPlaybackStatusUpdate,
  likeAnimation,
  artist,
  username,
  description,
  title,
  likes,
  comments,
  shares,
  isVerified = false,
  isLiked = false,
  onPlayPause,
  onLikePress,
  containerHeight = height,
  showBackButton = false,
  onBackPress
}) => {
  const videoRef = useRef<Video | null>(null);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [localIsPlaying, setLocalIsPlaying] = useState<boolean>(isPlaying);
  const [commentModalVisible, setCommentModalVisible] = useState<boolean>(false);
  const [localCommentCount, setLocalCommentCount] = useState<number>(comments);
  const [localLikes, setLocalLikes] = useState<number>(likes);
  const [localIsLiked, setLocalIsLiked] = useState<boolean>(isLiked);

  // Update local state when prop changes
  React.useEffect(() => {
    setLocalIsPlaying(isPlaying);
    setLocalIsLiked(isLiked);
    setLocalLikes(likes);
  }, [isPlaying, isLiked, likes]);

  // Update local comment count when props change
  React.useEffect(() => {
    setLocalCommentCount(comments);
  }, [comments]);

  // Format numbers for display (K/M)
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Handle video tap to toggle play/pause directly
  const handleVideoPress = () => {
    if (videoRef.current) {
      if (localIsPlaying) {
        videoRef.current.pauseAsync().then(() => {
          setLocalIsPlaying(false);
        });
      } else {
        videoRef.current.playAsync().then(() => {
          setLocalIsPlaying(true);
        });
      }
    }
    
    // Also notify parent component if callback exists
    if (onPlayPause) {
      onPlayPause();
    }
    
    // Show controls briefly
    setControlsVisible(true);
    setTimeout(() => {
      setControlsVisible(false);
    }, 1500);
  };

  // Handle comment button press
  const handleCommentPress = () => {
    // Pause video when opening comments
    if (videoRef.current && localIsPlaying) {
      videoRef.current.pauseAsync().then(() => {
        setLocalIsPlaying(false);
        if (onPlayPause) {
          onPlayPause();
        }
      });
    }
    
    setCommentModalVisible(true);
  };

  // Handle like button press - now using the likeService
  const handleLikePress = async () => {
    // Start animation regardless of state
    if (likeAnimation) {
      Animated.sequence([
        Animated.timing(likeAnimation, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(likeAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Update UI immediately for responsive feel
    const newLikeStatus = !localIsLiked;
    setLocalIsLiked(newLikeStatus);
    setLocalLikes(prev => newLikeStatus ? prev + 1 : prev - 1);

    // Call the likeService to handle the backend update
    try {
      const result = await togglePostLike(id, localIsLiked);
      
      if (!result.success) {
        // Revert UI if operation failed
        setLocalIsLiked(localIsLiked);
        setLocalLikes(prev => newLikeStatus ? prev - 1 : prev + 1);
        console.log("Like operation failed");
        return;
      }
      
      // Call the parent callback if provided
      if (onLikePress) {
        onLikePress(result.newLikeStatus);
      }
      
      console.log(`Successfully ${result.newLikeStatus ? 'liked' : 'unliked'} post`);
      
    } catch (error) {
      console.error("Error in like operation:", error);
      // Revert UI on error
      setLocalIsLiked(localIsLiked);
      setLocalLikes(prev => newLikeStatus ? prev - 1 : prev + 1);
    }
  };

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Video or Thumbnail */}
      {videoUri ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.videoBackground}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={localIsPlaying}
          isMuted={false}
          useNativeControls={false}
          onPlaybackStatusUpdate={(status) => {
            // Update local playing state based on actual playback status
            if (status.isLoaded) {
              setLocalIsPlaying(status.isPlaying);
            }
            
            // Call parent callback if provided
            if (onPlaybackStatusUpdate) {
              onPlaybackStatusUpdate(status);
            }
          }}
        />
      ) : (
        <Image
          source={{ uri: thumbnail }}
          style={styles.videoBackground}
          resizeMode="cover"
        />
      )}

      {/* Small gradient only at the bottom for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)']}
        style={styles.smallBottomGradient}
        pointerEvents="none"
      />

      {/* Touchable area for play/pause */}
      <TouchableOpacity 
        style={styles.touchableArea}
        activeOpacity={1} 
        onPress={handleVideoPress}
      >
        {/* Play/Pause indicator */}
        {controlsVisible && (
          <View style={styles.playIndicator}>
            <Ionicons 
              name={localIsPlaying ? "pause-circle" : "play-circle"} 
              size={80} 
              color="rgba(255, 255, 255, 0.8)" 
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Back button if needed */}
      {showBackButton && (
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Interaction controls - right side */}
      <View style={styles.interactionBar}>
        <TouchableOpacity style={styles.interactionButton} onPress={handleLikePress}>
          <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
            <Ionicons 
              name={localIsLiked ? "heart" : "heart-outline"} 
              size={28} 
              color={localIsLiked ? "#1DB954" : "#fff"} 
            />
          </Animated.View>
          <Text style={styles.interactionText}>{formatNumber(localLikes)}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={handleCommentPress}
        >
          <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
          <Text style={styles.interactionText}>{formatNumber(localCommentCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton}>
          <Ionicons name="share-social" size={26} color="#fff" />
          <Text style={styles.interactionText}>{formatNumber(shares)}</Text>
        </TouchableOpacity>
      </View>

      {/* Content info - bottom */}
      <View style={styles.contentInfo}>
        <View style={styles.artistRow}>
          <View style={styles.artistInfo}>
            <Text style={styles.artistName}>
              {artist} {isVerified && <Ionicons name="checkmark-circle" size={14} color="#1DB954" />}
            </Text>
            <Text style={styles.username}>{username}</Text>
          </View>
        </View>

        <Text style={styles.description}>{description}</Text>

        <View style={styles.titleContainer}>
          <Ionicons name="musical-notes" size={16} color="#fff" />
          <Text style={styles.songTitle}>{title}</Text>
        </View>
      </View>

      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        videoId={id}
        commentCount={localCommentCount}
        onCommentCountChange={(newCount) => setLocalCommentCount(newCount)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // ...existing styles remain unchanged...
  container: {
    width: width,
    justifyContent: 'flex-end',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  smallBottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '25%', // Slightly taller gradient for better text readability
  },
  touchableArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  playIndicator: {
    borderRadius: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  interactionBar: {
    position: 'absolute',
    right: 15,
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 5, 
  },
  interactionButton: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 8,
  },
  interactionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 3,
  },
  contentInfo: {
    paddingLeft: 20,
    paddingRight: 80,
    paddingBottom: 30,
    zIndex: 5,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  artistInfo: {
    flexDirection: 'column',
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  songTitle: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default VideoPlayer;