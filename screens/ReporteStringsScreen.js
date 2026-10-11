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
  { id: "rojo-1", nombre: "String 1", color: "rojo", dispositivo: "Cable solar rojo" },
  { id: "rojo-2", nombre: "String 2", color: "rojo", dispositivo: "Cable solar rojo" },
  { id: "rojo-3", nombre: "String 3", color: "rojo", dispositivo: "Cable solar rojo" },
  { id: "negro-1", nombre: "String 1", color: "negro", dispositivo: "Cable solar negro" },
  { id: "negro-2", nombre: "String 2", color: "negro", dispositivo: "Cable solar negro" },
  { id: "negro-3", nombre: "String 3", color: "negro", dispositivo: "Cable solar negro" },
];

function fechaHoraActual(minutosExtra = 0) {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() + minutosExtra);
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

function conTiempoLimite(promesa, milisegundos = 20000) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(
      () => reject(new Error("La conexión está tardando demasiado. Revisa internet e inténtalo de nuevo.")),
      milisegundos
    );
    Promise.resolve(promesa).then(resolve, reject).finally(() => clearTimeout(temporizador));
  });
}

export default function ReporteStringsScreen({ navigation }) {
  const [valores, setValores] = useState(valoresIniciales);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const datosComunes = valores[STRINGS[0].id];
  const completados = STRINGS.filter((string) => valores[string.id].cantidad.trim()).length;
  const totalCable = STRINGS.reduce((total, string) => total + (Number(valores[string.id].cantidad) || 0), 0);

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
    setMensaje("Preparando el reporte...");
    try {
      const { data: userData, error: errorUsuario } = await conTiempoLimite(supabase.auth.getUser());
      if (errorUsuario) throw errorUsuario;

      const registros = STRINGS.map((string, indice) => {
        const { fecha, hora } = fechaHoraActual(indice);
        return {
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
        };
      });

      setMensaje("Guardando los 6 strings...");
      const { error } = await conTiempoLimite(supabase.from("eventos").insert(registros));
      if (error) throw error;

      const primerRegistro = registros[0];
      const ultimoRegistro = registros[registros.length - 1];
      Alert.alert(
        "Reporte guardado",
        `Se registraron los 6 strings desde las ${primerRegistro.hora} hasta las ${ultimoRegistro.hora}.`,
        [
        { text: "Continuar", onPress: () => navigation.goBack() },
        ]
      );
    } catch (e) {
      Alert.alert("No se pudo guardar el reporte", e.message);
    } finally {
      setGuardando(false);
      setMensaje("");
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

        <View style={styles.tarjetaComun}>
          <View style={styles.filaTitulo}>
            <Text style={styles.nombreString}>Datos del equipo</Text>
            <Text style={styles.etiquetaCopia}>Se copian en los 6 strings</Text>
          </View>
          <View style={styles.filaCampos}>
            {["ct", "inversor", "tracker"].map((campo) => (
              <View key={campo} style={styles.campoComun}>
                <Text style={styles.etiqueta}>{campo === "ct" ? "CT" : campo[0].toUpperCase() + campo.slice(1)}</Text>
                <TextInput
                  style={styles.input}
                  value={datosComunes[campo]}
                  onChangeText={(valor) => cambiar(STRINGS[0].id, campo, valor)}
                  placeholder=""
                  placeholderTextColor={colores.textoTenue}
                  keyboardType="numeric"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.resumenTarjeta}>
          <View>
            <Text style={styles.resumenEtiqueta}>Avance del reporte</Text>
            <Text style={styles.resumenValor}>{completados} de 6 strings</Text>
          </View>
          <View style={styles.totalCaja}>
            <Text style={styles.resumenEtiqueta}>Total cable</Text>
            <Text style={styles.totalValor}>{totalCable} m</Text>
          </View>
        </View>

        {STRINGS.map((string) => (
          <React.Fragment key={string.id}>
            <View style={styles.tarjeta}>
              <View style={styles.filaTitulo}>
                <View style={styles.cableIcono}>
                  <View style={[styles.cableTerminal, string.color === "rojo" ? styles.cableRojo : styles.cableNegro]} />
                  <View style={[styles.cableLinea, string.color === "rojo" ? styles.cableRojo : styles.cableNegro]} />
                  <View style={[styles.cableTerminal, string.color === "rojo" ? styles.cableRojo : styles.cableNegro]} />
                </View>
                <Text style={styles.nombreString}>{string.nombre}</Text>
                {valores[string.id].cantidad.trim() ? <Text style={styles.marcaCompleto}>Listo</Text> : null}
              </View>
              <View style={styles.campoCantidad}>
                <Text style={styles.etiqueta}>Metraje de cable a cambiar</Text>
                <TextInput
                  style={styles.inputCantidad}
                  value={valores[string.id].cantidad}
                  onChangeText={(valor) => cambiar(string.id, "cantidad", valor)}
                  placeholder="Ej: 61"
                  placeholderTextColor={colores.textoTenue}
                  keyboardType="numeric"
                />
                <Text style={styles.unidad}>metros</Text>
              </View>
            </View>
          </React.Fragment>
        ))}

        <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar reporte de strings</Text>}
        </TouchableOpacity>
        {guardando ? <Text style={styles.progreso}>{mensaje}</Text> : null}
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
  tarjetaComun: {
    backgroundColor: colores.primarioSuave,
    borderWidth: 1,
    borderColor: colores.primarioClaro,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: espacio.md,
  },
  etiquetaCopia: { color: colores.primario, fontSize: 11, marginLeft: "auto" },
  resumenTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: espacio.lg,
  },
  resumenEtiqueta: { color: colores.textoTenue, fontSize: 11, marginBottom: 3 },
  resumenValor: { color: colores.texto, fontSize: 15, fontWeight: tipografia.pesoNegrita },
  totalCaja: { alignItems: "flex-end" },
  totalValor: { color: colores.primario, fontSize: 19, fontWeight: tipografia.pesoNegrita },
  grupoTitulo: {
    color: colores.textoSuave,
    fontSize: 13,
    fontWeight: tipografia.pesoNegrita,
    marginBottom: espacio.sm,
    marginTop: espacio.sm,
  },
  filaTitulo: { flexDirection: "row", alignItems: "center", marginBottom: espacio.md },
  cableIcono: { flexDirection: "row", alignItems: "center", width: 32, marginRight: 8 },
  cableTerminal: { width: 6, height: 6, borderRadius: 3 },
  cableLinea: { flex: 1, height: 5, borderRadius: 3 },
  cableRojo: { backgroundColor: "#dc2626" },
  cableNegro: { backgroundColor: "#111827" },
  nombreString: { color: colores.texto, fontSize: 15, fontWeight: tipografia.pesoNegrita },
  filaCampos: { flexDirection: "row", flexWrap: "wrap", gap: espacio.sm },
  campo: { flexGrow: 1, flexBasis: 58, minWidth: 58 },
  campoComun: { flex: 1, minWidth: 70 },
  campoCantidad: { flexDirection: "row", alignItems: "center", gap: espacio.sm },
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
  inputCantidad: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colores.primario,
    borderRadius: radio.md,
    backgroundColor: colores.fondo,
    color: colores.texto,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: tipografia.pesoMedia,
  },
  unidad: { color: colores.textoTenue, fontSize: 12 },
  marcaCompleto: {
    marginLeft: "auto",
    color: colores.exito,
    backgroundColor: colores.exitoClaro,
    borderRadius: radio.redondo,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: tipografia.pesoMedia,
  },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    padding: 15,
    alignItems: "center",
    marginTop: espacio.md,
  },
  botonTexto: { color: "#fff", fontSize: 15, fontWeight: tipografia.pesoMedia },
  progreso: { color: colores.textoSuave, fontSize: 12, textAlign: "center", marginTop: 10 },
});
