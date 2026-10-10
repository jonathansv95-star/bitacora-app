import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colores, espacio, radio, tipografia } from "../lib/tema";

const STRINGS = [
  { id: "rojo-1", nombre: "String rojo 1", color: "rojo", dispositivo: "Cable solar rojo" },
  { id: "rojo-2", nombre: "String rojo 2", color: "rojo", dispositivo: "Cable solar rojo" },
  { id: "rojo-3", nombre: "String rojo 3", color: "rojo", dispositivo: "Cable solar rojo" },
  { id: "negro-1", nombre: "String negro 1", color: "negro", dispositivo: "Cable solar negro" },
  { id: "negro-2", nombre: "String negro 2", color: "negro", dispositivo: "Cable solar negro" },
  { id: "negro-3", nombre: "String negro 3", color: "negro", dispositivo: "Cable solar negro" },
];

function fechaHoraActual() {
  const ahora = new Date();
  return {
    fecha: `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`,
    hora: `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`,
  };
}

function valoresIniciales() {
  return Object.fromEntries(
    STRINGS.map((string) => [string.id, { ct: "", inversor: "", tracker: "", cantidad: "" }])
  );
}

export default function ReporteStringsScreen({ navigation }) {
  const [valores, setValores] = useState(valoresIniciales);
  const [guardando, setGuardando] = useState(false);

  function cambiar(stringId, campo, valor) {
    if (stringId !== STRINGS[0].id && campo !== "cantidad") return;

    setValores((actuales) => {
      if (stringId === STRINGS[0].id && campo !== "cantidad") {
        return Object.fromEntries(
          STRINGS.map((string) => [
            string.id,
            campo === "cantidad"
              ? actuales[string.id]
              : { ...actuales[string.id], [campo]: valor },
          ])
        );
      }

      return {
        ...actuales,
        [stringId]: { ...actuales[stringId], [campo]: valor },
      };
    });
  }

  async function guardar() {
    const incompletos = STRINGS.filter((string) =>
      Object.values(valores[string.id]).some((valor) => !valor.trim())
    );

    if (incompletos.length > 0) {
      Alert.alert(
        "Reporte incompleto",
        `Completa CT, inversor, tracker y cantidad para: ${incompletos.map((s) => s.nombre).join(", ")}.`
      );
      return;
    }

    setGuardando(true);
    try {
      const { data: userData, error: errorUsuario } = await supabase.auth.getUser();
      if (errorUsuario) throw errorUsuario;

      const { fecha, hora } = fechaHoraActual();
      const registros = STRINGS.map((string) => ({
        fecha,
        hora,
        medio_deteccion: "Campo",
        ct: valores[string.id].ct.trim(),
        inversor: valores[string.id].inversor.trim(),
        tracker: valores[string.id].tracker.trim(),
        string_num: string.id.endsWith("-1") ? "1" : string.id.endsWith("-2") ? "2" : "3",
        dispositivo: string.dispositivo,
        cantidad: valores[string.id].cantidad.trim(),
        evento: "Cambio de cable solar en string",
        solucion: "Se cambio cable solar",
        descripcion: "Reporte de cambio de string",
        n_correctivo: "",
        creado_por: userData.user.id,
      }));

      const { error } = await supabase.from("eventos").insert(registros);
      if (error) throw error;

      Alert.alert("Reporte guardado", `Se registraron los 6 strings del ${fecha} a las ${hora}.`, [
        { text: "Continuar", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("No se pudo guardar el reporte", e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Reporte de cambio cable en string</Text>
          <Text style={styles.descripcion}>
            Completa los datos de cada cable. La fecha y hora se asignan al guardar.
          </Text>
        </View>

        {STRINGS.map((string) => (
          <View key={string.id} style={styles.tarjeta}>
            <View style={styles.filaTitulo}>
              <View style={[styles.punto, string.color === "rojo" ? styles.puntoRojo : styles.puntoNegro]} />
              <Text style={styles.nombreString}>{string.nombre}</Text>
            </View>
            <View style={styles.filaCampos}>
              {["ct", "inversor", "tracker", "cantidad"].map((campo) => (
                <View key={campo} style={styles.campo}>
                  <Text style={styles.etiqueta}>{campo === "ct" ? "CT" : campo[0].toUpperCase() + campo.slice(1)}</Text>
                  <TextInput
                    style={[styles.input, campo !== "cantidad" && string.id !== STRINGS[0].id && styles.inputAutomatico]}
                    value={valores[string.id][campo]}
                    onChangeText={(valor) => cambiar(string.id, campo, valor)}
                    placeholder=""
                    placeholderTextColor={colores.textoTenue}
                    keyboardType="numeric"
                    editable={campo === "cantidad" || string.id === STRINGS[0].id}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar reporte de strings</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.xl, paddingBottom: 180 },
  encabezado: { marginBottom: espacio.lg },
  titulo: { color: colores.texto, fontSize: 23, fontWeight: tipografia.pesoNegrita },
  descripcion: { color: colores.textoSuave, fontSize: 13, lineHeight: 19, marginTop: 6 },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: espacio.md,
  },
  filaTitulo: { flexDirection: "row", alignItems: "center", marginBottom: espacio.md },
  punto: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  puntoRojo: { backgroundColor: "#dc2626" },
  puntoNegro: { backgroundColor: "#111827" },
  nombreString: { color: colores.texto, fontSize: 15, fontWeight: tipografia.pesoNegrita },
  filaCampos: { flexDirection: "row", gap: espacio.sm },
  campo: { flex: 1 },
  etiqueta: { color: colores.textoTenue, fontSize: 11, marginBottom: 4 },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    backgroundColor: colores.fondo,
    color: colores.texto,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 14,
  },
  inputAutomatico: { opacity: 0.65 },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    padding: 15,
    alignItems: "center",
    marginTop: espacio.md,
  },
  botonTexto: { color: "#fff", fontSize: 15, fontWeight: tipografia.pesoMedia },
});
