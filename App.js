import React, { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { supabase } from "./lib/supabase";
import { limpiarFotosViejas } from "./lib/limpieza";
import { colores, radio, espacio, tipografia } from "./lib/tema";

import LoginScreen from "./screens/LoginScreen";
import ListaScreen from "./screens/ListaScreen";
import NuevaScreen from "./screens/NuevaScreen";
import DetalleScreen from "./screens/DetalleScreen";
import ExportarScreen from "./screens/ExportarScreen";
import TareasScreen from "./screens/TareasScreen";
import TareaDetalleScreen from "./screens/TareaDetalleScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const temaNavegacion = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colores.primario,
    background: colores.fondo,
    card: colores.superficie,
    text: colores.texto,
    border: colores.borde,
  },
};

const opcionesPantalla = {
  headerStyle: { backgroundColor: colores.superficie },
  headerTintColor: colores.texto,
  headerTitleStyle: { fontWeight: tipografia.pesoNegrita },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colores.fondo },
};

function BotonSalir() {
  return (
    <TouchableOpacity
      onPress={() => supabase.auth.signOut()}
      style={{ paddingHorizontal: 4 }}
    >
      <Text style={{ color: colores.primario, fontWeight: tipografia.pesoMedia }}>
        Salir
      </Text>
    </TouchableOpacity>
  );
}

function IconoTab({ emoji, color, size }) {
  return (
    <View style={{ width: size + 8, alignItems: "center" }}>
      <Text style={{ fontSize: size - 2, color }}>{emoji}</Text>
    </View>
  );
}

function StackBitacoras() {
  return (
    <Stack.Navigator screenOptions={opcionesPantalla}>
      <Stack.Screen
        name="Bitacoras"
        component={ListaScreen}
        options={{
          title: "Bitácoras Planta Independencia",
          headerRight: () => <BotonSalir />,
        }}
      />
      <Stack.Screen name="Nueva" component={NuevaScreen} />
      <Stack.Screen
        name="Exportar"
        component={ExportarScreen}
        options={{ title: "Exportar Excel" }}
      />
      <Stack.Screen name="Detalle" component={DetalleScreen} options={{ title: "Detalle" }} />
    </Stack.Navigator>
  );
}

function StackTareas() {
  return (
    <Stack.Navigator screenOptions={opcionesPantalla}>
      <Stack.Screen
        name="Tareas"
        component={TareasScreen}
        options={{ title: "Tareas de Mantenimiento", headerRight: () => <BotonSalir /> }}
      />
      <Stack.Screen
        name="TareaDetalle"
        component={TareaDetalleScreen}
        options={{ title: "Tarea" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    let vigente = true;

    const tope = setTimeout(() => {
      if (vigente) setEstado("error");
    }, 10000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!vigente) return;
        clearTimeout(tope);
        setSesion(session);
        setEstado("listo");
        if (session) limpiarFotosViejas();
      })
      .catch(() => {
        if (!vigente) return;
        clearTimeout(tope);
        setEstado("error");
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!vigente) return;
      setSesion(session);
      setEstado("listo");
      if (session) limpiarFotosViejas();
    });

    return () => {
      vigente = false;
      clearTimeout(tope);
      listener.subscription.unsubscribe();
    };
  }, [intentos]);

  function reintentar() {
    setEstado("cargando");
    setIntentos((n) => n + 1);
  }

  if (estado === "cargando") {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={colores.primario} />
        <Text style={styles.textoCentro}>Conectando con el servidor...</Text>
      </View>
    );
  }

  if (estado === "error") {
    return (
      <View style={styles.centro}>
        <Text style={styles.tituloError}>⚠️ No se pudo conectar</Text>
        <Text style={styles.textoCentro}>
          No se pudo contactar al servidor de sesión.{"\n"}
          Revisa tu conexión a internet e inténtalo de nuevo.
        </Text>
        <TouchableOpacity style={styles.botonReintentar} onPress={reintentar}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer theme={temaNavegacion}>
      {!sesion ? (
        <Stack.Navigator screenOptions={opcionesPantalla}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      ) : (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colores.primario,
            tabBarInactiveTintColor: colores.textoTenue,
            tabBarStyle: {
              backgroundColor: colores.superficie,
              borderTopColor: colores.borde,
              height: 62,
              paddingBottom: 8,
              paddingTop: 6,
            },
            tabBarLabelStyle: { fontSize: tipografia.miniatura, fontWeight: tipografia.pesoMedia },
          }}
        >
          <Tab.Screen
            name="BitacorasTab"
            component={StackBitacoras}
            options={{
              title: "Bitácoras",
              tabBarIcon: ({ color, size }) => <IconoTab emoji="📋" color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="TareasTab"
            component={StackTareas}
            options={{
              title: "Tareas",
              tabBarIcon: ({ color, size }) => <IconoTab emoji="🔧" color={color} size={size} />,
            }}
          />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colores.fondo,
    padding: espacio.xxl,
  },
  textoCentro: {
    marginTop: espacio.lg,
    color: colores.textoSuave,
    fontSize: tipografia.cuerpo,
    textAlign: "center",
    lineHeight: 22,
  },
  tituloError: {
    fontSize: tipografia.subtitulo,
    fontWeight: tipografia.pesoNegrita,
    color: colores.texto,
    marginBottom: espacio.sm,
  },
  botonReintentar: {
    marginTop: espacio.xxl,
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  botonReintentarTexto: {
    color: "#fff",
    fontSize: tipografia.cuerpo,
    fontWeight: tipografia.pesoMedia,
  },
});
