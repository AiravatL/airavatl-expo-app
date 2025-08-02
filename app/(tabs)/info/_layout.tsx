import { Stack } from 'expo-router';

export default function InfoLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Information',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: 'Privacy Policy',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: 'About Us',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="contact"
        options={{
          title: 'Contact Us',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
