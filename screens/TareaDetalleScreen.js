import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { colores, espacio, radio, tipografia, sombra } from "../lib/tema";
import { tomarFoto, elegirFotos } from "../lib/camara";
import {
  cargarProcedimientos,
  marcarHecha,
  ejecucionDeTarea,
  urlDeFoto,
  formatoFecha,
  estaHecha,
  nombreDeTarea,
} from "../lib/tareas";

export default function TareaDetalleScreen({ route }) {
  const { tarea } = route.params;
  const [procedimientos, setProcedimientos] = useState([]);
  const [hechos, setHechos] = useState({});
  const [foto, setFoto] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ejecucion, setEjecucion] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(null);
  const [cargando, setCargando] = useState(true);

  const numeros = tarea.procedimientos || [];
  const hecha = estaHecha(tarea);

  useEffect(() => {
    (async () => {
      try {
        const procs = await cargarProcedimientos();
        setProcedimientos(
          procs.filter((p) => numeros.includes(p.numero))
        );
      } catch (e) {
        Alert.alert("Error", "No se pudieron cargar los procedimientos.");
      }
      try {
        const ejec = await ejecucionDeTarea(tarea.id);
        if (ejec.length > 0) {
          setEjecucion(ejec[0]);
          if (ejec[0].foto_url) {
            const url = await urlDeFoto(ejec[0].foto_url);
            setFotoUrl(url);
          }
        }
      } catch (e) {}
      setCargando(false);
    })();
  }, [tarea.id]);

  function alternarPaso(numero, idx) {
    setHechos((prev) => {
      const actual = prev[numero] || [];
      const nuevo = actual.includes(idx)
        ? actual.filter((i) => i !== idx)
        : [...actual, idx];
      return { ...prev, [numero]: nuevo };
    });
  }

  async function guardar() {
    if (!foto) {
      Alert.alert("Falta la foto", "Toma una foto como evidencia del trabajo realizado.");
      return;
    }
    setGuardando(true);
    try {
      await marcarHecha(tarea, foto, observaciones);
      Alert.alert("Tarea hecha", "Se guardó tu tarea con la foto de evidencia.", [
        { text: "OK", onPress: () => {} },
      ]);
      setFoto(null);
      setObservaciones("");
      const ejec = await ejecucionDeTarea(tarea.id);
      if (ejec.length > 0) {
        setEjecucion(ejec[0]);
        if (ejec[0].foto_url) setFotoUrl(await urlDeFoto(ejec[0].foto_url));
      }
      tarea.estado = "hecha";
    } catch (e) {
      Alert.alert("Error", e.message || "No se pudo guardar la tarea.");
    }
    setGuardando(false);
  }

  const categoriasEquipo = useMemo(() => {
    const categorias = [];
    procedimientos.forEach((p) => {
      Object.entries(p.equipo || {}).forEach(([cat, lista]) => {
        if (!lista || lista.length === 0) return;
        categorias.push({ numero: p.numero, categoria: cat, items: lista });
      });
    });
    return categorias;
  }, [procedimientos]);

  const tituloManual =
    numeros.length > 1
      ? `Manual de la tarea (${numeros.join(", ")})`
      : numeros.length === 1
      ? `Manual de la tarea (P-${numeros[0]})`
      : "Manual de la tarea";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: espacio.lg, paddingBottom: 40 }}
    >
      {/* Datos de la tarea */}
      <View style={[styles.tarjeta, styles.tarjetaPrincipal]}>
        <Text style={styles.actividad}>{nombreDeTarea(tarea)}</Text>
        <View style={styles.filaDato}>
          <Text style={styles.etiquetaDato}>Fecha</Text>
          <Text style={styles.valorDato}>{formatoFecha(tarea.fecha)}</Text>
        </View>
        <View style={styles.filaDato}>
          <Text style={styles.etiquetaDato}>Horario</Text>
          <Text style={styles.valorDato}>
            {tarea.hora_inicio?.slice(0, 5)} – {tarea.hora_fin?.slice(0, 5)}{" "}
            {tarea.duracion ? `· ${tarea.duracion} h` : ""}
          </Text>
        </View>
        {tarea.frecuencia ? (
          <View style={styles.filaDato}>
            <Text style={styles.etiquetaDato}>Frecuencia</Text>
            <Text style={styles.valorDato}>{tarea.frecuencia}</Text>
          </View>
        ) : null}
        {tarea.codigo ? (
          <View style={styles.filaDato}>
            <Text style={styles.etiquetaDato}>Código</Text>
            <Text style={styles.valorDato}>{tarea.codigo}</Text>
          </View>
        ) : null}
        {tarea.tecnico ? (
          <View style={styles.filaDato}>
            <Text style={styles.etiquetaDato}>Técnico</Text>
            <Text style={styles.valorDato}>{tarea.tecnico}</Text>
          </View>
        ) : null}
      </View>

      {/* Evidencia / estado */}
      {hecha ? (
        <View style={[styles.tarjeta, styles.tarjetaOk]}>
          <Text style={styles.tituloOk}>✓ Hecha</Text>
          {ejecucion?.ejecutado_en ? (
            <Text style={styles.fechaOk}>
              {new Date(ejecucion.ejecutado_en).toLocaleString("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </Text>
          ) : null}
          {ejecucion?.observaciones ? (
            <Text style={styles.observacionesOk}>Observación: {ejecucion.observaciones}</Text>
          ) : null}
          {fotoUrl ? (
            <Image source={{ uri: fotoUrl }} style={styles.fotoEvidencia} resizeMode="cover" />
          ) : (
            <Text style={styles.sinFoto}>Sin foto de evidencia</Text>
          )}
        </View>
      ) : (
        <View style={styles.tarjeta}>
          <Text style={styles.seccionTitulo}>Completar tarea</Text>
          <Text style={styles.seccionTexto}>
            Toma una foto del trabajo realizado y marca la tarea como hecha.
          </Text>

          {foto ? (
            <View>
              <Image source={{ uri: foto.uri }} style={styles.fotoNueva} resizeMode="cover" />
              <TouchableOpacity
                style={styles.botonQuitarFoto}
                onPress={() => setFoto(null)}
              >
                <Text style={styles.botonQuitarFotoTexto}>Quitar foto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.filaFotos}>
              <TouchableOpacity
                style={styles.botonFoto}
                onPress={async () => setFoto((await tomarFoto())[0] || null)}
              >
                <Text style={styles.botonFotoTexto}>📷 Tomar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botonFoto}
                onPress={async () => {
                  const lista = await elegirFotos(1);
                  setFoto(lista[0] || null);
                }}
              >
                <Text style={styles.botonFotoTexto}>🖼 Galería</Text>
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Observaciones (opcional)"
            placeholderTextColor={colores.textoTenue}
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
          />

          <TouchableOpacity
            style={[styles.botonConfirmar, guardando && styles.botonDeshabilitado]}
            onPress={guardar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonConfirmarTexto}>✓ Marcar como hecha</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Manual / procedimientos */}
      <Text style={styles.seccionManualTitulo}>{tituloManual}</Text>

      {cargando ? (
        <ActivityIndicator color={colores.primario} style={{ marginTop: 24 }} />
      ) : procedimientos.length === 0 ? (
        <Text style={styles.sinManual}>Esta tarea no tiene manual asignado.</Text>
      ) : (
        procedimientos.map((p) => (
          <View key={p.numero} style={styles.tarjeta}>
            <Text style={styles.procTitulo}>
              P-{p.numero} · {p.titulo}
            </Text>
            {p.objeto ? <Text style={styles.procObjeto}>{p.objeto}</Text> : null}
            {p.alcance ? (
              <View style={styles.bloque}>
                <Text style={styles.bloqueTitulo}>Alcance</Text>
                <Text style={styles.bloqueTexto}>{p.alcance}</Text>
              </View>
            ) : null}
            {p.condicionantes ? (
              <View style={styles.bloque}>
                <Text style={styles.bloqueTitulo}>Antes de empezar</Text>
                <Text style={styles.bloqueTexto}>{p.condicionantes}</Text>
              </View>
            ) : null}

            {p.pasos && p.pasos.length > 0 ? (
              <View style={styles.bloque}>
                <Text style={styles.bloqueTitulo}>Pasos a seguir</Text>
                {p.pasos.map((paso, idx) => {
                  const marcado = (hechos[p.numero] || []).includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.paso}
                      onPress={() => alternarPaso(p.numero, idx)}
                    >
                      <View style={[styles.check, marcado && styles.checkActivo]}>
                        {marcado ? <Text style={styles.checkTexto}>✓</Text> : null}
                      </View>
                      <Text style={[styles.pasoTexto, marcado && styles.pasoTextoHecho]}>
                        {paso}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.pasoAyuda}>
                  Toca cada paso para marcarlo como hecho.
                </Text>
              </View>
            ) : null}

            {categoriasEquipo.some((c) => c.numero === p.numero) && (
              <View style={styles.bloque}>
                <Text style={styles.bloqueTitulo}>Equipo necesario</Text>
                {categoriasEquipo
                  .filter((c) => c.numero === p.numero)
                  .map((c) => (
                    <View key={c.categoria} style={styles.bloque}>
                      <Text style={styles.categoriaEquipo}>{c.categoria}</Text>
                      {c.items.map((item, idx) => (
                        <Text key={idx} style={styles.equipoItem}>• {item}</Text>
                      ))}
                    </View>
                  ))}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colores.borde,
    ...sombra,
  },
  tarjetaPrincipal: { marginBottom: 12 },
  actividad: { fontSize: tipografia.subtitulo, fontWeight: tipografia.pesoNegrita, color: colores.texto, marginBottom: 12 },
  filaDato: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  etiquetaDato: { color: colores.textoTenue, fontSize: tipografia.chica },
  valorDato: { color: colores.texto, fontSize: tipografia.chica, fontWeight: tipografia.pesoMedia },
  tarjetaOk: { backgroundColor: colores.exitoClaro, borderColor: colores.exito },
  tituloOk: { fontSize: tipografia.subtitulo, fontWeight: tipografia.pesoNegrita, color: colores.exito },
  fechaOk: { marginTop: 4, color: colores.exito, fontSize: tipografia.chica },
  observacionesOk: { marginTop: 8, color: colores.texto, fontSize: tipografia.chica },
  fotoEvidencia: { width: "100%", height: 180, borderRadius: radio.md, marginTop: 12 },
  sinFoto: { marginTop: 8, color: colores.textoTenue, fontSize: tipografia.chica },
  seccionTitulo: { fontSize: tipografia.subtitulo, fontWeight: tipografia.pesoNegrita, color: colores.texto },
  seccionTexto: { marginTop: 4, color: colores.textoSuave, fontSize: tipografia.chica, marginBottom: 12 },
  filaFotos: { flexDirection: "row", gap: espacio.sm },
  botonFoto: {
    flex: 1,
    backgroundColor: colores.primarioSuave,
    borderRadius: radio.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  botonFotoTexto: { color: colores.primario, fontWeight: tipografia.pesoMedia, fontSize: tipografia.chica },
  fotoNueva: { width: "100%", height: 200, borderRadius: radio.md },
  botonQuitarFoto: { alignItems: "center", padding: 8 },
  botonQuitarFotoTexto: { color: colores.peligro, fontWeight: tipografia.pesoMedia, fontSize: tipografia.chica },
  input: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: 12,
    marginTop: 12,
    minHeight: 70,
    fontSize: tipografia.cuerpo,
    color: colores.texto,
    textAlignVertical: "top",
  },
  botonConfirmar: {
    backgroundColor: colores.exito,
    borderRadius: radio.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonConfirmarTexto: { color: "#fff", fontWeight: tipografia.pesoNegrita, fontSize: tipografia.cuerpo },
  seccionManualTitulo: {
    fontSize: tipografia.subtitulo,
    fontWeight: tipografia.pesoNegrita,
    color: colores.texto,
    marginTop: espacio.sm,
    marginBottom: espacio.md,
  },
  sinManual: { color: colores.textoTenue, fontSize: tipografia.chica, marginBottom: 20 },
  procTitulo: { fontSize: tipografia.cuerpo, fontWeight: tipografia.pesoNegrita, color: colores.primario },
  procObjeto: { marginTop: 6, color: colores.textoSuave, fontSize: tipografia.chica, lineHeight: 19 },
  bloque: { marginTop: 12 },
  bloqueTitulo: { fontSize: tipografia.chica, fontWeight: tipografia.pesoNegrita, color: colores.texto, marginBottom: 6 },
  bloqueTexto: { color: colores.texto, fontSize: tipografia.chica, lineHeight: 19 },
  paso: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    marginRight: 10,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.superficie,
  },
  checkActivo: { backgroundColor: colores.exito, borderColor: colores.exito },
  checkTexto: { color: "#fff", fontSize: 13, fontWeight: tipografia.pesoNegrita },
  pasoTexto: { flex: 1, color: colores.texto, fontSize: tipografia.chica, lineHeight: 19 },
  pasoTextoHecho: { color: colores.textoTenue, textDecorationLine: "line-through" },
  pasoAyuda: { marginTop: 2, color: colores.textoTenue, fontSize: tipografia.miniatura, fontStyle: "italic" },
  categoriaEquipo: { color: colores.primario, fontSize: tipografia.chica, fontWeight: tipografia.pesoMedia, marginBottom: 3 },
  equipoItem: { color: colores.textoSuave, fontSize: tipografia.chica, marginBottom: 3 },
});
