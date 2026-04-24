# Sitio Web Industrial B2B (Válvulas, Instrumentación y Automatización)

Proyecto estático (HTML + Tailwind CDN + JavaScript vanilla) para catálogo técnico con solicitud de cotización.

## 1) Configurar Google Apps Script

1. Abre `js/cotizacion.js`.
2. Busca esta línea:

```js
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/TU_ID_AQUI/exec';
```

3. Reemplaza `TU_ID_AQUI` por el ID real de tu Web App de Google Apps Script.
4. Publica el script como Web App con acceso adecuado para recibir solicitudes.

Si no configuras el ID, el sistema entra en modo demo y usa fallback por `mailto:`.

## 2) Modificar el catálogo (`data/productos.json`)

El archivo usa esta estructura base:

```json
{
  "productos": [
    {
      "id": "valv-bola-dn50",
      "nombre": "Válvula de bola DN50 ANSI 150",
      "marca": "Bray",
      "modelo": "S30",
      "descripcion": "...",
      "material": "Acero inoxidable 316",
      "tamanos": "DN15 a DN300",
      "conexion": "Brida ANSI 150",
      "presion": "Clase 150",
      "temperatura": "-20°C a +200°C",
      "certificaciones": ["API 607", "ISO 9001"],
      "pdf_url": "#",
      "imagen_url": "https://placehold.co/800x600",
      "destacado": true,
      "activo": true
    }
  ]
}
```

### Reglas rápidas

- `id` debe ser único y sin espacios.
- `activo: true` muestra el producto.
- `destacado: true` permite mostrarlo en la portada.
- `pdf_url` puede quedar en `#` hasta tener ficha técnica real.
- `imagen_url` puede ser URL externa o ruta local (`/images/productos/...`).

## 3) Reemplazar imágenes y PDFs

- Imágenes de producto: `images/productos/`
- Logos: `images/logos/`
- Certificaciones: `images/certificaciones/`
- Fichas técnicas: `pdfs/`

Luego actualiza `imagen_url` y `pdf_url` en `data/productos.json`.

## 4) Ejecutar en local

Por seguridad del navegador, `fetch()` no carga JSON correctamente con `file://`.
Usa un servidor local simple.

Ejemplo con Python:

```bash
python -m http.server 5500
```

Abrir en navegador:

```text
http://localhost:5500
```

## 5) Despliegue en GitHub Pages

1. Sube el proyecto a un repositorio GitHub.
2. Ve a `Settings > Pages`.
3. En `Build and deployment`, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main` (root)
4. Guarda y espera el enlace público.

## 6) Despliegue en Netlify

1. Crea sitio nuevo desde repositorio GitHub.
2. Build command: *(vacío)*
3. Publish directory: `/`
4. Deploy.

## 7) Estructura principal

- `index.html` Inicio con hero, destacados y certificaciones
- `productos.html` Catálogo con filtros y buscador
- `producto-detalle.html` Detalle técnico por `?id=`
- `empresa.html` Perfil corporativo
- `certificaciones.html` Certificaciones y PDFs dummy
- `contacto.html` Formulario de contacto
- `cotizar.html` Formulario general de cotización
- `js/main.js` Menú móvil, año dinámico, navegación activa
- `js/productos.js` Carga/render/filtros/detalle desde JSON
- `js/cotizacion.js` Modal y envío/fallback
- `js/buscador.js` Utilidades de búsqueda
- `data/productos.json` Catálogo editable
- `admin/` Decap CMS opcional

---
Sitio orientado a uso B2B industrial, sin ecommerce y sin backend propio.
