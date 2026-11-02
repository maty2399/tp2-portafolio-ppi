// ===== Estado =====
let productos = [];          // se carga desde productos.json
let carrito = {};            // { idProducto: cantidad }

// ===== Elementos del DOM =====
const catalogo = document.getElementById('catalogo');
const resultados = document.getElementById('resultados');
const buscador = document.getElementById('buscador');
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroMarca = document.getElementById('filtro-marca');
const precioMin = document.getElementById('precio-min');
const precioMax = document.getElementById('precio-max');
const orden = document.getElementById('orden');
const btnLimpiar = document.getElementById('btn-limpiar');
const btnCarrito = document.getElementById('btn-carrito');
const contadorCarrito = document.getElementById('contador-carrito');
const modalProducto = document.getElementById('modal-producto');
const detalleProducto = document.getElementById('detalle-producto');
const modalCarrito = document.getElementById('modal-carrito');
const listaCarrito = document.getElementById('lista-carrito');
const aviso = document.getElementById('aviso');

// ===== Utilidades =====
const formatoPesos = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
});

function precioATexto(valor) {
    return formatoPesos.format(valor);
}

// Pasa a minúsculas y quita acentos: "Teclado Mecánico" -> "teclado mecanico"
function normalizar(texto) {
    return String(texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function escapar(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

let temporizadorAviso;
function mostrarAviso(mensaje, esError = false) {
    aviso.textContent = mensaje;
    aviso.classList.toggle('error', esError);
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 2500);
}

function buscarProducto(id) {
    return productos.find(p => p.id === id);
}

// ===== Carga de datos (desde archivo JSON) =====
async function cargarProductos() {
    try {
        const respuesta = await fetch('productos.json');
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        productos = await respuesta.json();
    } catch (error) {
        console.error('No se pudo cargar productos.json:', error);
        catalogo.innerHTML = `<p class="vacio">No se pudo cargar el catálogo.<br>
            Abre la página desde un servidor (GitHub Pages o Live Server de VS Code),
            no haciendo doble clic sobre el archivo.</p>`;
        resultados.textContent = '';
        return;
    }

    cargarCarritoGuardado();
    llenarFiltros();
    renderizarCatalogo();
    actualizarContador();
}

function llenarFiltros() {
    const categorias = [...new Set(productos.map(p => p.categoria))].sort();
    const marcas = [...new Set(productos.map(p => p.marca))].sort();
    categorias.forEach(c => filtroCategoria.insertAdjacentHTML('beforeend', `<option value="${escapar(c)}">${escapar(c)}</option>`));
    marcas.forEach(m => filtroMarca.insertAdjacentHTML('beforeend', `<option value="${escapar(m)}">${escapar(m)}</option>`));
}

// ===== Buscador y filtros =====
function obtenerProductosFiltrados() {
    const texto = normalizar(buscador.value.trim());
    const categoria = filtroCategoria.value;
    const marca = filtroMarca.value;
    const min = precioMin.value === '' ? 0 : Number(precioMin.value);
    const max = precioMax.value === '' ? Infinity : Number(precioMax.value);

    let lista = productos.filter(p => {
        // includes() busca al comienzo, en el medio y al final del nombre
        const coincideTexto = normalizar(p.nombre).includes(texto);
        const coincideCategoria = !categoria || p.categoria === categoria;
        const coincideMarca = !marca || p.marca === marca;
        const coincidePrecio = p.precio >= min && p.precio <= max;
        return coincideTexto && coincideCategoria && coincideMarca && coincidePrecio;
    });

    if (orden.value === 'precio-asc') lista.sort((a, b) => a.precio - b.precio);
    if (orden.value === 'precio-desc') lista.sort((a, b) => b.precio - a.precio);
    if (orden.value === 'nombre') lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return lista;
}

// ===== Catálogo =====
function renderizarCatalogo() {
    const lista = obtenerProductosFiltrados();

    resultados.textContent = lista.length === 1
        ? '1 producto encontrado'
        : `${lista.length} productos encontrados`;

    if (lista.length === 0) {
        catalogo.innerHTML = '<p class="vacio">No hay productos que coincidan con la búsqueda.</p>';
        return;
    }

    catalogo.innerHTML = lista.map(p => {
        const enCarrito = carrito[p.id] || 0;
        const sinStock = p.stock === 0;
        const alLimite = enCarrito >= p.stock;
        const textoStock = sinStock ? 'Sin stock' : `Stock: ${p.stock}`;

        return `
        <article class="tarjeta">
            <img src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}" loading="lazy">
            <div class="tarjeta-cuerpo">
                <span class="categoria">${escapar(p.categoria)}</span>
                <h3>${escapar(p.nombre)}</h3>
                <span class="precio">${precioATexto(p.precio)}</span>
                <span class="stock ${sinStock ? 'agotado' : ''}">${textoStock}</span>
                <div class="acciones">
                    <button class="btn-detalle" data-accion="detalle" data-id="${p.id}" type="button">Ver detalle</button>
                    <button class="btn-agregar" data-accion="agregar" data-id="${p.id}" type="button" ${alLimite ? 'disabled' : ''}>
                        ${sinStock ? 'Agotado' : (alLimite ? 'Máximo' : 'Agregar')}
                    </button>
                </div>
            </div>
        </article>`;
    }).join('');
}

// ===== Modal de detalle =====
function renderizarDetalle(id) {
    const p = buscarProducto(id);
    if (!p) return false;

    const enCarrito = carrito[p.id] || 0;
    const sinStock = p.stock === 0;
    const alLimite = enCarrito >= p.stock;

    detalleProducto.innerHTML = `
        <div class="modal-encabezado">
            <span class="categoria">${escapar(p.categoria)} · ${escapar(p.marca)}</span>
            <button class="btn-cerrar" data-cerrar type="button" aria-label="Cerrar">✕</button>
        </div>
        <div class="detalle">
            <img src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}">
            <div>
                <h2>${escapar(p.nombre)}</h2>
                <span class="precio">${precioATexto(p.precio)}</span>
                <p>${escapar(p.descripcion)}</p>
                <ul>${p.especificaciones.map(e => `<li>${escapar(e)}</li>`).join('')}</ul>
                <span class="stock ${sinStock ? 'agotado' : ''}">${sinStock ? 'Sin stock' : `Stock disponible: ${p.stock}`}</span>
                <div class="acciones">
                    <button class="btn-agregar" data-accion="agregar" data-id="${p.id}" type="button" ${alLimite ? 'disabled' : ''}>
                        ${sinStock ? 'Agotado' : (alLimite ? 'Máximo en el carrito' : 'Agregar al carrito')}
                    </button>
                </div>
            </div>
        </div>`;
    return true;
}

function abrirDetalle(id) {
    if (renderizarDetalle(id)) modalProducto.showModal();
}

// ===== Carrito =====
function agregarAlCarrito(id) {
    const p = buscarProducto(id);
    if (!p) return;

    const cantidadActual = carrito[id] || 0;
    if (cantidadActual >= p.stock) {
        mostrarAviso(`No hay más stock de "${p.nombre}"`, true);
        return;
    }

    carrito[id] = cantidadActual + 1;
    guardarCarrito();
    actualizarVistas();
    mostrarAviso(`"${p.nombre}" agregado al carrito`);
}

function cambiarCantidad(id, delta) {
    const p = buscarProducto(id);
    if (!p) return;

    const nueva = (carrito[id] || 0) + delta;
    if (nueva > p.stock) {
        mostrarAviso(`Solo hay ${p.stock} unidades de "${p.nombre}"`, true);
        return;
    }
    if (nueva <= 0) {
        delete carrito[id];
    } else {
        carrito[id] = nueva;
    }
    guardarCarrito();
    actualizarVistas();
}

function quitarDelCarrito(id) {
    delete carrito[id];
    guardarCarrito();
    actualizarVistas();
}

function vaciarCarrito() {
    carrito = {};
    guardarCarrito();
    actualizarVistas();
}

function calcularTotal() {
    return Object.entries(carrito).reduce((suma, [id, cantidad]) => {
        const p = buscarProducto(Number(id));
        return p ? suma + p.precio * cantidad : suma;
    }, 0);
}

function cantidadTotal() {
    return Object.values(carrito).reduce((suma, cantidad) => suma + cantidad, 0);
}

function actualizarContador() {
    contadorCarrito.textContent = cantidadTotal();
}

function renderizarCarrito() {
    const ids = Object.keys(carrito).map(Number);

    if (ids.length === 0) {
        listaCarrito.innerHTML = '<p class="vacio">Tu carrito está vacío.</p>';
        return;
    }

    const items = ids.map(id => {
        const p = buscarProducto(id);
        const cantidad = carrito[id];
        return `
        <div class="item-carrito">
            <img src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}">
            <div>
                <div class="item-nombre">${escapar(p.nombre)}</div>
                <div class="item-precio">${precioATexto(p.precio)} c/u</div>
                <div class="cantidad">
                    <button data-accion="menos" data-id="${p.id}" type="button" aria-label="Quitar una unidad">−</button>
                    <strong>${cantidad}</strong>
                    <button data-accion="mas" data-id="${p.id}" type="button" aria-label="Agregar una unidad" ${cantidad >= p.stock ? 'disabled' : ''}>+</button>
                </div>
                <button class="btn-quitar" data-accion="quitar" data-id="${p.id}" type="button">Quitar</button>
            </div>
            <div class="item-subtotal">${precioATexto(p.precio * cantidad)}</div>
        </div>`;
    }).join('');

    listaCarrito.innerHTML = `
        ${items}
        <div class="total-carrito"><span>Total</span><span id="total">${precioATexto(calcularTotal())}</span></div>
        <div class="pie-carrito">
            <button class="btn-agregar" data-accion="finalizar" type="button">Finalizar compra</button>
            <button class="btn-secundario" data-accion="vaciar" type="button">Vaciar</button>
        </div>`;
}

// Refresca todo lo que depende del carrito
function actualizarVistas() {
    actualizarContador();
    renderizarCatalogo();
    renderizarCarrito();
    if (modalProducto.open) {
        const id = Number(detalleProducto.querySelector('[data-accion="agregar"]')?.dataset.id);
        if (id) renderizarDetalle(id);
    }
}

// ===== Persistencia (el carrito sobrevive si se recarga la página) =====
function guardarCarrito() {
    try {
        localStorage.setItem('techshop-carrito', JSON.stringify(carrito));
    } catch (e) { /* si el navegador no deja guardar, el carrito funciona igual */ }
}

function cargarCarritoGuardado() {
    try {
        const guardado = JSON.parse(localStorage.getItem('techshop-carrito')) || {};
        carrito = {};
        // Se descartan productos que ya no existen y se respeta el stock actual
        for (const [id, cantidad] of Object.entries(guardado)) {
            const p = buscarProducto(Number(id));
            if (p && cantidad > 0 && p.stock > 0) {
                carrito[id] = Math.min(cantidad, p.stock);
            }
        }
    } catch (e) {
        carrito = {};
    }
}

// ===== Eventos =====
[buscador, precioMin, precioMax].forEach(el => el.addEventListener('input', renderizarCatalogo));
[filtroCategoria, filtroMarca, orden].forEach(el => el.addEventListener('change', renderizarCatalogo));

btnLimpiar.addEventListener('click', () => {
    buscador.value = '';
    filtroCategoria.value = '';
    filtroMarca.value = '';
    precioMin.value = '';
    precioMax.value = '';
    orden.value = '';
    renderizarCatalogo();
});

btnCarrito.addEventListener('click', () => {
    renderizarCarrito();
    modalCarrito.showModal();
});

// Un solo manejador para todos los botones (delegación de eventos)
document.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-accion], [data-cerrar]');

    if (boton && boton.hasAttribute('data-cerrar')) {
        boton.closest('dialog').close();
        return;
    }

    if (boton) {
        const id = Number(boton.dataset.id);
        switch (boton.dataset.accion) {
            case 'detalle':   abrirDetalle(id); break;
            case 'agregar':   agregarAlCarrito(id); break;
            case 'mas':       cambiarCantidad(id, 1); break;
            case 'menos':     cambiarCantidad(id, -1); break;
            case 'quitar':    quitarDelCarrito(id); break;
            case 'vaciar':    vaciarCarrito(); break;
            case 'finalizar':
                mostrarAviso(`¡Gracias por tu compra! Total: ${precioATexto(calcularTotal())}`);
                vaciarCarrito();
                modalCarrito.close();
                break;
        }
        return;
    }

    // Clic en el fondo oscuro: cerrar el modal abierto
    if (e.target instanceof HTMLDialogElement) e.target.close();
});

cargarProductos();
