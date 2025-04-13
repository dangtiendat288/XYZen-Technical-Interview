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
import { Video, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/theme';

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
  onPlayPause?: () => void;
  onLikePress?: () => void;
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
  onPlayPause,
  onLikePress,
  containerHeight = height,
  showBackButton = false,
  onBackPress
}) => {
  const videoRef = useRef<Video | null>(null);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [localIsPlaying, setLocalIsPlaying] = useState<boolean>(isPlaying);

  // Update local state when prop changes
  React.useEffect(() => {
    setLocalIsPlaying(isPlaying);
  }, [isPlaying]);

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

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Video or Thumbnail */}
      {videoUri ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.videoBackground}
          resizeMode="cover"
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
        <TouchableOpacity style={styles.interactionButton} onPress={onLikePress}>
          <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
            <Ionicons name="heart" size={28} color="#1DB954" />
          </Animated.View>
          <Text style={styles.interactionText}>{formatNumber(likes)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton}>
          <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
          <Text style={styles.interactionText}>{formatNumber(comments)}</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
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
