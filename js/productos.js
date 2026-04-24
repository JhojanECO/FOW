// Carga, filtrado y renderizado de productos desde JSON para páginas de inicio, catálogo y detalle.
// Acepta URL completa, ID de Apps Script o ruta local.
const RUTA_PRODUCTOS_JSON = 'https://script.google.com/macros/s/AKfycbxffb-Q5susUJokchpi3h72d7HoA63Vi9lv6nho2yl3nKzXtw_atHaC3sOmi1nxiKh_/exec';

async function cargarProductos() {
  try {
    const rutaNormalizada = normalizarRutaProductos(RUTA_PRODUCTOS_JSON);
    const response = await fetch(rutaNormalizada, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.productos) ? data.productos : [];
  } catch (error) {
    console.error('Error cargando productos:', error);
    return [];
  }
}

function normalizarRutaProductos(ruta) {
  const valor = String(ruta || '').trim();

  if (!valor) return 'data/productos.json';
  if (valor.startsWith('http://') || valor.startsWith('https://')) return valor;

  const matchIdConSufijo = valor.match(/^([A-Za-z0-9_-]{20,})\/products\.json$/);
  if (matchIdConSufijo) {
    return `https://script.google.com/macros/s/${matchIdConSufijo[1]}/exec`;
  }

  const esIdDirecto = /^[A-Za-z0-9_-]{20,}$/.test(valor);
  if (esIdDirecto) {
    return `https://script.google.com/macros/s/${valor}/exec`;
  }

  return valor;
}

function renderizarProductos(productos, contenedorId, limite = null) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const lista = limite ? productos.slice(0, limite) : productos;

  if (!lista.length) {
    contenedor.innerHTML = '<p class="col-span-full rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">No hay productos disponibles para los filtros seleccionados.</p>';
    return;
  }

  contenedor.innerHTML = lista
    .map((producto) => crearTarjetaProducto(producto))
    .join('');
}

function crearTarjetaProducto(producto) {
  const certificaciones = Array.isArray(producto.certificaciones)
    ? producto.certificaciones.slice(0, 2).join(' · ')
    : 'Sin certificaciones registradas';

  return `
    <article class="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <a href="producto-detalle.html?id=${encodeURIComponent(producto.id)}" class="block overflow-hidden rounded-t-lg">
        <img src="${producto.imagen_url || 'images/productos/sin-imagen.png'}" alt="${escapeHtml(producto.nombre)}" class="h-48 w-full object-cover" loading="lazy" />
      </a>
      <div class="flex flex-1 flex-col p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(producto.marca)} · ${escapeHtml(producto.modelo)}</p>
        <h3 class="mt-2 text-base font-bold text-slate-900">${escapeHtml(producto.nombre)}</h3>
        <p class="mt-2 text-sm text-slate-600">${escapeHtml(producto.descripcion)}</p>
        <dl class="mt-3 space-y-1 text-xs text-slate-600">
          <div><dt class="inline font-semibold">Material:</dt> <dd class="inline">${escapeHtml(producto.material)}</dd></div>
          <div><dt class="inline font-semibold">Conexión:</dt> <dd class="inline">${escapeHtml(producto.conexion)}</dd></div>
          <div><dt class="inline font-semibold">Presión:</dt> <dd class="inline">${escapeHtml(producto.presion)}</dd></div>
          <div><dt class="inline font-semibold">Certificaciones:</dt> <dd class="inline">${escapeHtml(certificaciones)}</dd></div>
        </dl>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="producto-detalle.html?id=${encodeURIComponent(producto.id)}" class="rounded border border-industrial-900 px-3 py-2 text-xs font-semibold text-industrial-900 hover:bg-slate-100">Ver más</a>
          <button type="button" class="js-open-cotizacion rounded bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700" data-producto="${escapeHtml(producto.nombre)}">Solicitar Cotización</button>
        </div>
      </div>
    </article>
  `;
}

function inicializarPaginaInicio() {
  const contenedor = document.getElementById('productos-destacados');
  if (!contenedor) return;

  cargarProductos().then((productos) => {
    const destacados = productos.filter((p) => p.activo !== false && p.destacado === true);
    const dataset = destacados.length ? destacados : productos.filter((p) => p.activo !== false);
    renderizarProductos(dataset, 'productos-destacados', 6);
  });
}

function inicializarPaginaProductos() {
  const contenedor = document.getElementById('listado-productos');
  if (!contenedor) return;

  const selectMarca = document.getElementById('filtro-marca');
  const selectMaterial = document.getElementById('filtro-material');
  const inputBuscador = document.getElementById('buscador-productos');
  const btnLimpiar = document.getElementById('limpiar-filtros');
  const contador = document.getElementById('resultado-contador');

  let productosBase = [];

  cargarProductos().then((productos) => {
    productosBase = productos.filter((p) => p.activo !== false);
    cargarOpcionesFiltro(productosBase, selectMarca, 'marca');
    cargarOpcionesFiltro(productosBase, selectMaterial, 'material');
    aplicarFiltros();
  });

  [selectMarca, selectMaterial, inputBuscador].forEach((control) => {
    if (!control) return;
    control.addEventListener('input', aplicarFiltros);
    control.addEventListener('change', aplicarFiltros);
  });

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      if (selectMarca) selectMarca.value = '';
      if (selectMaterial) selectMaterial.value = '';
      if (inputBuscador) inputBuscador.value = '';
      aplicarFiltros();
    });
  }

  function aplicarFiltros() {
    const marcaSeleccionada = selectMarca?.value || '';
    const materialSeleccionado = selectMaterial?.value || '';
    const termino = inputBuscador?.value || '';

    const filtrados = productosBase.filter((producto) => {
      const coincideMarca = !marcaSeleccionada || producto.marca === marcaSeleccionada;
      const coincideMaterial = !materialSeleccionado || producto.material === materialSeleccionado;

      const coincideTexto = window.BuscadorProductos
        ? window.BuscadorProductos.coincide(producto, termino)
        : incluyeTextoBasico(producto, termino);

      return coincideMarca && coincideMaterial && coincideTexto;
    });

    renderizarProductos(filtrados, 'listado-productos');
    if (contador) {
      contador.textContent = `Mostrando ${filtrados.length} de ${productosBase.length} productos activos.`;
    }
  }
}

function cargarOpcionesFiltro(productos, select, campo) {
  if (!select) return;

  const opciones = [...new Set(productos.map((item) => item[campo]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'es', { sensitivity: 'base' }));

  const fragment = document.createDocumentFragment();
  opciones.forEach((valor) => {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = valor;
    fragment.appendChild(option);
  });

  select.appendChild(fragment);
}

function incluyeTextoBasico(producto, termino) {
  const query = String(termino || '').toLowerCase().trim();
  if (!query) return true;

  return [producto.nombre, producto.marca, producto.descripcion]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function inicializarPaginaDetalle() {
  const contenedor = document.getElementById('producto-detalle');
  if (!contenedor) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    contenedor.innerHTML = '<p class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">No se recibió el ID del producto. Regresa al catálogo.</p>';
    return;
  }

  cargarProductos().then((productos) => {
    const producto = productos.find((item) => item.id === id && item.activo !== false);

    if (!producto) {
      contenedor.innerHTML = '<p class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">Producto no encontrado o inactivo.</p>';
      return;
    }

    const imagenes = Array.isArray(producto.imagenes) && producto.imagenes.length
      ? producto.imagenes
      : [producto.imagen_url || 'images/productos/sin-imagen.png'];

    contenedor.innerHTML = `
      <div class="grid gap-8 lg:grid-cols-2">
        <div>
          <img src="${imagenes[0]}" alt="${escapeHtml(producto.nombre)}" class="h-80 w-full rounded-lg object-cover" />
          <div class="mt-3 grid grid-cols-3 gap-3">
            ${imagenes
              .map(
                (img) =>
                  `<img src="${img}" alt="${escapeHtml(producto.nombre)}" class="h-24 w-full rounded border border-slate-200 object-cover" />`
              )
              .join('')}
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(producto.marca)} · ${escapeHtml(producto.modelo)}</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-900">${escapeHtml(producto.nombre)}</h1>
          <p class="mt-3 text-sm leading-6 text-slate-600">${escapeHtml(producto.descripcion)}</p>

          <div class="mt-5 flex flex-wrap gap-2">
            <button type="button" class="js-open-cotizacion rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700" data-producto="${escapeHtml(producto.nombre)}">Solicitar Cotización</button>
            <a href="${producto.pdf_url || '#'}" target="_blank" rel="noopener" class="rounded border border-industrial-900 px-4 py-2 text-sm font-semibold text-industrial-900 hover:bg-slate-100">Descargar ficha técnica</a>
          </div>

          <h2 class="mt-6 text-lg font-bold text-slate-900">Especificaciones técnicas</h2>
          <table class="mt-3 w-full border-collapse overflow-hidden rounded border border-slate-200 text-sm">
            <tbody>
              ${filaEspecificacion('Material', producto.material)}
              ${filaEspecificacion('Tamaños', producto.tamanos)}
              ${filaEspecificacion('Conexión', producto.conexion)}
              ${filaEspecificacion('Presión', producto.presion)}
              ${filaEspecificacion('Temperatura', producto.temperatura)}
            </tbody>
          </table>

          <h3 class="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-600">Certificaciones aplicables</h3>
          <div class="mt-2 flex flex-wrap gap-2">
            ${Array.isArray(producto.certificaciones) && producto.certificaciones.length
              ? producto.certificaciones
                  .map(
                    (cert) =>
                      `<span class="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">${escapeHtml(cert)}</span>`
                  )
                  .join('')
              : '<span class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">No especificadas</span>'}
          </div>
        </div>
      </div>
    `;
  });
}

function filaEspecificacion(etiqueta, valor) {
  return `
    <tr class="border-b border-slate-200 last:border-b-0">
      <th class="w-40 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">${escapeHtml(etiqueta)}</th>
      <td class="px-3 py-2 text-slate-600">${escapeHtml(valor || '-')}</td>
    </tr>
  `;
}

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.cargarProductos = cargarProductos;
window.renderizarProductos = renderizarProductos;

document.addEventListener('DOMContentLoaded', () => {
  inicializarPaginaInicio();
  inicializarPaginaProductos();
  inicializarPaginaDetalle();
});
