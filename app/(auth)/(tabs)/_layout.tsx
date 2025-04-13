import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

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

  return (
    <Tabs
      screenOptions={{
      tabBarActiveTintColor: colorScheme === 'dark' ? '#fff' : '#007AFF',
      tabBarStyle: {
        height: 60,
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
