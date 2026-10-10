import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import { subirFotos, urlsDeFotos, borrarFotos } from "../lib/fotos";
import { tomarFoto, elegirFotos } from "../lib/camara";
import { colores, espacio, radio, tipografia } from "../lib/tema";

const MAX_FOTOS = 10;

function horaActual() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fechaActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NuevaScreen({ navigation, route }) {
  const evento = route.params?.evento;

  const [fecha, setFecha] = useState(evento?.fecha || fechaActual());
  const [hora, setHora] = useState(evento?.hora?.slice(0, 5) || horaActual());
  const [medioDeteccion, setMedioDeteccion] = useState(evento?.medio_deteccion || "Scada");
  const [ct, setCt] = useState(evento?.ct || "");
  const [inversor, setInversor] = useState(evento?.inversor || "");
  const [tracker, setTracker] = useState(evento?.tracker || "");
  const [stringNum, setStringNum] = useState(evento?.string_num || "");
  const [dispositivo, setDispositivo] = useState(evento?.dispositivo || "");
  const [cantidad, setCantidad] = useState(evento?.cantidad || "");
  const [eventoTexto, setEventoTexto] = useState(evento?.evento || "");
  const [solucion, setSolucion] = useState(evento?.solucion || "");
  const [descripcion, setDescripcion] = useState(evento?.descripcion || "");
  const [nCorrectivo, setNCorrectivo] = useState(evento?.n_correctivo || "");
  const [fotos, setFotos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardando, setMensajeGuardando] = useState("");
  const [cargandoFotos, setCargandoFotos] = useState(false);

  const esEdicion = !!evento;

  useEffect(() => {
    navigation.setOptions({ title: esEdicion ? "Editar bitácora" : "Nueva bitácora" });
  }, [navigation, esEdicion]);

  useEffect(() => {
    if (!esEdicion) return;
    let vigente = true;
    async function cargar() {
      const rutas = evento.fotos || [];
      if (rutas.length === 0) return;
      setCargandoFotos(true);
      const urls = await urlsDeFotos(rutas);
      if (!vigente) return;
      setFotos(rutas.map((ruta) => {
        const conUrl = urls.find((u) => u.ruta === ruta);
        return { tipo: "existente", ruta, url: conUrl?.url || null };
      }));
      setCargandoFotos(false);
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, [esEdicion]);

  function agregarFotos(nuevas) {
    if (nuevas.length === 0) return;
    setFotos((actuales) => {
      const espacioRestante = MAX_FOTOS - actuales.length;
      if (espacioRestante <= 0) {
        Alert.alert("Límite de fotos", `Solo se pueden adjuntar ${MAX_FOTOS} fotos por evento.`);
        return actuales;
      }
      if (nuevas.length > espacioRestante) {
        Alert.alert("Límite de fotos", `Solo se agregaron ${espacioRestante}; el máximo es ${MAX_FOTOS}.`);
      }
      const permitidas = nuevas
        .slice(0, espacioRestante)
        .map((n) => ({ tipo: "nueva", uri: n.uri, base64: n.base64 }));
      return [...actuales, ...permitidas];
    });
  }

  async function usarCamara() {
    agregarFotos(await tomarFoto());
  }

  async function usarGaleria() {
    if (fotos.length >= MAX_FOTOS) {
      Alert.alert("Límite de fotos", `Solo se pueden adjuntar ${MAX_FOTOS} fotos por evento.`);
      return;
    }
    agregarFotos(await elegirFotos(MAX_FOTOS - fotos.length));
  }

  function quitarFoto(indice) {
    setFotos((actuales) => actuales.filter((_, i) => i !== indice));
  }

  async function guardar() {
    if (!eventoTexto.trim()) {
      Alert.alert("Falta el evento", "Escribe qué sucedió en el campo Evento.");
      return;
    }
    setGuardando(true);
    setMensajeGuardando(esEdicion ? "Guardando cambios..." : "Guardando evento...");

    const datos = {
      fecha,
      hora,
      medio_deteccion: medioDeteccion,
      ct: ct.trim(),
      inversor: inversor.trim(),
      tracker: tracker.trim(),
      string_num: stringNum.trim(),
      dispositivo: dispositivo.trim(),
      cantidad: cantidad.trim(),
      evento: eventoTexto.trim(),
      solucion: solucion.trim(),
      descripcion: descripcion.trim(),
      n_correctivo: nCorrectivo.trim(),
    };

    try {
      const { data: userData } = await supabase.auth.getUser();

      let eventoId = evento?.id;
      const rutasExistentes = fotos
        .filter((f) => f.tipo === "existente")
        .map((f) => f.ruta);
      const fotosNuevas = fotos.filter((f) => f.tipo === "nueva");

      if (esEdicion) {
        const { error } = await supabase
          .from("eventos")
          .update(datos)
          .eq("id", evento.id);
        if (error) throw error;

        if (fotosNuevas.length > 0) {
          setMensajeGuardando(`Subiendo ${fotosNuevas.length} foto(s)...`);
          const subidas = await subirFotos(fotosNuevas, evento.id);
          await guardarRutas([...rutasExistentes, ...subidas], evento.id);
        } else if (rutasExistentes.length !== (evento.fotos || []).length) {
          await guardarRutas(rutasExistentes, evento.id);
        }

        const rutasAntiguas = (evento.fotos || []).filter((r) => !rutasExistentes.includes(r));
        if (rutasAntiguas.length > 0) {
          await borrarFotos(rutasAntiguas);
        }
      } else {
        const { data: creado, error } = await supabase
          .from("eventos")
          .insert({ ...datos, creado_por: userData.user.id })
          .select("id")
          .single();
        if (error) throw error;
        eventoId = creado.id;

        if (fotosNuevas.length > 0) {
          setMensajeGuardando(`Subiendo ${fotosNuevas.length} foto(s)...`);
          const subidas = await subirFotos(fotosNuevas, creado.id);
          await guardarRutas(subidas, creado.id);
        }
      }

      setGuardando(false);
      setMensajeGuardando("");
      navigation.goBack();
    } catch (e) {
      setGuardando(false);
      setMensajeGuardando("");
      Alert.alert(
        esEdicion ? "No se pudieron guardar los cambios" : "Error al guardar",
        e.message
      );
    }
  }

  async function guardarRutas(rutas, id) {
    const { error } = await supabase
      .from("eventos")
      .update({ fotos: rutas })
      .eq("id", id);
    if (error) throw error;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: espacio.xl, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.botonReporteStrings}
          onPress={() => navigation.navigate("ReporteStrings")}
          disabled={guardando}
        >
          <Text style={styles.botonReporteStringsTexto}>Reporte de cambio cable en string</Text>
        </TouchableOpacity>

        <Text style={styles.etiqueta}>Fecha</Text>
        <TextInput style={styles.input} value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" placeholderTextColor={colores.textoTenue} />

        <Text style={styles.etiqueta}>Hora</Text>
        <TextInput style={styles.input} value={hora} onChangeText={setHora} placeholder="HH:MM" placeholderTextColor={colores.textoTenue} />

        <Text style={styles.etiqueta}>Medio de detección</Text>
        <View style={styles.filaBotones}>
          {["Scada", "Campo"].map((op) => (
            <TouchableOpacity
              key={op}
              style={[styles.chip, medioDeteccion === op && styles.chipActivo]}
              onPress={() => setMedioDeteccion(op)}
            >
              <Text style={[styles.chipTexto, medioDeteccion === op && styles.chipTextoActivo]}>
                {op}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.etiqueta}>Evento *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe lo ocurrido..."
          placeholderTextColor={colores.textoTenue}
          value={eventoTexto}
          onChangeText={setEventoTexto}
          multiline
        />

        <Text style={styles.etiqueta}>Solución</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="¿Qué se hizo para resolverlo?"
          placeholderTextColor={colores.textoTenue}
          value={solucion}
          onChangeText={setSolucion}
          multiline
        />

        <Text style={styles.subtitulo}>
          Fotos {fotos.length > 0 ? `(${fotos.length}/${MAX_FOTOS})` : ""}
        </Text>
        <View style={styles.filaBotones}>
          <TouchableOpacity style={styles.botonFoto} onPress={usarCamara} disabled={guardando}>
            <Text style={styles.botonFotoTexto}>Tomar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonFoto} onPress={usarGaleria} disabled={guardando}>
            <Text style={styles.botonFotoTexto}>Elegir de galería</Text>
          </TouchableOpacity>
        </View>

        {cargandoFotos ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={colores.primario} />
        ) : fotos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tiraFotos}>
            {fotos.map((foto, i) => (
              <View key={`${foto.tipo}-${foto.ruta || foto.uri}-${i}`} style={styles.miniaturaCaja}>
                {foto.tipo === "existente" && foto.url ? (
                  <Image source={{ uri: foto.url }} style={styles.miniatura} />
                ) : foto.tipo === "nueva" ? (
                  <Image source={{ uri: foto.uri }} style={styles.miniatura} />
                ) : (
                  <View style={[styles.miniatura, styles.miniaturaCargando]} />
                )}
                <TouchableOpacity style={styles.quitar} onPress={() => quitarFoto(i)}>
                  <Text style={styles.quitarTexto}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.subtitulo}>Ubicación del equipo (si aplica)</Text>
        <View style={styles.filaCuatro}>
          <View style={styles.columnaChica}>
            <Text style={styles.etiquetaChica}>CT</Text>
            <TextInput
              style={styles.inputChico}
              placeholder="Ej: 4"
              placeholderTextColor={colores.textoTenue}
              value={ct}
              onChangeText={setCt}
            />
          </View>
          <View style={styles.columnaChica}>
            <Text style={styles.etiquetaChica}>Inversor</Text>
            <TextInput
              style={styles.inputChico}
              placeholder="Ej: 2"
              placeholderTextColor={colores.textoTenue}
              value={inversor}
              onChangeText={setInversor}
            />
          </View>
          <View style={styles.columnaChica}>
            <Text style={styles.etiquetaChica}>Tracker</Text>
            <TextInput
              style={styles.inputChico}
              placeholder="Ej: 425"
              placeholderTextColor={colores.textoTenue}
              value={tracker}
              onChangeText={setTracker}
            />
          </View>
          <View style={styles.columnaChica}>
            <Text style={styles.etiquetaChica}>String</Text>
            <TextInput
              style={styles.inputChico}
              placeholder="Ej: 2"
              placeholderTextColor={colores.textoTenue}
              value={stringNum}
              onChangeText={setStringNum}
            />
          </View>
        </View>

        <Text style={styles.etiqueta}>Dispositivo</Text>
        <TextInput style={styles.input} placeholder="Ej: Cable solar rojo" placeholderTextColor={colores.textoTenue} value={dispositivo} onChangeText={setDispositivo} />

        <Text style={styles.etiqueta}>Cantidad</Text>
        <TextInput style={styles.input} placeholder="Ej: 15" placeholderTextColor={colores.textoTenue} value={cantidad} onChangeText={setCantidad} keyboardType="numeric" />

        <Text style={styles.etiqueta}>Descripción adicional</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Detalles adicionales..."
          placeholderTextColor={colores.textoTenue}
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />

        <Text style={styles.etiqueta}>N° Correctivo</Text>
        <TextInput style={styles.input} placeholder="Si aplica" placeholderTextColor={colores.textoTenue} value={nCorrectivo} onChangeText={setNCorrectivo} />

        <TouchableOpacity style={styles.boton} onPress={guardar} disabled={guardando}>
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTexto}>
              {esEdicion ? "Guardar cambios" : "Guardar evento"}
            </Text>
          )}
        </TouchableOpacity>

        {guardando && mensajeGuardando ? (
          <Text style={styles.progreso}>{mensajeGuardando}</Text>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  etiqueta: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 14, color: colores.texto },
  subtitulo: { fontSize: 15, fontWeight: "700", marginTop: 22, marginBottom: 8, color: colores.texto },
  input: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: 12,
    fontSize: tipografia.cuerpo,
    backgroundColor: colores.superficie,
    color: colores.texto,
  },
  inputChico: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: 10,
    fontSize: 14,
    backgroundColor: colores.superficie,
    color: colores.texto,
  },
  columnaChica: { flex: 1 },
  etiquetaChica: { fontSize: 11, fontWeight: "600", color: colores.textoSuave, marginBottom: 4 },
  filaCuatro: { flexDirection: "row", gap: espacio.sm },
  textarea: { height: 90, textAlignVertical: "top" },
  filaBotones: { flexDirection: "row", gap: espacio.sm },
  chip: {
    borderWidth: 1,
    borderColor: colores.primario,
    borderRadius: radio.redondo,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  chipActivo: { backgroundColor: colores.primario },
  chipTexto: { color: colores.primario, fontWeight: tipografia.pesoMedia },
  chipTextoActivo: { color: "#fff" },
  botonFoto: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.primario,
    borderRadius: radio.md,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
  },
  botonFotoTexto: { color: colores.primario, fontWeight: tipografia.pesoMedia, fontSize: 14 },
  tiraFotos: { marginTop: espacio.md },
  miniaturaCaja: { marginRight: 10 },
  miniatura: { width: 82, height: 82, borderRadius: radio.md, backgroundColor: colores.borde },
  miniaturaCargando: { alignItems: "center", justifyContent: "center" },
  quitar: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colores.peligro,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  quitarTexto: { color: "#fff", fontSize: 11, fontWeight: "700" },
  boton: {
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    padding: 14,
    alignItems: "center",
    marginTop: 28,
  },
  botonTexto: { color: "#fff", fontSize: tipografia.cuerpo, fontWeight: tipografia.pesoMedia },
  botonReporteStrings: {
    borderWidth: 1,
    borderColor: colores.primario,
    borderRadius: radio.md,
    padding: 13,
    alignItems: "center",
    backgroundColor: colores.primarioSuave,
    marginBottom: 8,
  },
  botonReporteStringsTexto: { color: colores.primario, fontSize: 14, fontWeight: tipografia.pesoMedia },
  progreso: { textAlign: "center", color: colores.textoSuave, marginTop: 10, fontSize: 13 },
});
