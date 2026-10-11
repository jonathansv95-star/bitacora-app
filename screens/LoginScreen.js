import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colores, espacio, radio, tipografia, sombra } from "../lib/tema";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const animacionLogo = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const paddingPantalla = width < 360 ? espacio.lg : espacio.xxl;
  const logoAlto = Math.min(250, Math.max(155, width * 0.63), height < 700 ? 190 : 250);

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(animacionLogo, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(animacionLogo, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    animacion.start();
    return () => animacion.stop();
  }, [animacionLogo]);

  async function handleAuth() {
    if (!email.trim() || !password) {
      Alert.alert("Faltan datos", "Escribe tu correo y contraseña.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View pointerEvents="none" style={styles.decoracion}>
        <View style={styles.sol} />
        <View style={styles.paneles}>
          {Array.from({ length: 8 }).map((_, indice) => (
            <View key={indice} style={styles.panel}>
              <View style={styles.panelLineaVertical} />
              <View style={styles.panelLineaHorizontal} />
            </View>
          ))}
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.contenedor, { paddingHorizontal: paddingPantalla }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={[styles.tarjeta, { padding: paddingPantalla }]}>
          <Text style={styles.etiqueta}>OPERACIÓN Y MANTENIMIENTO</Text>
          <Animated.Image
            source={require("../assets/logo.png")}
            style={[
              styles.logo,
              { height: logoAlto },
              {
                transform: [
                  { translateY: animacionLogo.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                  { scale: animacionLogo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
                ],
              },
            ]}
            resizeMode="contain"
          />
          <Image
            source={require("../assets/logo-potenza.png")}
            style={styles.logoPotenza}
            resizeMode="contain"
          />
          <View style={styles.banderas}>
            <Text style={styles.bandera}>🇪🇸</Text>
            <Text style={styles.separadorBandera}>·</Text>
            <Text style={styles.bandera}>🇸🇻</Text>
          </View>
          <Text style={styles.titulo}>GMAO Independencia{"\n"}El Salvador</Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor={colores.textoTenue}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onFocus={() => scrollRef.current?.scrollTo({ y: 210, animated: true })}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={colores.textoTenue}
            secureTextEntry={!mostrarPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={() => scrollRef.current?.scrollTo({ y: 290, animated: true })}
          />
          <TouchableOpacity
            style={styles.verPassword}
            onPress={() => setMostrarPassword((visible) => !visible)}
          >
            <Text style={styles.verPasswordTexto}>
              {mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.boton, loading && styles.botonDeshabilitado]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.credito}>Creado por Jonathan Guzmán</Text>
          <Text style={styles.privacidadTitulo}>Aviso de privacidad</Text>
          <Text style={styles.privacidadTexto}>
            Esta aplicación es para uso exclusivo de personal autorizado. El acceso y la información registrada son de carácter privado.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "#071426" },
  decoracion: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  sol: {
    position: "absolute",
    top: -72,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#fbbf24",
    opacity: 0.92,
    shadowColor: "#f59e0b",
    shadowOpacity: 0.7,
    shadowRadius: 35,
    elevation: 12,
  },
  paneles: {
    position: "absolute",
    left: -38,
    right: -38,
    bottom: -70,
    height: 220,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    transform: [{ rotate: "-10deg" }],
    opacity: 0.55,
  },
  panel: {
    width: 86,
    height: 58,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#60a5fa",
    backgroundColor: "#123566",
    overflow: "hidden",
  },
  panelLineaVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "#60a5fa",
  },
  panelLineaHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "#60a5fa",
  },
  contenedor: { flexGrow: 1, justifyContent: "center", padding: espacio.xxl },
  tarjeta: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: espacio.xxl,
    ...sombra,
  },
  etiqueta: {
    color: colores.primario,
    fontSize: 10,
    fontWeight: tipografia.pesoNegrita,
    letterSpacing: 1.4,
    textAlign: "center",
    marginBottom: espacio.lg,
  },
  logo: { width: "100%", height: 250, marginBottom: espacio.lg },
  logoPotenza: { width: "100%", height: 72, marginTop: -44, marginBottom: espacio.lg },
  banderas: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: -8, marginBottom: espacio.lg },
  bandera: { fontSize: 38 },
  separadorBandera: { color: colores.textoTenue, fontSize: 22, marginHorizontal: 10 },
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
  verPassword: { alignSelf: "flex-end", marginTop: -6, marginBottom: 4, paddingVertical: 4 },
  verPasswordTexto: { color: colores.primario, fontSize: 12, fontWeight: tipografia.pesoMedia },
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
  privacidadTitulo: {
    marginTop: espacio.lg,
    textAlign: "center",
    color: colores.primario,
    fontSize: 12,
    fontWeight: tipografia.pesoMedia,
  },
  privacidadTexto: {
    marginTop: 4,
    textAlign: "center",
    color: colores.textoTenue,
    fontSize: 11,
    lineHeight: 16,
  },
});
