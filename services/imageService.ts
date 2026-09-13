import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

export interface ImageResult {
  uri: string;
  base64?: string;
  width?: number;
  height?: number;
}

// Create a directory for storing wardrobe images
const createImageDirectory = async () => {
  const imageDir = `${FileSystem.documentDirectory}wardrobe_images/`;
  const dirInfo = await FileSystem.getInfoAsync(imageDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });
  }
  return imageDir;
};

// Copy image to permanent storage
const copyImageToPermanentStorage = async (tempUri: string): Promise<string> => {
  try {
    const imageDir = await createImageDirectory();
    const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const permanentUri = `${imageDir}${filename}`;
    
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri,
    });
    
    return permanentUri;
  } catch (error) {
    console.error("Error copying image to permanent storage:");
    throw error;
  }
};

export const pickImageFromLibrary = async (): Promise<ImageResult | null> => {
  try {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Copy image to permanent storage
      const permanentUri = await copyImageToPermanentStorage(asset.uri);
      
      return {
        uri: permanentUri,
        base64: asset.base64 ?? undefined,
        width: asset.width,
        height: asset.height,
      };
    }

    return null;
  } catch (error) {
    console.error("Error picking image from library:");
    Alert.alert('Error', 'Failed to pick image from library');
    return null;
  }
};

export const pickImageFromCamera = async (): Promise<ImageResult | null> => {
  try {
    // Request permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return null;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Copy image to permanent storage
      const permanentUri = await copyImageToPermanentStorage(asset.uri);
      
      return {
        uri: permanentUri,
        base64: asset.base64 ?? undefined,
        width: asset.width,
        height: asset.height,
      };
    }

    return null;
  } catch (error) {
    console.error("Error taking photo:");
    Alert.alert('Error', 'Failed to take photo');
    return null;
  }
};

// Helper function to delete image from storage
export const deleteImageFromStorage = async (uri: string): Promise<void> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri);
    }
  } catch (error) {
    console.error("Error deleting image:");
  }
};
