// Manejo de modal, formularios de cotización/contacto y envío a Google Apps Script con fallback.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxw3iNgKv_kRT41DosIJ3JtL4tY08gE_FvNoKNSkUtZEMKQIsGi5CqjB-KzLUbuFjGi/exec';
const ANTISPAM_CONFIG = {
  HONEYPOT_FIELD: 'website',
  MIN_FILL_SECONDS: 4,
  SUBMIT_COOLDOWN_MS: 15000,
  MAX_NOMBRE: 120,
  MAX_EMPRESA: 140,
  MAX_MENSAJE: 2000
};
const ultimoEnvioPorFormulario = new Map();

document.addEventListener('DOMContentLoaded', () => {
  insertarModalCotizacion();
  registrarEventosModal();
  registrarBotonesCotizacion();
  registrarFormulariosDirectos();
});

function insertarModalCotizacion() {
  if (document.getElementById('modal-cotizacion')) return;

  const modalHTML = `
    <div id="modal-cotizacion" class="fixed inset-0 z-[60] hidden items-center justify-center bg-slate-900/70 p-4">
      <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900">Solicitar Cotización</h2>
          <button type="button" id="modal-cotizacion-cerrar" class="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100" aria-label="Cerrar">✕</button>
        </div>

        <form id="form-cotizacion-modal" class="js-form-cotizacion space-y-3">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="modal-nombre">Nombre completo *</label>
            <input id="modal-nombre" name="nombre" type="text" required class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="modal-empresa">Empresa *</label>
            <input id="modal-empresa" name="empresa" type="text" required class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="modal-email">Email *</label>
            <input id="modal-email" name="email" type="email" required class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="modal-telefono">Teléfono</label>
            <input id="modal-telefono" name="telefono" type="tel" class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="modal-producto">Producto *</label>
            <input id="modal-producto" name="producto" type="text" readonly required class="w-full rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="modal-cantidad">Cantidad *</label>
            <input id="modal-cantidad" name="cantidad" type="number" min="1" value="1" required class="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="modal-mensaje">Mensaje / especificaciones adicionales</label>
            <textarea id="modal-mensaje" name="mensaje" rows="3" class="w-full rounded border border-slate-300 px-3 py-2 text-sm"></textarea>
          </div>

          <button type="submit" class="inline-flex items-center justify-center rounded bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            <span class="btn-label">Enviar cotización</span>
            <span class="btn-spinner ml-2 hidden h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          </button>
          <p class="text-xs text-slate-500">Si el Apps Script no está configurado, se usará correo como fallback.</p>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function registrarEventosModal() {
  const modal = document.getElementById('modal-cotizacion');
  const btnCerrar = document.getElementById('modal-cotizacion-cerrar');

  if (!modal || !btnCerrar) return;

  btnCerrar.addEventListener('click', cerrarModalCotizacion);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      cerrarModalCotizacion();
    }
  });
}

function registrarBotonesCotizacion() {
  document.addEventListener('click', (event) => {
    const boton = event.target.closest('.js-open-cotizacion');
    if (!boton) return;

    const nombreProducto = boton.getAttribute('data-producto') || 'Producto no especificado';
    abrirModalCotizacion(nombreProducto);
  });
}

function abrirModalCotizacion(nombreProducto) {
  const modal = document.getElementById('modal-cotizacion');
  const inputProducto = document.getElementById('modal-producto');
  const form = document.getElementById('form-cotizacion-modal');

  if (!modal || !inputProducto) return;

  if (form) rearmarCamposAntispam(form);
  inputProducto.value = nombreProducto;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
}

function cerrarModalCotizacion() {
  const modal = document.getElementById('modal-cotizacion');
  const form = document.getElementById('form-cotizacion-modal');

  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');

  if (form) {
    form.reset();
    rearmarCamposAntispam(form);
    const inputProducto = document.getElementById('modal-producto');
    if (inputProducto) inputProducto.value = '';
  }
}

function registrarFormulariosDirectos() {
  const formularios = document.querySelectorAll('.js-form-cotizacion, .js-form-contacto');
  formularios.forEach((form) => {
    prepararCamposAntispam(form);

    if (form.dataset.bound === 'true') return;

    form.dataset.bound = 'true';
    form.addEventListener('submit', manejarEnvioFormulario);
  });
}

async function manejarEnvioFormulario(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const validacionAntispam = validarAntispamEnCliente(form, data);
  if (!validacionAntispam.ok) {
    if (validacionAntispam.mensaje) {
      mostrarToast(validacionAntispam.mensaje, 'error');
    }
    return;
  }

  normalizarCampos(data);

  if (!data.nombre || !data.empresa || !data.email) {
    mostrarToast('Completa los campos obligatorios.', 'error');
    return;
  }

  if (!validarEmail(data.email)) {
    mostrarToast('Ingresa un email válido.', 'error');
    return;
  }
  if (data.nombre.length > ANTISPAM_CONFIG.MAX_NOMBRE || data.empresa.length > ANTISPAM_CONFIG.MAX_EMPRESA) {
    mostrarToast('Verifica la longitud de nombre y empresa.', 'error');
    return;
  }
  if ((data.mensaje || '').length > ANTISPAM_CONFIG.MAX_MENSAJE) {
    mostrarToast('El mensaje es demasiado largo.', 'error');
    return;
  }

  data.cantidad = data.cantidad || '1';
  data.origen = form.id || 'formulario_web';
  data.source_url = window.location.href;
  data.client_sent_at = new Date().toISOString();
  data.user_agent = navigator.userAgent.slice(0, 180);

  setEstadoCarga(form, true);

  try {
    const scriptConfigurado = !GOOGLE_SCRIPT_URL.includes('TU_ID_AQUI');

    if (!scriptConfigurado) {
      manejarFallbackMailto(data, true);
      return;
    }

    const payload = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      payload.append(key, String(value ?? ''));
    });

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: payload,
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    let resultado = null;
    try {
      resultado = await response.json();
    } catch (_) {
      resultado = null;
    }
    if (resultado && resultado.ok === false) {
      throw new Error(resultado.error || 'Error de validación en Apps Script');
    }

    mostrarToast('Cotización enviada, te contactaremos pronto.', 'success');
    form.reset();
    rearmarCamposAntispam(form);

    if (form.id === 'form-cotizacion-modal') {
      setTimeout(() => {
        cerrarModalCotizacion();
      }, 500);
    }
  } catch (error) {
    console.error('Error al enviar formulario:', error);
    manejarFallbackMailto(data, false);
  } finally {
    setEstadoCarga(form, false);
  }
}

function manejarFallbackMailto(data, modoDemo) {
  const asunto = encodeURIComponent(`Solicitud de cotización - ${data.producto || 'Consulta general'}`);
  const cuerpo = encodeURIComponent(
    `Nombre: ${data.nombre}\nEmpresa: ${data.empresa}\nEmail: ${data.email}\nTeléfono: ${data.telefono || '-'}\nProducto: ${data.producto || 'No especificado'}\nCantidad: ${data.cantidad || '1'}\nMensaje: ${data.mensaje || '-'}\nOrigen: ${data.origen}`
  );

  const mailto = `mailto:ventas@industrialvalve.com?subject=${asunto}&body=${cuerpo}`;

  if (modoDemo) {
    mostrarToast('Demo: en producción enviará a ventas por Apps Script. Se abrirá tu correo.', 'info');
  } else {
    mostrarToast('No se pudo conectar con el script. Se abrirá correo como alternativa.', 'error');
  }

  window.location.href = mailto;
}

function setEstadoCarga(form, enCarga) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;

  const spinner = button.querySelector('.btn-spinner');
  const label = button.querySelector('.btn-label');
  if (!label) return;

  button.disabled = enCarga;
  button.classList.toggle('opacity-70', enCarga);
  button.classList.toggle('cursor-not-allowed', enCarga);

  if (!label.dataset.default) {
    label.dataset.default = label.textContent;
  }

  if (spinner) spinner.classList.toggle('hidden', !enCarga);
  label.textContent = enCarga ? 'Enviando...' : label.dataset.default;
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function prepararCamposAntispam(form) {
  if (form.dataset.antispamReady === 'true') return;

  agregarInputOculto(form, ANTISPAM_CONFIG.HONEYPOT_FIELD, '');
  agregarInputOculto(form, 'form_started_at', String(Date.now()));
  agregarInputOculto(form, 'client_nonce', generarNonce());
  agregarInputOculto(form, 'source_url', window.location.href);

  form.dataset.antispamReady = 'true';
}

function rearmarCamposAntispam(form) {
  setInputValue(form, 'form_started_at', String(Date.now()));
  setInputValue(form, 'client_nonce', generarNonce());
  setInputValue(form, ANTISPAM_CONFIG.HONEYPOT_FIELD, '');
  setInputValue(form, 'source_url', window.location.href);
}

function validarAntispamEnCliente(form, data) {
  const honeypotValue = String(data[ANTISPAM_CONFIG.HONEYPOT_FIELD] || '').trim();
  if (honeypotValue) {
    return { ok: false, mensaje: '' };
  }

  const startedAt = Number(data.form_started_at || 0);
  const elapsedMs = Date.now() - startedAt;
  if (!startedAt || elapsedMs < ANTISPAM_CONFIG.MIN_FILL_SECONDS * 1000) {
    return { ok: false, mensaje: 'Envía el formulario después de unos segundos.' };
  }

  const formKey = form.id || 'formulario_web';
  const ultimoEnvio = ultimoEnvioPorFormulario.get(formKey) || 0;
  if (Date.now() - ultimoEnvio < ANTISPAM_CONFIG.SUBMIT_COOLDOWN_MS) {
    return { ok: false, mensaje: 'Espera unos segundos antes de volver a enviar.' };
  }
  ultimoEnvioPorFormulario.set(formKey, Date.now());

  return { ok: true, mensaje: '' };
}

function normalizarCampos(data) {
  const camposTexto = ['nombre', 'empresa', 'email', 'telefono', 'producto', 'mensaje'];
  camposTexto.forEach((campo) => {
    if (typeof data[campo] === 'string') {
      data[campo] = data[campo].trim();
    }
  });
}

function agregarInputOculto(form, name, value) {
  const input = document.createElement('input');
  if (name === ANTISPAM_CONFIG.HONEYPOT_FIELD) {
    input.type = 'text';
    input.tabIndex = -1;
    input.autocomplete = 'off';
    input.setAttribute('aria-hidden', 'true');
    input.className = 'absolute -left-[9999px] top-auto h-px w-px opacity-0 pointer-events-none';
  } else {
    input.type = 'hidden';
  }
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

function setInputValue(form, name, value) {
  const input = form.querySelector(`input[name="${name}"]`);
  if (input) input.value = value;
}

function generarNonce() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mostrarToast(texto, tipo) {
  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-industrial-900'
  };

  const toast = document.createElement('div');
  toast.className = `fixed right-4 top-4 z-[70] rounded px-4 py-3 text-sm font-medium text-white shadow-lg ${colors[tipo] || colors.info}`;
  toast.textContent = texto;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
