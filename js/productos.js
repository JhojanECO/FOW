// Carga, filtrado y renderizado de productos desde JSON para páginas de inicio, catálogo y detalle.
// Acepta URL completa, ID de Apps Script o ruta local.
const RUTA_PRODUCTOS_JSON = 'https://script.google.com/macros/s/AKfycbxffb-Q5susUJokchpi3h72d7HoA63Vi9lv6nho2yl3nKzXtw_atHaC3sOmi1nxiKh_/exec';
const IMAGEN_PLACEHOLDER = 'https://placehold.co/800x600/e2e8f0/64748b?text=Sin+Imagen';
const PRODUCT_LIGHTBOX_ID = 'product-lightbox';
const avisosImagen = new Set();
const detalleGaleriaState = {
  imagenes: [],
  nombreProducto: '',
  indiceActual: 0,
  zoom: 1
};

async function cargarProductos() {
  try {
    const rutaNormalizada = normalizarRutaProductos(RUTA_PRODUCTOS_JSON);
    const response = await fetch(rutaNormalizada, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const productos = Array.isArray(data.productos) ? data.productos : [];
    diagnosticarImagenes(productos);
    return productos;
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
  const imagenProducto = normalizarUrlImagen(producto.imagen_url);

  return `
    <article class="product-card card group">
      <a href="producto-detalle.html?id=${encodeURIComponent(producto.id)}" class="product-card-image-wrap block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700 focus-visible:ring-offset-2">
        <img src="${imagenProducto}" alt="${escapeHtml(producto.nombre)}" class="product-card-image" loading="lazy" onerror="this.onerror=null;this.src='${IMAGEN_PLACEHOLDER}'" />
      </a>
      <div class="product-card-name-bubble" aria-hidden="true">
        <p class="text-sm font-extrabold leading-5 text-white">${escapeHtml(producto.nombre)}</p>
      </div>
      <div class="product-card-overlay card-overlay">
        <div class="product-card-content-panel">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-200">${escapeHtml(producto.marca)} · ${escapeHtml(producto.modelo)}</p>
          <h3 class="mt-2 text-lg font-extrabold leading-6 text-white">${escapeHtml(producto.nombre)}</h3>
          <p class="mt-2 line-clamp-2 text-sm text-slate-100">${escapeHtml(producto.descripcion)}</p>

          <div class="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Especificaciones clave">
            <span class="spec-badge">Material: ${escapeHtml(producto.material || '-')}</span>
            <span class="spec-badge">Presión: ${escapeHtml(producto.presion || '-')}</span>
            <span class="spec-badge">Conexión: ${escapeHtml(producto.conexion || '-')}</span>
          </div>

          <p class="mt-3 text-[11px] text-slate-200">Certificaciones: ${escapeHtml(certificaciones)}</p>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <button type="button" class="js-open-cotizacion btn-cta-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700 focus-visible:ring-offset-2" data-producto="${escapeHtml(producto.nombre)}">Solicitar cotización</button>
            <a href="producto-detalle.html?id=${encodeURIComponent(producto.id)}" class="btn-cta-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700 focus-visible:ring-offset-2">Ver más</a>
          </div>
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

    const imagenes = prepararImagenesProducto(producto);
    renderizarDetalleProducto(contenedor, producto, imagenes);
    inicializarDetalleInteractivo(imagenes, producto.nombre);
  });
}

function prepararImagenesProducto(producto) {
  const origen = Array.isArray(producto.imagenes) && producto.imagenes.length
    ? producto.imagenes
    : [producto.imagen_url];

  const normalizadas = origen
    .map((url) => normalizarUrlImagen(url))
    .filter(Boolean);

  const unicas = [...new Set(normalizadas)];
  return unicas.length ? unicas : [IMAGEN_PLACEHOLDER];
}

function renderizarDetalleProducto(contenedor, producto, imagenes) {
  const miniaturasHtml = imagenes
    .map(
      (img, index) => `
        <button type="button" class="product-thumb-btn ${index === 0 ? 'is-active' : ''}" data-thumb-index="${index}" aria-label="Ver imagen ${index + 1}">
          <img src="${img}" alt="${escapeHtml(producto.nombre)} miniatura ${index + 1}" class="product-thumb-image" loading="lazy" onerror="this.onerror=null;this.src='${IMAGEN_PLACEHOLDER}'" />
        </button>
      `
    )
    .join('');

  const mostrarControlesImagen = imagenes.length > 1;

  contenedor.innerHTML = `
    <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <section aria-label="Galería del producto">
        <div class="product-main-image-shell">
          <button id="detalle-main-image-btn" type="button" class="product-main-image-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700 focus-visible:ring-offset-2" aria-label="Ampliar imagen del producto">
            <img id="detalle-main-image" src="${imagenes[0]}" alt="${escapeHtml(producto.nombre)}" class="product-main-image" loading="lazy" onerror="this.onerror=null;this.src='${IMAGEN_PLACEHOLDER}'" />
          </button>
          ${mostrarControlesImagen ? `
            <button id="detalle-img-prev" type="button" class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white/90 px-3 py-2 text-slate-700 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700" aria-label="Imagen anterior">‹</button>
            <button id="detalle-img-next" type="button" class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white/90 px-3 py-2 text-slate-700 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700" aria-label="Imagen siguiente">›</button>
          ` : ''}
        </div>
        <p class="mt-2 text-xs text-slate-500">Haz clic en la imagen para ampliar y usar zoom.</p>
        <div id="detalle-thumbs" class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          ${miniaturasHtml}
        </div>
      </section>

      <section>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${escapeHtml(producto.marca)} · ${escapeHtml(producto.modelo)}</p>
        <h1 class="mt-2 text-2xl font-extrabold leading-tight text-slate-900">${escapeHtml(producto.nombre)}</h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">${escapeHtml(producto.descripcion)}</p>

        <div class="mt-5 flex flex-wrap gap-2">
          <button type="button" class="js-open-cotizacion btn-cta-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700 focus-visible:ring-offset-2" data-producto="${escapeHtml(producto.nombre)}">Solicitar cotización</button>
          <a href="${producto.pdf_url || '#'}" target="_blank" rel="noopener" class="btn-cta-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-industrial-700 focus-visible:ring-offset-2">Descargar ficha técnica</a>
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
      </section>
    </div>
  `;
}

function inicializarDetalleInteractivo(imagenes, nombreProducto) {
  detalleGaleriaState.imagenes = imagenes;
  detalleGaleriaState.nombreProducto = nombreProducto;
  detalleGaleriaState.indiceActual = 0;
  detalleGaleriaState.zoom = 1;

  const thumbs = document.querySelectorAll('[data-thumb-index]');
  thumbs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.getAttribute('data-thumb-index') || 0);
      actualizarImagenPrincipal(index, true);
    });
  });

  document.getElementById('detalle-main-image-btn')?.addEventListener('click', () => {
    abrirLightbox(detalleGaleriaState.indiceActual);
  });

  document.getElementById('detalle-img-prev')?.addEventListener('click', () => {
    navegarImagenPrincipal(-1);
  });
  document.getElementById('detalle-img-next')?.addEventListener('click', () => {
    navegarImagenPrincipal(1);
  });

  crearLightboxProducto();
  actualizarImagenPrincipal(0, false);
}

function navegarImagenPrincipal(step) {
  const total = detalleGaleriaState.imagenes.length;
  if (total < 2) return;
  const siguiente = (detalleGaleriaState.indiceActual + step + total) % total;
  actualizarImagenPrincipal(siguiente, true);
}

function actualizarImagenPrincipal(index, conAnimacion) {
  const total = detalleGaleriaState.imagenes.length;
  if (!total) return;

  const indiceSeguro = Math.max(0, Math.min(index, total - 1));
  detalleGaleriaState.indiceActual = indiceSeguro;

  const mainImg = document.getElementById('detalle-main-image');
  if (mainImg) {
    if (conAnimacion) mainImg.classList.add('is-switching');
    window.setTimeout(() => {
      mainImg.src = detalleGaleriaState.imagenes[indiceSeguro];
      mainImg.alt = `${detalleGaleriaState.nombreProducto} - imagen ${indiceSeguro + 1}`;
      mainImg.classList.remove('is-switching');
    }, conAnimacion ? 120 : 0);
  }

  document.querySelectorAll('[data-thumb-index]').forEach((thumb) => {
    const thumbIndex = Number(thumb.getAttribute('data-thumb-index') || 0);
    thumb.classList.toggle('is-active', thumbIndex === indiceSeguro);
    thumb.setAttribute('aria-current', thumbIndex === indiceSeguro ? 'true' : 'false');
  });
}

function crearLightboxProducto() {
  if (document.getElementById(PRODUCT_LIGHTBOX_ID)) return;

  const lightboxHtml = `
    <div id="${PRODUCT_LIGHTBOX_ID}" class="product-lightbox" role="dialog" aria-modal="true" aria-label="Vista ampliada del producto">
      <div class="product-lightbox-panel">
        <div class="product-lightbox-toolbar">
          <strong id="lightbox-title" class="text-sm text-slate-800">Vista de producto</strong>
          <div class="product-lightbox-actions">
            <button id="lightbox-zoom-out" type="button" class="product-lightbox-btn" aria-label="Alejar">−</button>
            <button id="lightbox-zoom-reset" type="button" class="product-lightbox-btn" aria-label="Zoom 100%">100%</button>
            <button id="lightbox-zoom-in" type="button" class="product-lightbox-btn" aria-label="Acercar">＋</button>
            <button id="lightbox-close" type="button" class="product-lightbox-btn" aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div class="product-lightbox-stage">
          <button id="lightbox-prev" type="button" class="product-lightbox-btn absolute left-3 top-1/2 -translate-y-1/2" aria-label="Imagen anterior">‹</button>
          <img id="lightbox-image" src="${IMAGEN_PLACEHOLDER}" alt="Vista ampliada del producto" class="product-lightbox-image" />
          <button id="lightbox-next" type="button" class="product-lightbox-btn absolute right-3 top-1/2 -translate-y-1/2" aria-label="Imagen siguiente">›</button>
        </div>
        <div class="product-lightbox-footer">
          <span id="lightbox-counter">1 / 1</span>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', lightboxHtml);

  const lightbox = document.getElementById(PRODUCT_LIGHTBOX_ID);
  lightbox?.addEventListener('click', (event) => {
    if (event.target === lightbox) cerrarLightbox();
  });
  document.getElementById('lightbox-close')?.addEventListener('click', cerrarLightbox);
  document.getElementById('lightbox-prev')?.addEventListener('click', () => navegarLightbox(-1));
  document.getElementById('lightbox-next')?.addEventListener('click', () => navegarLightbox(1));
  document.getElementById('lightbox-zoom-in')?.addEventListener('click', () => ajustarZoom(0.2));
  document.getElementById('lightbox-zoom-out')?.addEventListener('click', () => ajustarZoom(-0.2));
  document.getElementById('lightbox-zoom-reset')?.addEventListener('click', () => establecerZoom(1));

  document.addEventListener('keydown', (event) => {
    const abierto = lightbox?.classList.contains('is-open');
    if (!abierto) return;

    if (event.key === 'Escape') cerrarLightbox();
    if (event.key === 'ArrowLeft') navegarLightbox(-1);
    if (event.key === 'ArrowRight') navegarLightbox(1);
    if (event.key === '+' || event.key === '=') ajustarZoom(0.2);
    if (event.key === '-') ajustarZoom(-0.2);
  });
}

function abrirLightbox(index) {
  const lightbox = document.getElementById(PRODUCT_LIGHTBOX_ID);
  if (!lightbox) return;

  detalleGaleriaState.indiceActual = index;
  detalleGaleriaState.zoom = 1;
  renderizarLightbox();
  lightbox.classList.add('is-open');
  document.body.classList.add('overflow-hidden');
}

function cerrarLightbox() {
  const lightbox = document.getElementById(PRODUCT_LIGHTBOX_ID);
  if (!lightbox) return;
  lightbox.classList.remove('is-open');
  document.body.classList.remove('overflow-hidden');
}

function navegarLightbox(step) {
  const total = detalleGaleriaState.imagenes.length;
  if (!total) return;

  detalleGaleriaState.indiceActual = (detalleGaleriaState.indiceActual + step + total) % total;
  detalleGaleriaState.zoom = 1;
  renderizarLightbox();
  actualizarImagenPrincipal(detalleGaleriaState.indiceActual, true);
}

function ajustarZoom(delta) {
  establecerZoom(detalleGaleriaState.zoom + delta);
}

function establecerZoom(valor) {
  detalleGaleriaState.zoom = Math.min(3, Math.max(1, Number(valor) || 1));
  renderizarZoomLightbox();
}

function renderizarLightbox() {
  const lightboxImage = document.getElementById('lightbox-image');
  const counter = document.getElementById('lightbox-counter');
  const title = document.getElementById('lightbox-title');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const total = detalleGaleriaState.imagenes.length;
  if (!lightboxImage || !total) return;

  const mostrarNavegacion = total > 1;
  if (prevBtn) prevBtn.style.display = mostrarNavegacion ? 'inline-flex' : 'none';
  if (nextBtn) nextBtn.style.display = mostrarNavegacion ? 'inline-flex' : 'none';

  const src = detalleGaleriaState.imagenes[detalleGaleriaState.indiceActual];
  lightboxImage.style.opacity = '0.35';
  window.setTimeout(() => {
    lightboxImage.src = src;
    lightboxImage.alt = `${detalleGaleriaState.nombreProducto} ampliada ${detalleGaleriaState.indiceActual + 1}`;
    lightboxImage.style.opacity = '1';
    renderizarZoomLightbox();
  }, 90);

  if (counter) counter.textContent = `${detalleGaleriaState.indiceActual + 1} / ${total}`;
  if (title) title.textContent = detalleGaleriaState.nombreProducto || 'Vista de producto';
}

function renderizarZoomLightbox() {
  const lightboxImage = document.getElementById('lightbox-image');
  if (!lightboxImage) return;
  lightboxImage.style.transform = `scale(${detalleGaleriaState.zoom.toFixed(2)})`;
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

function normalizarUrlImagen(url) {
  const valorOriginal = String(url || '').trim();
  const valor = limpiarUrlImagen(valorOriginal);
  if (!valor) return IMAGEN_PLACEHOLDER;

  const idDrive = extraerIdDrive(valor);
  if (idDrive) {
    return `https://lh3.googleusercontent.com/d/${idDrive}=w1600`;
  }

  if (valor.startsWith('http://') || valor.startsWith('https://')) {
    return valor;
  }

  if (valor.startsWith('www.')) {
    return `https://${valor}`;
  }

  if (valor.startsWith('/') || valor.startsWith('./') || valor.startsWith('../') || valor.startsWith('images/')) {
    return valor;
  }

  if (valor.startsWith('data:image/')) {
    return valor;
  }

  advertirImagenInvalida(valorOriginal);
  return IMAGEN_PLACEHOLDER;
}

function limpiarUrlImagen(valorOriginal) {
  let valor = String(valorOriginal || '').trim();
  if (!valor) return '';

  valor = valor
    .replace(/^["']|["']$/g, '')
    .replace(/&amp;/g, '&')
    .trim();

  const desdeFormula = extraerUrlDeFormulaImagen(valor);
  if (desdeFormula) {
    valor = desdeFormula;
  }

  return valor.trim();
}

function extraerUrlDeFormulaImagen(valor) {
  const formulaComillasDobles = valor.match(/^=IMAGE\(\s*"([^"]+)"/i);
  if (formulaComillasDobles) return formulaComillasDobles[1].trim();

  const formulaComillasSimples = valor.match(/^=IMAGE\(\s*'([^']+)'/i);
  if (formulaComillasSimples) return formulaComillasSimples[1].trim();

  return '';
}

function advertirImagenInvalida(valorOriginal) {
  if (!valorOriginal) return;
  const llave = valorOriginal.slice(0, 200);
  if (avisosImagen.has(llave)) return;
  avisosImagen.add(llave);
  console.warn('[Catálogo] URL de imagen inválida, se usa placeholder:', valorOriginal);
}

function diagnosticarImagenes(productos) {
  if (!Array.isArray(productos) || !productos.length) return;

  const sinImagen = productos
    .filter((producto) => !String(producto.imagen_url || '').trim())
    .map((producto) => producto.id || producto.nombre || '(sin id)');

  if (sinImagen.length) {
    console.warn(`[Catálogo] ${sinImagen.length} producto(s) sin imagen_url en la fuente:`, sinImagen);
  }
}

function extraerIdDrive(url) {
  const fromFilePath = url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (fromFilePath) return fromFilePath[1];

  const fromPathGenerico = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (fromPathGenerico) return fromPathGenerico[1];

  const fromQuery = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (fromQuery) return fromQuery[1];

  return '';
}

window.cargarProductos = cargarProductos;
window.renderizarProductos = renderizarProductos;

document.addEventListener('DOMContentLoaded', () => {
  inicializarPaginaInicio();
  inicializarPaginaProductos();
  inicializarPaginaDetalle();
});
