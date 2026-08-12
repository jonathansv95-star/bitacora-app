import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colores, espacio, radio, tipografia, sombra } from "../lib/tema";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modoRegistro, setModoRegistro] = useState(false);

  async function handleAuth() {
    if (!email.trim() || !password) {
      Alert.alert("Faltan datos", "Escribe tu correo y contraseña.");
      return;
    }
    setLoading(true);
    const { error } = modoRegistro
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else if (modoRegistro) {
      Alert.alert("Listo", "Cuenta creada. Revisa tu correo si se requiere confirmación.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contenedor}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.tarjeta}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.titulo}>Bitácoras{"\n"}Planta Fotovoltaica{"\n"}Independencia</Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor={colores.textoTenue}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colores.textoTenue}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.boton, loading && styles.botonDeshabilitado]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>
                {modoRegistro ? "Crear cuenta" : "Iniciar sesión"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModoRegistro(!modoRegistro)}>
            <Text style={styles.link}>
              {modoRegistro
                ? "¿Ya tienes cuenta? Inicia sesión"
                : "¿No tienes cuenta? Regístrate"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.credito}>Creado por Jonathan Guzmán</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { flexGrow: 1, justifyContent: "center", padding: espacio.xxl },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.xl,
    padding: espacio.xxl,
    ...sombra,
  },
  logo: { width: "100%", height: 90, marginBottom: espacio.lg },
  titulo: {
    fontSize: tipografia.subtitulo,
    fontWeight: tipografia.pesoNegrita,
    textAlign: "center",
    marginBottom: espacio.xxxl,
    color: colores.texto,
  },
  input: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: 14,
    marginBottom: espacio.md,
    fontSize: tipografia.cuerpo,
    backgroundColor: colores.fondo,
    color: colores.texto,
  },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    padding: 14,
    alignItems: "center",
    marginTop: espacio.sm,
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: "#fff", fontSize: tipografia.cuerpo, fontWeight: tipografia.pesoMedia },
  link: { color: colores.primario, textAlign: "center", marginTop: espacio.lg },
  credito: {
    marginTop: espacio.xxl,
    textAlign: "center",
    fontSize: tipografia.miniatura,
    color: colores.textoTenue,
  },
});
