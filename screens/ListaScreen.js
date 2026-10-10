import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { colores, espacio, radio, tipografia, sombra } from "../lib/tema";

const MEDIOS = ["Todos", "Scada", "Campo"];

function ordenarStrings(a, b) {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  const horaA = (a.hora || "").slice(0, 5);
  const horaB = (b.hora || "").slice(0, 5);
  if (horaA !== horaB) return horaA < horaB ? 1 : -1;

  const dispositivoA = String(a.dispositivo || "").toLowerCase();
  const dispositivoB = String(b.dispositivo || "").toLowerCase();
  const grupoA = dispositivoA.includes("rojo") ? 0 : dispositivoA.includes("negro") ? 1 : 2;
  const grupoB = dispositivoB.includes("rojo") ? 0 : dispositivoB.includes("negro") ? 1 : 2;
  return grupoA - grupoB || Number(a.string_num || 0) - Number(b.string_num || 0);
}

export default function ListaScreen({ navigation }) {
  const [eventos, setEventos] = useState([]);
  const [refrescando, setRefrescando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [medio, setMedio] = useState("Todos");

  async function cargarEventos() {
    setCargando(true);
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .order("fecha", { ascending: false })
      .order("hora", { ascending: false });

    if (error || !data) {
      setCargando(false);
      return;
    }
    setEventos([...data].sort(ordenarStrings));
    setCargando(false);
  }

  useFocusEffect(
    useCallback(() => {
      cargarEventos();
    }, [])
  );

  useEffect(() => {
    const canal = supabase
      .channel("eventos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, () =>
        cargarEventos()
      )
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  async function onRefresh() {
    setRefrescando(true);
    await cargarEventos();
    setRefrescando(false);
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return eventos.filter((ev) => {
      if (medio !== "Todos" && ev.medio_deteccion !== medio) return false;
      if (!texto) return true;

      const campos = [
        ev.evento,
        ev.dispositivo,
        ev.ct,
        ev.inversor,
        ev.tracker,
        ev.string_num,
        ev.solucion,
        ev.descripcion,
        ev.n_correctivo,
        ev.responsable_desc,
      ];
      return campos.some((c) => c && String(c).toLowerCase().includes(texto));
    });
  }, [eventos, busqueda, medio]);

  const secciones = useMemo(() => {
    const porFecha = {};
    filtrados.forEach((ev) => {
      if (!porFecha[ev.fecha]) porFecha[ev.fecha] = [];
      porFecha[ev.fecha].push(ev);
    });
    return Object.keys(porFecha)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((fecha) => ({ title: fecha, data: porFecha[fecha] }));
  }, [filtrados]);

  const hayFiltros = busqueda.trim() !== "" || medio !== "Todos";

  return (
    <View style={styles.container}>
      <View style={styles.barraBusqueda}>
        <TextInput
          style={styles.inputBusqueda}
          placeholder="Buscar por equipo, evento, CT..."
          placeholderTextColor={colores.textoTenue}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filaChips}>
        {MEDIOS.map((op) => (
          <TouchableOpacity
            key={op}
            style={[styles.chip, medio === op && styles.chipActivo]}
            onPress={() => setMedio(op)}
          >
            <Text style={[styles.chipTexto, medio === op && styles.chipTextoActivo]}>
              {op}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={secciones}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: espacio.lg, paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              {cargando ? "Cargando..." : hayFiltros ? "Sin resultados" : "Aún no hay eventos"}
            </Text>
            {!cargando && (
              <Text style={styles.vacioTexto}>
                {hayFiltros
                  ? "Prueba con otra búsqueda o quita los filtros."
                  : "Toca el botón + para registrar el primero."}
              </Text>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.fechaHeader}>
            {new Date(section.title + "T00:00:00").toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tarjeta}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Detalle", { evento: item })}
          >
            <View style={styles.filaTop}>
              <Text style={styles.hora}>{item.hora?.slice(0, 5)}</Text>
              <View style={styles.etiquetaMedio}>
                <Text style={styles.textoMedio}>{item.medio_deteccion}</Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.eventoTexto}>
              {item.evento}
            </Text>
            <View style={styles.filaInferior}>
              {item.ct ? <Text style={styles.meta}>CT {item.ct}</Text> : null}
              {item.inversor ? <Text style={styles.meta}>· Inv {item.inversor}</Text> : null}
              {item.tracker ? <Text style={styles.meta}>· Tk {item.tracker}</Text> : null}
              {item.dispositivo ? <Text style={styles.meta} numberOfLines={1}>· {item.dispositivo}</Text> : null}
            </View>
            {item.fotos && item.fotos.length > 0 && (
              <Text style={styles.contadorFotos}>
                📷 {item.fotos.length} foto{item.fotos.length > 1 ? "s" : ""}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[styles.botonFlotanteSecundario, sombra]}
        onPress={() => navigation.navigate("Exportar")}
      >
        <Text style={styles.botonFlotanteSecundarioTexto}>Excel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.botonFlotante, sombra]}
        onPress={() => navigation.navigate("Nueva")}
      >
        <Text style={styles.botonFlotanteTexto}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  barraBusqueda: { paddingHorizontal: espacio.lg, paddingTop: espacio.md },
  inputBusqueda: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.lg,
    paddingVertical: 10,
    fontSize: tipografia.cuerpo,
    color: colores.texto,
  },
  filaChips: { flexDirection: "row", gap: espacio.sm, paddingHorizontal: espacio.lg, paddingTop: espacio.md },
  chip: {
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    borderRadius: radio.redondo,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  chipActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  chipTexto: { color: colores.textoSuave, fontWeight: tipografia.pesoMedia, fontSize: 13 },
  chipTextoActivo: { color: "#fff" },
  vacio: { alignItems: "center", marginTop: 48, paddingHorizontal: espacio.xl },
  vacioTitulo: { fontSize: tipografia.subtitulo, fontWeight: tipografia.pesoNegrita, color: colores.textoSuave },
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
  hora: { fontWeight: tipografia.pesoNegrita, color: colores.texto, fontSize: 15 },
  etiquetaMedio: {
    backgroundColor: colores.primarioSuave,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radio.redondo,
  },
  textoMedio: { fontSize: 12, color: colores.primario, fontWeight: tipografia.pesoMedia },
  eventoTexto: { fontSize: tipografia.cuerpo, color: colores.texto, lineHeight: 20 },
  filaInferior: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  meta: { fontSize: tipografia.chica, color: colores.textoTenue, marginRight: espacio.xs },
  contadorFotos: { fontSize: tipografia.chica, color: colores.primario, marginTop: 8, fontWeight: tipografia.pesoMedia },
  botonFlotanteSecundario: {
    position: "absolute",
    left: 20,
    bottom: 112,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.primario,
    borderRadius: radio.redondo,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  botonFlotanteSecundarioTexto: { color: colores.primario, fontWeight: tipografia.pesoNegrita },
  botonFlotante: {
    position: "absolute",
    right: 20,
    bottom: 112,
    backgroundColor: colores.primario,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  botonFlotanteTexto: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
