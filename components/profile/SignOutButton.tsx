import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS, SIZES } from '@/constants/theme';

interface SignOutButtonProps {
  onlyIcon?: boolean;
}

const SignOutButton = ({ onlyIcon = false }: SignOutButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { signout } = useAuth();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signout();
    } catch (error) {
      Alert.alert('Sign out failed', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={handleSignOut}
      disabled={loading}
    >
      {onlyIcon ? (
        <Text style={styles.iconText}>⎋</Text>
      ) : (
        <Text style={styles.buttonText}>
          {loading ? 'Signing out...' : 'Sign Out'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.error,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  iconText: {
    color: COLORS.white,
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  }
});

export default SignOutButton;