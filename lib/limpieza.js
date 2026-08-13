import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const BUCKET = "fotos-eventos";
const MESES = 3;
const CLAVE_ULTIMA_LIMPIEZA = "bitacora_ultima_limpieza";
const INTERVALO_DIAS = 1;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Borra las bitácoras (eventos) con más de 3 meses de antigüedad,
 * junto con sus fotos, para liberar espacio.
 * Se ejecuta en segundo plano una vez al día, al abrir la app.
 */
export async function limpiarBitacorasViejas() {
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
      .lt("fecha", fechaLimite);

    if (error) return;

    for (const ev of eventos || []) {
      if ((ev.fotos || []).length > 0) {
        await supabase.storage.from(BUCKET).remove(ev.fotos);
      }
      await supabase.from("eventos").delete().eq("id", ev.id);
    }

    await AsyncStorage.setItem(CLAVE_ULTIMA_LIMPIEZA, String(Date.now()));
  } catch (_) {
    // La limpieza nunca debe interrumpir el uso de la app.
  }
}
