import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="signup" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="property/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="filters" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="add-property" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="my-listings" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="saved" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="bookings" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="edit-profile" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="admin" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="my-reviews" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="tenant-rights" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <RootLayoutNav />
          </GestureHandlerRootView>
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
