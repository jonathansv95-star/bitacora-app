import { createClient } from "@supabase/supabase-js";

// Misma conexión y misma base de datos que la app de celular.
export const supabase = createClient(
  "https://cgqwtwawgtyacndxuoee.supabase.co",
  "sb_publishable__qO8zgIjpIWX84AeRmkmeA_aGVqcaKq"
);
