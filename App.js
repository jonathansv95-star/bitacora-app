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
import { limpiarBitacorasViejas } from "./lib/limpieza";
import { contarPendientes, limpiarAnioAnterior } from "./lib/tareas";
import { colores, radio, espacio, tipografia } from "./lib/tema";

import LoginScreen from "./screens/LoginScreen";
import ListaScreen from "./screens/ListaScreen";
import NuevaScreen from "./screens/NuevaScreen";
import DetalleScreen from "./screens/DetalleScreen";
import TareasScreen from "./screens/TareasScreen";
import TareaDetalleScreen from "./screens/TareaDetalleScreen";
import ReporteStringsScreen from "./screens/ReporteStringsScreen";

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

function BarraFlotante({ state, navigation, pendientes }) {
  const opciones = [
    { nombre: "Bitácoras", emoji: "📋" },
    { nombre: "Tareas", emoji: "👷" },
  ];

  return (
    <View style={styles.barraFlotante}>
      {state.routes.map((route, index) => {
        const activo = state.index === index;
        const opcion = opciones[index];
        const seleccionar = () => {
          const evento = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!activo && !evento.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={opcion.nombre}
            onPress={seleccionar}
            style={styles.botonNavegacion}
          >
            <View style={[styles.iconoFlotante, activo && styles.iconoFlotanteActivo]}>
              <Text style={styles.iconoFlotanteTexto}>{opcion.emoji}</Text>
              {index === 1 && pendientes > 0 ? (
                <View style={styles.badgeTareas}>
                  <Text style={styles.badgeTareasTexto}>{pendientes}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.textoNavegacion, activo && styles.textoNavegacionActivo]}>
              {opcion.nombre}
            </Text>
          </TouchableOpacity>
        );
      })}
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
        name="ReporteStrings"
        component={ReporteStringsScreen}
        options={{ title: "Cambio cable en string" }}
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
  const [pendientes, setPendientes] = useState(0);

  async function actualizarPendientes() {
    try {
      setPendientes(await contarPendientes());
    } catch {
      setPendientes(0);
    }
  }

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
        if (session) limpiarBitacorasViejas();
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
      if (session) limpiarBitacorasViejas();
    });

    return () => {
      vigente = false;
      clearTimeout(tope);
      listener.subscription.unsubscribe();
    };
  }, [intentos]);

  useEffect(() => {
    if (sesion) {
      actualizarPendientes();
      limpiarAnioAnterior().catch(() => {});
    }
  }, [sesion]);

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
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <BarraFlotante {...props} pendientes={pendientes} />}
        >
          <Tab.Screen
            name="BitacorasTab"
            component={StackBitacoras}
            options={{
              title: "Bitácoras",
            }}
            listeners={{ focus: actualizarPendientes }}
          />
          <Tab.Screen
            name="TareasTab"
            component={StackTareas}
            options={{
              title: "Tareas",
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
  barraFlotante: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  botonNavegacion: { alignItems: "center", minWidth: 72 },
  iconoFlotante: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  iconoFlotanteActivo: { backgroundColor: colores.primarioSuave, borderColor: colores.primario },
  iconoFlotanteTexto: { fontSize: 21 },
  textoNavegacion: { color: colores.textoTenue, fontSize: 11, marginTop: 2 },
  textoNavegacionActivo: { color: colores.primario, fontWeight: tipografia.pesoNegrita },
  badgeTareas: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.peligro,
  },
  badgeTareasTexto: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
