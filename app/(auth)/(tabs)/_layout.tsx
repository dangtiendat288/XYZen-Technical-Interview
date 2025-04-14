import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  
  // Spotify green color
  const spotifyGreen = '#1DB954';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: spotifyGreen, // Changed to Spotify green
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#fff' : '#121212',
        tabBarStyle: {
          height: 85, // Increased from 60 to 70
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingTop: 5, // Adding padding to improve touchability
          paddingBottom: 10, // Adding padding at the bottom
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />      
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ color }) => <TabBarIcon name="upload" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
