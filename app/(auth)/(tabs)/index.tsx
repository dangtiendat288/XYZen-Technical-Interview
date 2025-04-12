import React, { useEffect } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { COLORS, SIZES } from '@/constants/theme';
import SignOutButton from '@/components/profile/SignOutButton';

export default function FeedScreen() {
  const { session, user } = useAuth();
  const router = useRouter();

  // If user is not authenticated, redirect to sign-in screen
//   if (!session) {
//     return <Redirect href="/sign-in" />;
//   }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Feed</ThemedText>
      </View>
      
      <ThemedView style={styles.content}>
        <ThemedText>Welcome, {user?.email}</ThemedText>
        <ThemedText style={styles.description}>
          This is your feed page. Content from artists and creators you follow will appear here.
        </ThemedText>
        
        {/* Placeholder for feed content */}
        <View style={styles.placeholder}>
          <ThemedText style={styles.placeholderText}>
            Feed content will display here
          </ThemedText>
        </View>
      <SignOutButton onlyIcon />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    marginTop: 10,
    color: COLORS.gray,
    fontSize: SIZES.medium,
  },
  placeholder: {
    marginTop: 30,
    padding: 20,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  placeholderText: {
    color: COLORS.white,
    fontSize: SIZES.medium,
  }
});