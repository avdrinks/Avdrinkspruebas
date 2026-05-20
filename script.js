const URL_API = "https://script.google.com/macros/s/AKfycby5myZ0i9IGHpsKkt4kUmA3SIi5c_BCrCUX4vCDBvq1MHGhmUmEfhclU5jgqUisb4gH/exec";

let productos = [];
let carrito = [];
let tipoEntrega = null;
let ubicacionLink = "";

// =========================
// CARGAR PRODUCTOS
// =========================
async function cargarProductos() {
    try {
        const res = await fetch(URL_API);
        const data = await res.json();

        productos = data
            .filter(p => p.activo === true || p.activo === "TRUE")
            .map(p => ({
                id: Number(p.id),
                nombre: p.nombre,
                precio: Number(p.precio),
                img: p.img,
                // Si la categoría no existe en el Excel, va a "unidades" por defecto
                categoria: p.categoria ? p.categoria.toLowerCase().trim() : "unidades"
            }));

        renderProductos();

    } catch (error) {
        console.error("Error:", error);
        alert("Error cargando el catálogo de AV Drinks");
    }
}

// =========================
// RENDER (4 CATEGORÍAS)
// =========================
function renderProductos() {
    // Definimos las 4 categorías que tiene tu HTML
    const categorias = ['promos', 'unidades', 'snacks', 'cigarros'];
    
    categorias.forEach(cat => {
        const listaContenedor = document.getElementById(`lista-${cat}`);
        if (!listaContenedor) return;

        listaContenedor.innerHTML = ""; 

        const filtrados = productos.filter(p => p.categoria === cat);

        filtrados.forEach(prod => {
            const div = document.createElement("div");
            div.classList.add("tarjeta-producto");

            const cantActual = carrito.filter(item => item.id === prod.id).length;

            div.innerHTML = `
                <div class="contenedor-imagen">
                    <img src="${prod.img}" alt="${prod.nombre}" onerror="this.src='img/placeholder.png'">
                </div>
                <h3>${prod.nombre}</h3>
                <p>$${prod.precio}</p>

                <div class="contador">
                    <button onclick="event.stopPropagation(); restar(${prod.id})">-</button>
                    <span id="cant-${prod.id}">${cantActual}</span>
                    <button onclick="event.stopPropagation(); sumar(${prod.id})">+</button>
                </div>
            `;
            listaContenedor.appendChild(div);
        });
    });
}

// =========================
// LÓGICA ACORDEÓN
// =========================
function toggleCategoria(cat) {
    const lista = document.getElementById(`lista-${cat}`);
    const flecha = document.getElementById(`flecha-${cat}`);
    const estaAbierto = lista.style.display === "grid";

    // Cerramos todo primero para que solo haya uno abierto a la vez
    document.querySelectorAll('.contenido-cat').forEach(el => el.style.display = "none");
    document.querySelectorAll('.flecha').forEach(el => el.innerText = "▶");

    if (!estaAbierto) {
        lista.style.display = "grid";
        flecha.innerText = "▼";
        // Pequeño delay para que el scroll sea fluido después de que aparezca el contenido
        setTimeout(() => {
            lista.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }
}

// =========================
// CARRITO
// =========================
function sumar(id) {
    const prod = productos.find(p => p.id === id);
    if (prod) {
        carrito.push(prod);
        actualizarInterfaz(id);
    }
}

function restar(id) {
    const index = carrito.findLastIndex(p => p.id === id);
    if (index !== -1) {
        carrito.splice(index, 1);
        actualizarInterfaz(id);
    }
}

function actualizarInterfaz(id) {
    const span = document.getElementById(`cant-${id}`);
    const cantTotal = document.getElementById("contador-productos");
    const cantidadProducto = carrito.filter(p => p.id === id).length;
    
    if (span) span.innerText = cantidadProducto;
    if (cantTotal) cantTotal.innerText = carrito.length;
}

// =========================
// ENTREGA Y UBICACIÓN
// =========================
function seleccionarEntrega(tipo) {
    tipoEntrega = tipo;
    const btnRetiro = document.getElementById("btn-retiro");
    const btnDelivery = document.getElementById("btn-delivery");
    const campo = document.getElementById("campo-direccion");

    btnRetiro.classList.remove("activo");
    btnDelivery.classList.remove("activo");

    if (tipo === "retiro") {
        btnRetiro.classList.add("activo");
        campo.style.display = "none";
        ubicacionLink = "";
    } else {
        btnDelivery.classList.add("activo");
        campo.style.display = "block";
    }
}

function usarUbicacion() {
    const btnUbi = document.querySelector(".btn-ubicacion");
    btnUbi.innerHTML = "⏳ Obteniendo...";

    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // FIX: Formato de link universal y correcto para Google Maps
        ubicacionLink = `https://maps.google.com/?q=${lat},${lon}`;
        
        btnUbi.innerHTML = "📍 Ubicación Cargada ✔";
        btnUbi.classList.add("activo");
    }, () => {
        btnUbi.innerHTML = "📍 Reintentar";
        alert("No se pudo obtener ubicación. Escribila manualmente.");
    });
}

// =========================
// WHATSAPP
// =========================
function enviarPedido() {
    if (carrito.length === 0) return alert("¡Tu carrito está vacío!");
    if (!tipoEntrega) return alert("Seleccioná un método de entrega.");

    let mensaje = "🚀 *NUEVO PEDIDO - AV DRINKS*%0A%0A";
    const resumen = {};
    let total = 0;

    carrito.forEach(p => {
        resumen[p.nombre] = (resumen[p.nombre] || 0) + 1;
        total += p.precio;
    });

    for (let nombre in resumen) {
        mensaje += `• *${resumen[nombre]}x* ${nombre}%0A`;
    }

    mensaje += `%0A💰 *TOTAL: $${total}*%0A`;
    mensaje += `────────────────────%0A`;

    if (tipoEntrega === "delivery") {
        const direccion = document.getElementById("direccion").value;
        mensaje += "🛵 *MODO:* Delivery%0A";
        if (ubicacionLink) {
            mensaje += `📍 *Ubicación:* ${ubicacionLink}%0A`;
        } else if (direccion.trim() !== "") {
            mensaje += `🏠 *Dirección:* ${direccion}%0A`;
        } else {
            return alert("Falta tu dirección o ubicación.");
        }
    } else {
        mensaje += "🏠 *MODO:* Retiro en local%0A";
    }

    // FIX: Quitamos el '9' para evitar bloqueos de la API de WhatsApp en Argentina
    window.open(`https://wa.me/542634351883?text=${mensaje}`, "_blank");
}

cargarProductos();
