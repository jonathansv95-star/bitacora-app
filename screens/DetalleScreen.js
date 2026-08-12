import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { supabase } from "../lib/supabase";
import { subirFotos, urlsDeFotos, borrarFotos } from "../lib/fotos";
import { tomarFoto, elegirFotos } from "../lib/camara";
import { colores, espacio, radio, tipografia } from "../lib/tema";

const MAX_FOTOS = 10;
const ANCHO = Dimensions.get("window").width;

function Campo({ etiqueta, valor }) {
  if (!valor) return null;
  return (
    <View style={styles.campo}>
      <Text style={styles.campoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.campoValor}>{valor}</Text>
    </View>
  );
}

export default function DetalleScreen({ route, navigation }) {
  const { evento } = route.params;

  const [rutas, setRutas] = useState(evento.fotos || []);
  const [imagenes, setImagenes] = useState([]);
  const [cargandoFotos, setCargandoFotos] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [ampliada, setAmpliada] = useState(null);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      if (rutas.length === 0) {
        setImagenes([]);
        return;
      }
      setCargandoFotos(true);
      const resultado = await urlsDeFotos(rutas);
      if (vigente) {
        setImagenes(resultado);
        setCargandoFotos(false);
      }
    }

    cargar();
    return () => {
      vigente = false;
    };
  }, [rutas]);

  async function guardarRutas(nuevasRutas) {
    const { error } = await supabase
      .from("eventos")
      .update({ fotos: nuevasRutas })
      .eq("id", evento.id);
    if (error) throw error;
    setRutas(nuevasRutas);
  }

  async function agregar(obtener) {
    if (rutas.length >= MAX_FOTOS) {
      Alert.alert("Límite de fotos", `Este evento ya tiene ${MAX_FOTOS} fotos.`);
      return;
    }

    const nuevas = await obtener();
    if (nuevas.length === 0) return;

    setSubiendo(true);
    try {
      const permitidas = nuevas.slice(0, MAX_FOTOS - rutas.length);
      const subidas = await subirFotos(permitidas, evento.id);
      await guardarRutas([...rutas, ...subidas]);
    } catch (e) {
      Alert.alert("No se pudieron subir las fotos", e.message);
    }
    setSubiendo(false);
  }

  function confirmarBorrarFoto(ruta) {
    Alert.alert("Eliminar foto", "¿Quitar esta foto del evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setSubiendo(true);
          try {
            await guardarRutas(rutas.filter((r) => r !== ruta));
            await borrarFotos([ruta]);
            setAmpliada(null);
          } catch (e) {
            Alert.alert("Error", e.message);
          }
          setSubiendo(false);
        },
      },
    ]);
  }

  async function eliminar() {
    Alert.alert("Eliminar evento", "¿Seguro que quieres eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("eventos").delete().eq("id", evento.id);
          if (error) {
            Alert.alert("Error", error.message);
          } else {
            if (rutas.length > 0) await borrarFotos(rutas);
            navigation.goBack();
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: espacio.xl }}>
      <View style={styles.fechaHoraFila}>
        <Text style={styles.fechaHora}>
          {evento.fecha} · {evento.hora?.slice(0, 5)}
        </Text>
        <View style={styles.etiquetaMedio}>
          <Text style={styles.textoMedio}>{evento.medio_deteccion}</Text>
        </View>
      </View>

      <Campo etiqueta="Evento" valor={evento.evento} />
      <Campo etiqueta="Solución" valor={evento.solucion} />
      <Campo etiqueta="CT" valor={evento.ct} />
      <Campo etiqueta="Inversor" valor={evento.inversor} />
      <Campo etiqueta="Tracker" valor={evento.tracker} />
      <Campo etiqueta="String" valor={evento.string_num} />
      <Campo etiqueta="Dispositivo" valor={evento.dispositivo} />
      <Campo etiqueta="Cantidad" valor={evento.cantidad} />
      <Campo etiqueta="Descripción" valor={evento.descripcion} />
      <Campo etiqueta="N° Correctivo" valor={evento.n_correctivo} />
      <Campo etiqueta="Responsable" valor={evento.responsable_desc} />

      <View style={styles.separador} />

      <Text style={styles.campoEtiqueta}>
        Fotos {rutas.length > 0 ? `(${rutas.length})` : ""}
      </Text>

      {cargandoFotos ? (
        <ActivityIndicator style={{ marginTop: 14 }} color={colores.primario} />
      ) : imagenes.length > 0 ? (
        <View style={styles.galeria}>
          {imagenes.map((img) => (
            <TouchableOpacity
              key={img.ruta}
              onPress={() => setAmpliada(img)}
              onLongPress={() => confirmarBorrarFoto(img.ruta)}
            >
              <Image source={{ uri: img.url }} style={styles.miniatura} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.sinFotos}>Este evento no tiene fotos.</Text>
      )}

      {imagenes.length > 0 && (
        <Text style={styles.ayuda}>
          Toca una foto para verla en grande, o mantenla presionada para eliminarla.
        </Text>
      )}

      <View style={styles.filaBotones}>
        <TouchableOpacity
          style={styles.botonFoto}
          onPress={() => agregar(tomarFoto)}
          disabled={subiendo}
        >
          <Text style={styles.botonFotoTexto}>Tomar foto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.botonFoto}
          onPress={() => agregar(() => elegirFotos(MAX_FOTOS - rutas.length))}
          disabled={subiendo}
        >
          <Text style={styles.botonFotoTexto}>Elegir de galería</Text>
        </TouchableOpacity>
      </View>

      {subiendo && <ActivityIndicator style={{ marginTop: 12 }} color={colores.primario} />}

      <TouchableOpacity
        style={[styles.botonEditar, { backgroundColor: colores.primario }]}
        onPress={() => navigation.navigate("Nueva", { evento })}
      >
        <Text style={styles.botonEditarTexto}>✏️ Editar evento</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonEliminar} onPress={eliminar}>
        <Text style={styles.botonEliminarTexto}>Eliminar evento</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />

      <Modal visible={!!ampliada} transparent animationType="fade">
        <View style={styles.fondoModal}>
          <TouchableOpacity style={styles.cerrarZona} onPress={() => setAmpliada(null)} />
          {ampliada && (
            <Image
              source={{ uri: ampliada.url }}
              style={styles.imagenGrande}
              resizeMode="contain"
            />
          )}
          <View style={styles.accionesModal}>
            <TouchableOpacity style={styles.botonModal} onPress={() => setAmpliada(null)}>
              <Text style={styles.botonModalTexto}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botonModal, styles.botonModalRojo]}
              onPress={() => ampliada && confirmarBorrarFoto(ampliada.ruta)}
            >
              <Text style={[styles.botonModalTexto, { color: "#fca5a5" }]}>Eliminar foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  fechaHoraFila: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  fechaHora: { fontSize: 16, fontWeight: "700", color: colores.primario },
  etiquetaMedio: {
    backgroundColor: colores.primarioSuave,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radio.redondo,
  },
  textoMedio: { fontSize: 12, color: colores.primario, fontWeight: tipografia.pesoMedia },
  campo: { marginBottom: 16 },
  campoEtiqueta: { fontSize: 12, color: colores.textoTenue, marginBottom: 2, textTransform: "uppercase" },
  campoValor: { fontSize: 16, color: colores.texto },
  separador: { height: 1, backgroundColor: colores.borde, marginVertical: 14 },
  galeria: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  miniatura: { width: 96, height: 96, borderRadius: radio.md, backgroundColor: colores.borde },
  sinFotos: { color: colores.textoTenue, marginTop: 10, fontSize: 14 },
  ayuda: { color: colores.textoTenue, fontSize: 12, marginTop: 10 },
  filaBotones: { flexDirection: "row", gap: espacio.sm, marginTop: 16 },
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
  botonEditar: {
    marginTop: 24,
    borderRadius: radio.md,
    padding: 14,
    alignItems: "center",
  },
  botonEditarTexto: { color: "#fff", fontWeight: tipografia.pesoMedia },
  botonEliminar: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colores.peligro,
    borderRadius: radio.md,
    padding: 14,
    alignItems: "center",
    backgroundColor: colores.superficie,
  },
  botonEliminarTexto: { color: colores.peligro, fontWeight: tipografia.pesoMedia },
  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  cerrarZona: { ...StyleSheet.absoluteFillObject },
  imagenGrande: { width: ANCHO, height: "75%" },
  accionesModal: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    gap: 16,
  },
  botonModal: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: radio.redondo,
    borderWidth: 1,
    borderColor: "#fff",
  },
  botonModalRojo: { borderColor: "#fca5a5" },
  botonModalTexto: { color: "#fff", fontWeight: tipografia.pesoMedia },
});
