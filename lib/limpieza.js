import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const BUCKET = "fotos-eventos";
const MESES = 3;
const CLAVE_ULTIMA_LIMPIEZA = "bitacora_ultima_limpieza_fotos";
const INTERVALO_DIAS = 1;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Borra las FOTOS de eventos con más de 3 meses de antigüedad.
 * Solo se eliminan las fotos del bucket; los eventos NO se tocan.
 * Se ejecuta en segundo plano una vez al día, al abrir la app.
 */
export async function limpiarFotosViejas() {
  try {
    const ultima = await AsyncStorage.getItem(CLAVE_ULTIMA_LIMPIEZA);
    if (ultima && Date.now() - Number(ultima) < INTERVALO_DIAS * MS_POR_DIA) {
      return;
    }

    const hoy = new Date();
    const limite = new Date(hoy.getFullYear(), hoy.getMonth() - MESES, hoy.getDate());
    const fechaLimite = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;

    const { data: eventos, error } = await supabase
      .from("eventos")
      .select("id, fotos")
      .lt("fecha", fechaLimite)
      .not("fotos", "is", null);

    if (error) return;

    const conFotos = (eventos || []).filter((ev) => (ev.fotos || []).length > 0);

    for (const ev of conFotos) {
      // Borra los archivos del bucket (API real: libera espacio)
      await supabase.storage.from(BUCKET).remove(ev.fotos);
      // Limpia la referencia en el evento, sin borrar el evento
      await supabase.from("eventos").update({ fotos: [] }).eq("id", ev.id);
    }

    await AsyncStorage.setItem(CLAVE_ULTIMA_LIMPIEZA, String(Date.now()));
  } catch (_) {
    // La limpieza nunca debe interrumpir el uso de la app.
  }
}
