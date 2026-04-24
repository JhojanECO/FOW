// Utilidades de búsqueda para catálogo de productos.
(function registrarBuscadorGlobal() {
  function normalizarTexto(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function coincide(producto, termino) {
    const query = normalizarTexto(termino);
    if (!query) return true;

    const contenido = [
      producto.nombre,
      producto.marca,
      producto.modelo,
      producto.descripcion,
      producto.material
    ]
      .map((item) => normalizarTexto(item))
      .join(' ');

    return contenido.includes(query);
  }

  window.BuscadorProductos = {
    normalizarTexto,
    coincide
  };
})();
