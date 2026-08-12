import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colores, espacio, radio, tipografia, sombra } from "../lib/tema";
import {
  cargarTareas,
  estadoClasificacion,
  hoyLocal,
  estaHecha,
  nombreDeTarea,
  formatoFecha,
} from "../lib/tareas";

const CHIPS = [
  { clave: "hoy", etiqueta: "Hoy" },
  { clave: "pendiente", etiqueta: "Pendientes" },
  { clave: "atrasada", etiqueta: "Atrasadas" },
  { clave: "completada", etiqueta: "Completadas" },
];

export default function TareasScreen({ navigation }) {
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [chip, setChip] = useState("hoy");
  const [error, setError] = useState(null);

  async function cargarTodo() {
    try {
      const datos = await cargarTareas();
      setTareas(datos);
      setError(null);
    } catch (e) {
      setError("No se pudieron cargar las tareas. Revisa tu conexión.");
    }
    setCargando(false);
  }

  useFocusEffect(
    useCallback(() => {
      cargarTodo();
    }, [])
  );

  async function onRefresh() {
    setRefrescando(true);
    await cargarTodo();
    setRefrescando(false);
  }

  const filtradas = useMemo(() => {
    const hoy = hoyLocal();
    return tareas.filter((t) => estadoClasificacion(t, hoy) === chip);
  }, [tareas, chip]);

  const secciones = useMemo(() => {
    const porFecha = {};
    filtradas.forEach((t) => {
      const clave = t.fecha || "sin-fecha";
      if (!porFecha[clave]) porFecha[clave] = [];
      porFecha[clave].push(t);
    });
    return Object.keys(porFecha)
      .sort()
      .map((fecha) => ({ title: fecha, data: porFecha[fecha] }));
  }, [filtradas]);

  return (
    <View style={styles.container}>
      <View style={styles.filaChips}>
        {CHIPS.map((c) => (
          <TouchableOpacity
            key={c.clave}
            style={[styles.chip, chip === c.clave && styles.chipActivo]}
            onPress={() => setChip(c.clave)}
          >
            <Text style={[styles.chipTexto, chip === c.clave && styles.chipTextoActivo]}>
              {c.etiqueta}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={secciones}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: espacio.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              {cargando ? "Cargando..." : error || "Sin tareas aquí"}
            </Text>
            {!cargando && !error && (
              <Text style={styles.vacioTexto}>
                {chip === "completada"
                  ? "Aún no has marcado tareas como hechas."
                  : "No tienes tareas en esta sección."}
              </Text>
            )}
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title === "sin-fecha" ? null : (
            <Text style={styles.fechaHeader}>{formatoFecha(section.title)}</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tarjeta}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("TareaDetalle", { tarea: item })}
          >
            <View style={styles.filaTop}>
              <Text style={styles.hora}>
                {item.hora_inicio ? item.hora_inicio.slice(0, 5) : "--"} –{" "}
                {item.hora_fin ? item.hora_fin.slice(0, 5) : "--"}
              </Text>
              {estaHecha(item) ? (
                <View style={[styles.etiqueta, styles.etiquetaOk]}>
                  <Text style={[styles.textoEtiqueta, styles.textoOk]}>Hecha ✓</Text>
                </View>
              ) : item.estado === "en_progreso" ? (
                <View style={[styles.etiqueta, styles.etiquetaProgreso]}>
                  <Text style={[styles.textoEtiqueta, styles.textoProgreso]}>En progreso</Text>
                </View>
              ) : item.fecha < hoyLocal() ? (
                <View style={[styles.etiqueta, styles.etiquetaAtrasada]}>
                  <Text style={[styles.textoEtiqueta, styles.textoAtrasada]}>Atrasada</Text>
                </View>
              ) : (
                <View style={[styles.etiqueta, styles.etiquetaPendiente]}>
                  <Text style={[styles.textoEtiqueta, styles.textoPendiente]}>Pendiente</Text>
                </View>
              )}
            </View>
            <Text style={styles.actividad}>{nombreDeTarea(item)}</Text>
            <View style={styles.filaInferior}>
              {item.frecuencia ? (
                <Text style={styles.meta}>{item.frecuencia}</Text>
              ) : null}
              {item.duracion ? (
                <Text style={styles.meta}>· {item.duracion} h</Text>
              ) : null}
              {item.codigo ? <Text style={styles.meta}>· {item.codigo}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  filaChips: { flexDirection: "row", gap: espacio.sm, paddingHorizontal: espacio.lg, paddingTop: espacio.lg },
  chip: {
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    borderRadius: radio.redondo,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  chipTexto: { color: colores.textoSuave, fontWeight: tipografia.pesoMedia, fontSize: tipografia.miniatura },
  chipTextoActivo: { color: "#fff" },
  vacio: { alignItems: "center", marginTop: 48, paddingHorizontal: espacio.xl },
  vacioTitulo: { fontSize: tipografia.subtitulo, fontWeight: tipografia.pesoNegrita, color: colores.textoSuave, textAlign: "center" },
  vacioTexto: { marginTop: espacio.sm, color: colores.textoTenue, textAlign: "center", fontSize: tipografia.chica },
  fechaHeader: {
    fontSize: tipografia.chica,
    fontWeight: tipografia.pesoNegrita,
    color: colores.primario,
    textTransform: "capitalize",
    marginTop: espacio.lg,
    marginBottom: espacio.sm,
  },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colores.borde,
    ...sombra,
  },
  filaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  hora: { fontWeight: tipografia.pesoNegrita, color: colores.texto, fontSize: 14 },
  actividad: { fontSize: tipografia.cuerpo, color: colores.texto, lineHeight: 20 },
  filaInferior: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  meta: { fontSize: tipografia.chica, color: colores.textoTenue, marginRight: espacio.xs },
  etiqueta: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radio.redondo },
  etiquetaOk: { backgroundColor: colores.exitoClaro },
  textoOk: { color: colores.exito, fontWeight: tipografia.pesoMedia, fontSize: 12 },
  etiquetaProgreso: { backgroundColor: colores.primarioClaro },
  textoProgreso: { color: colores.primario, fontWeight: tipografia.pesoMedia, fontSize: 12 },
  etiquetaAtrasada: { backgroundColor: colores.peligroClaro },
  textoAtrasada: { color: colores.peligro, fontWeight: tipografia.pesoMedia, fontSize: 12 },
  etiquetaPendiente: { backgroundColor: colores.advertenciaClaro },
  textoPendiente: { color: colores.advertencia, fontWeight: tipografia.pesoMedia, fontSize: 12 },
});
