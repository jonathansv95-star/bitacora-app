import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

const OPCIONES = {
  quality: 0.5,
  base64: true,
  exif: false,
};

function aFotos(resultado) {
  if (!resultado || resultado.canceled || !resultado.assets) return [];
  return resultado.assets
    .filter((a) => a.base64)
    .map((a) => ({ uri: a.uri, base64: a.base64 }));
}

/** Abre la cámara. Devuelve [{ uri, base64 }] o [] si se canceló. */
export async function tomarFoto() {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      "Permiso denegado",
      "Activa el permiso de cámara para la app desde los ajustes del teléfono."
    );
    return [];
  }

  return aFotos(await ImagePicker.launchCameraAsync(OPCIONES));
}

/** Abre la galería (permite escoger varias). Devuelve [{ uri, base64 }]. */
export async function elegirFotos(maximo = 5) {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      "Permiso denegado",
      "Activa el permiso de fotos para la app desde los ajustes del teléfono."
    );
    return [];
  }

  return aFotos(
    await ImagePicker.launchImageLibraryAsync({
      ...OPCIONES,
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: maximo,
    })
  );
}
