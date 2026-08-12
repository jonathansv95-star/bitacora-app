# Bitácoras Planta Independencia

App móvil para registrar eventos/bitácoras de la planta, hecha con Expo + Supabase.

## Qué incluye

- Login / registro de usuarios (Supabase Auth).
- Lista de eventos agrupados por fecha, con pull-to-refresh.
- Registro de evento: fecha, hora, medio de detección, CT / inversor / tracker / string,
  dispositivo, cantidad, evento, solución, descripción y N° correctivo.
- **Fotos**: hasta 10 por evento, desde cámara o galería.
- Exportación a Excel, con una pestaña por día, igual que la plantilla original.

---

## Actualización: fotos en los eventos

Hay que hacer dos cosas una sola vez.

### 1. Base de datos (Supabase)

Entra a tu proyecto en https://supabase.com > **SQL Editor** > **New query**,
pega el contenido de `supabase_fotos.sql` y dale **Run**.

Es una migración aditiva: agrega la columna `fotos` a la tabla `eventos` y crea el
bucket privado `fotos-eventos`. **No borra ni cambia los eventos ya registrados**, y
se puede correr varias veces sin romper nada.

### 2. Instalar la librería de cámara

En la carpeta del proyecto:

```bash
npx expo install expo-image-picker
npx expo start -c
```

El `-c` limpia el caché de Metro, necesario después de agregar una librería nativa.

> Para probar en **Expo Go** basta con lo anterior.
> Para la app instalada (APK / build de EAS) hay que generar un **build nuevo**
> (`eas build -p android`), porque la cámara es un módulo nativo y los permisos
> se agregan desde `app.json`.

---

## Cómo se usan las fotos

- **Al crear un evento**: en la sección "Fotos" tocas *Tomar foto* o *Elegir de galería*.
  Las miniaturas aparecen abajo y se quitan con la X roja. Las fotos se suben cuando
  guardas el evento.
- **En un evento ya guardado**: abres el detalle y puedes agregar más fotos, tocar una
  para verla en grande, o mantenerla presionada para eliminarla.
- En la lista, los eventos que tienen fotos muestran el conteo debajo del texto.
- Al eliminar un evento también se borran sus fotos del almacenamiento.

- **En el Excel**: los eventos con fotos agregan columnas al final de la hoja
  ("FOTO 1", "FOTO 2"...). Cada celda es un enlace en el que se hace clic y la imagen
  abre en el navegador. Los enlaces se generan al momento de exportar y funcionan
  durante un año; para verlos hace falta internet. Las columnas de la plantilla
  original no cambian de posición.

Las imágenes se guardan en un bucket **privado**: se ven mediante enlaces temporales
que la app genera al abrir el evento, así que nadie sin sesión puede acceder a ellas.
Cualquier usuario del equipo con sesión puede ver, subir y borrar fotos, igual que
pasa con los eventos.

---

## Correr la app

Necesitas Node.js instalado (https://nodejs.org).

```bash
cd bitacora-app
npm install
npx expo start
```

Escanea el QR con **Expo Go** en el celular.

## Estructura

```
App.js                  navegación y sesión
lib/supabase.js         conexión a Supabase
lib/fotos.js            subida, enlaces y borrado de imágenes
lib/camara.js           permisos, cámara y galería
screens/LoginScreen     acceso y registro
screens/ListaScreen     lista de eventos por día
screens/NuevaScreen     formulario de registro
screens/DetalleScreen   detalle, fotos y eliminación
screens/ExportarScreen  generación del Excel mensual
supabase_setup.sql      creación inicial
supabase_fotos.sql      migración de fotos
```

## Costos

Expo y Supabase tienen planes gratis suficientes para un equipo pequeño. El plan
gratis de Supabase incluye 500 MB de base de datos y 1 GB de almacenamiento de
archivos; con fotos comprimidas a calidad media eso alcanza para varios miles de
imágenes. Si se llena, se puede subir de plan o limpiar fotos antiguas.
