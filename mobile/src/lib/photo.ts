// Takes or picks a meal photo and shrinks it before it goes to the AI:
// a 1280 px JPEG is plenty to recognize food and keeps uploads fast and cheap.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export interface Photo {
  uri: string;
  base64: string;
}

export class PhotoError extends Error {
  constructor(public code: "permission" | "failed") {
    super(code);
  }
}

export async function getMealPhoto(from: "camera" | "library"): Promise<Photo | null> {
  const perm = from === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new PhotoError("permission");
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const result = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    // Give both sides: the web version of resize() can't work out a missing height.
    if (asset.width > 1280 && asset.height > 0) ctx.resize({ width: 1280, height: Math.round((asset.height * 1280) / asset.width) });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (!out.base64) throw new Error("no base64");
    return { uri: out.uri, base64: out.base64 };
  } catch (e) {
    console.warn("Photo processing failed", e);
    throw new PhotoError("failed");
  }
}
