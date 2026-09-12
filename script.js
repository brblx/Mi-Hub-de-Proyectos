let db;
let filtroActual = 'todos';

// 1. Alternar Tema Claro / Oscuro
const themeBtn = document.getElementById('btn-theme-toggle');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  themeBtn.textContent = isLight ? '☀️ Tema' : '🌙 Tema';
  localStorage.setItem('theme_preference', isLight ? 'light' : 'dark');
});

if (localStorage.getItem('theme_preference') === 'light') {
  document.body.classList.add('light-theme');
  themeBtn.textContent = '☀️ Tema';
}

// 2. Swiper Inicialización (CORREGIDO: Máximo 2 imágenes en pantalla grande)
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('swiper-wrapper');
  const imagenes = [
    "images/1.png",
    "images/2.png",
    "images/3.png",
    "images/4.png"
  ];
  imagenes.forEach(url => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.innerHTML = `<img src="${url}">`;
    wrapper.appendChild(slide);
  });

  new Swiper('.mi-carrusel', {
    loop: true,
    speed: 600,
    autoplay: { delay: 2500, disableOnInteraction: false },
    keyboard: { enabled: true },
    mousewheel: true,
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    pagination: { el: '.swiper-pagination', type: 'progressbar' },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 10
      },
      768: {
        slidesPerView: 2,
        spaceBetween: 20
      }
    }
  });
});

// 3. Inicializar IndexedDB (Versión 4 con Favoritos)
const request = indexedDB.open('ProyectosCompletosDB', 4);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  if (!db.objectStoreNames.contains('proyectos')) {
    db.createObjectStore('proyectos', { keyPath: 'id', autoIncrement: true });
  }
};

request.onsuccess = (e) => {
  db = e.target.result;
  cargarProyectos();
  actualizarEstadisticas();
};

// 4. Agregar Campos Dinámicos para Archivos
document.getElementById('btn-add-file').addEventListener('click', () => agregarCampoArchivoExtra());

function agregarCampoArchivoExtra(nombre = '', contenido = '', esImagen = false) {
  const container = document.getElementById('extra-files-container');
  const fileCard = document.createElement('div');
  fileCard.className = 'extra-file-card';
  fileCard.innerHTML = `
    <div class="extra-file-header">
      <input type="text" class="extra-file-name" placeholder="Ruta/Nombre (ej: img/hero.png o Player.cs)" value="${nombre}" required>
      <div class="file-type-selector">
        <select class="extra-file-type" onchange="cambiarTipoEntrada(this)">
          <option value="texto" ${!esImagen ? 'selected' : ''}>Código / Texto</option>
          <option value="imagen" ${esImagen ? 'selected' : ''}>Imagen</option>
        </select>
      </div>
      <button type="button" class="btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="this.closest('.extra-file-card').remove()">Eliminar</button>
    </div>
    <div class="extra-file-body">
      <textarea class="extra-file-content" rows="3" style="display: ${esImagen ? 'none' : 'block'};">${!esImagen ? contenido : ''}</textarea>
      <div class="image-input-container" style="display: ${esImagen ? 'block' : 'none'};">
        <input type="file" accept="image/*" onchange="previsualizarImagen(this)">
        <img class="img-preview" src="${esImagen ? contenido : ''}" style="display: ${esImagen && contenido ? 'block' : 'none'}; max-width:80px; margin-top:5px;">
      </div>
    </div>
  `;
  container.appendChild(fileCard);
}

function cambiarTipoEntrada(select) {
  const card = select.closest('.extra-file-card');
  card.querySelector('.extra-file-content').style.display = select.value === 'imagen' ? 'none' : 'block';
  card.querySelector('.image-input-container').style.display = select.value === 'imagen' ? 'block' : 'none';
}

function previsualizarImagen(input) {
  const file = input.files[0];
  const card = input.closest('.extra-file-card');
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = card.querySelector('.img-preview');
      img.src = e.target.result;
      img.style.display = 'block';
      card.setAttribute('data-image-base64', e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

// 5. Formulario Guardar / Editar Proyecto
document.getElementById('form-proyecto').addEventListener('submit', (e) => {
  e.preventDefault();
  const editId = document.getElementById('edit-proyecto-id').value;

  const extraFiles = [];
  document.querySelectorAll('.extra-file-card').forEach(card => {
    const nombre = card.querySelector('.extra-file-name').value.trim();
    const tipo = card.querySelector('.extra-file-type').value;

    if (nombre) {
      if (tipo === 'imagen') {
        const base64 = card.getAttribute('data-image-base64') || card.querySelector('.img-preview').src;
        if (base64) extraFiles.push({ nombre, contenido: base64, esImagen: true });
      } else {
        extraFiles.push({ nombre, contenido: card.querySelector('.extra-file-content').value, esImagen: false });
      }
    }
  });

  const datosProyecto = {
    titulo: document.getElementById('titulo').value,
    lenguaje: document.getElementById('lenguaje').value,
    descripcion: document.getElementById('descripcion').value,
    codigoHTML: document.getElementById('codigo-html').value,
    codigoCSS: document.getElementById('codigo-css').value,
    codigoJS: document.getElementById('codigo-js').value,
    archivosExtra: extraFiles,
    favorito: false
  };

  const tx = db.transaction(['proyectos'], 'readwrite');
  const store = tx.objectStore('proyectos');

  if (editId) {
    datosProyecto.id = parseInt(editId);
    store.put(datosProyecto);
  } else {
    store.add(datosProyecto);
  }

  tx.oncomplete = () => {
    cancelarEdicion();
    cargarProyectos();
    actualizarEstadisticas();
  };
});

function cargarParaEditar(id) {
  const tx = db.transaction(['proyectos'], 'readonly');
  tx.objectStore('proyectos').get(id).onsuccess = (e) => {
    const p = e.target.result;
    document.getElementById('edit-proyecto-id').value = p.id;
    document.getElementById('titulo').value = p.titulo;
    document.getElementById('lenguaje').value = p.lenguaje;
    document.getElementById('descripcion').value = p.descripcion;
    document.getElementById('codigo-html').value = p.codigoHTML || '';
    document.getElementById('codigo-css').value = p.codigoCSS || '';
    document.getElementById('codigo-js').value = p.codigoJS || '';
    
    document.getElementById('extra-files-container').innerHTML = '';
    if (p.archivosExtra) {
      p.archivosExtra.forEach(f => agregarCampoArchivoExtra(f.nombre, f.contenido, f.esImagen));
    }

    document.getElementById('form-title').textContent = '✏️ Editar Proyecto';
    document.getElementById('btn-submit-form').textContent = 'Actualizar Proyecto';
    document.getElementById('btn-cancel-edit').style.display = 'block';
    window.scrollTo({ top: document.querySelector('.form-card').offsetTop - 20, behavior: 'smooth' });
  };
}

function cancelarEdicion() {
  document.getElementById('form-proyecto').reset();
  document.getElementById('edit-proyecto-id').value = '';
  document.getElementById('extra-files-container').innerHTML = '';
  document.getElementById('form-title').textContent = '📌 Registrar Nuevo Proyecto';
  document.getElementById('btn-submit-form').textContent = 'Guardar Proyecto en BD';
  document.getElementById('btn-cancel-edit').style.display = 'none';
}

// 6. Cargar y Filtrar Proyectos
function cargarProyectos() {
  const contenedor = document.getElementById('contenedor-proyectos');
  contenedor.innerHTML = '';

  const tx = db.transaction(['proyectos'], 'readonly');
  tx.objectStore('proyectos').getAll().onsuccess = (e) => {
    let proyectos = e.target.result;

    if (filtroActual === 'favoritos') proyectos = proyectos.filter(p => p.favorito);
    else if (filtroActual === 'web') proyectos = proyectos.filter(p => p.lenguaje.toLowerCase().includes('html') || p.lenguaje.toLowerCase().includes('js'));
    else if (filtroActual === 'unity') proyectos = proyectos.filter(p => p.lenguaje.toLowerCase().includes('c#') || p.lenguaje.toLowerCase().includes('unity'));

    proyectos.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <button class="card-favorite-btn ${p.favorito ? 'active' : ''}" onclick="toggleFavorito(${p.id})">★</button>
        <div class="card-body">
          <h3>${p.titulo}</h3>
          <p>${p.descripcion.substring(0, 100)}...</p>
          <span class="tag">${p.lenguaje}</span>
        </div>
        <div class="card-actions">
          <button class="btn-ver" onclick="abrirModal(${p.id})">Explorar</button>
          <button class="btn-editar" onclick="cargarParaEditar(${p.id})">✏️</button>
          <button class="btn-descargar" onclick="descargarProyectoArchivos(${p.id})">📦 ZIP</button>
          <button class="btn-eliminar" onclick="eliminarProyecto(${p.id})">🗑️</button>
        </div>
      `;
      contenedor.appendChild(card);
    });
  };
}

function toggleFavorito(id) {
  const tx = db.transaction(['proyectos'], 'readwrite');
  const store = tx.objectStore('proyectos');
  store.get(id).onsuccess = (e) => {
    const p = e.target.result;
    p.favorito = !p.favorito;
    store.put(p);
    tx.oncomplete = () => cargarProyectos();
  };
}

function filtrarProyectos(tipo) {
  filtroActual = tipo;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  cargarProyectos();
}

// 7. Drag & Drop y Subida Masiva (.ZIP / Carpetas)
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) procesarArchivosImportados(files);
});

document.getElementById('input-zip-file').addEventListener('change', (e) => procesarArchivosImportados(e.target.files));
document.getElementById('input-folder').addEventListener('change', (e) => procesarArchivosImportados(e.target.files));

function procesarArchivosImportados(files) {
  const file = files[0];
  if (file.name.endsWith('.zip')) {
    JSZip.loadAsync(file).then(zip => {
      const nuevoProy = { titulo: file.name.replace('.zip', ''), lenguaje: 'ZIP Importado', descripcion: 'Importado de ZIP', archivosExtra: [] };
      const promesas = [];

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          promesas.push(zipEntry.async('string').then(content => {
            if (relativePath === 'index.html') nuevoProy.codigoHTML = content;
            else if (relativePath === 'styles.css') nuevoProy.codigoCSS = content;
            else if (relativePath === 'script.js') nuevoProy.codigoJS = content;
            else nuevoProy.archivosExtra.push({ nombre: relativePath, contenido: content, esImagen: false });
          }));
        }
      });

      Promise.all(promesas).then(() => guardarProyectoDirecto(nuevoProy));
    });
  } else {
    const nuevoProy = { titulo: files[0].webkitRelativePath.split('/')[0] || 'Carpeta Importada', lenguaje: 'Carpeta Importada', descripcion: 'Importado desde directorio', archivosExtra: [] };
    const promesas = Array.from(files).map(f => {
      return f.text().then(text => {
        const relPath = f.webkitRelativePath.substring(f.webkitRelativePath.indexOf('/') + 1);
        if (relPath === 'index.html') nuevoProy.codigoHTML = text;
        else if (relPath === 'styles.css') nuevoProy.codigoCSS = text;
        else if (relPath === 'script.js') nuevoProy.codigoJS = text;
        else nuevoProy.archivosExtra.push({ nombre: relPath, contenido: text, esImagen: false });
      });
    });

    Promise.all(promesas).then(() => guardarProyectoDirecto(nuevoProy));
  }
}

function guardarProyectoDirecto(proy) {
  const tx = db.transaction(['proyectos'], 'readwrite');
  tx.objectStore('proyectos').add(proy);
  tx.oncomplete = () => { cargarProyectos(); actualizarEstadisticas(); alert('¡Proyecto importado con éxito!'); };
}

// 8. Resaltado de Código Prism.js y Generación de README
function abrirModal(id) {
  const tx = db.transaction(['proyectos'], 'readonly');
  tx.objectStore('proyectos').get(id).onsuccess = (e) => {
    const p = e.target.result;
    document.getElementById('modal-titulo').textContent = p.titulo;
    document.getElementById('modal-lenguaje').textContent = p.lenguaje;
    document.getElementById('modal-descripcion').textContent = p.descripcion;

    const tabsHeader = document.getElementById('modal-tabs-header');
    const tabsBody = document.getElementById('modal-tabs-body');

    tabsHeader.innerHTML = `
      <button class="tab-btn active" onclick="cambiarTab('tab-preview')">🖥️ Demo</button>
      <button class="tab-btn" onclick="cambiarTab('tab-readme')">📝 README.md</button>
      <button class="tab-btn" onclick="cambiarTab('tab-html')">📄 HTML</button>
      <button class="tab-btn" onclick="cambiarTab('tab-css')">🎨 CSS</button>
      <button class="tab-btn" onclick="cambiarTab('tab-js')">⚡ JS / C#</button>
    `;

    tabsBody.innerHTML = `
      <div id="tab-preview" class="tab-content active"><iframe id="iframe-demo"></iframe></div>
      <div id="tab-readme" class="tab-content">
        <button class="btn-copy-code" onclick="copiarCodigoTexto(this, \`# ${p.titulo}\\n\\n${p.descripcion}\\n\\n## Lenguaje\\n${p.lenguaje}\`)">📋 Copiar README</button>
        <div class="readme-container"><h1>${p.titulo}</h1><p>${p.descripcion}</p><hr><p><strong>Tecnologías:</strong> ${p.lenguaje}</p></div>
      </div>
      <div id="tab-html" class="tab-content">
        <button class="btn-copy-code" onclick="copiarCodigoTexto(this, \`${escapeQuotes(p.codigoHTML)}\`)">📋 Copiar</button>
        <pre><code class="language-html">${escapeHTML(p.codigoHTML || '')}</code></pre>
      </div>
      <div id="tab-css" class="tab-content">
        <button class="btn-copy-code" onclick="copiarCodigoTexto(this, \`${escapeQuotes(p.codigoCSS)}\`)">📋 Copiar</button>
        <pre><code class="language-css">${escapeHTML(p.codigoCSS || '')}</code></pre>
      </div>
      <div id="tab-js" class="tab-content">
        <button class="btn-copy-code" onclick="copiarCodigoTexto(this, \`${escapeQuotes(p.codigoJS)}\`)">📋 Copiar</button>
        <pre><code class="language-javascript">${escapeHTML(p.codigoJS || '')}</code></pre>
      </div>
    `;

    if (p.archivosExtra) {
      p.archivosExtra.forEach((f, idx) => {
        const tid = `tab-ext-${idx}`;
        tabsHeader.innerHTML += `<button class="tab-btn" onclick="cambiarTab('${tid}')">${f.esImagen ? '🖼️' : '📁'} ${f.nombre}</button>`;
        tabsBody.innerHTML += `
          <div id="${tid}" class="tab-content">
            ${f.esImagen ? `<img src="${f.contenido}" class="modal-img-view">` : `
              <button class="btn-copy-code" onclick="copiarCodigoTexto(this, \`${escapeQuotes(f.contenido)}\`)">📋 Copiar</button>
              <pre><code class="language-clike">${escapeHTML(f.contenido)}</code></pre>
            `}
          </div>
        `;
      });
    }

    const iframe = document.getElementById('iframe-demo');
    iframe.srcdoc = `<html><head><style>${p.codigoCSS||''}</style></head><body>${p.codigoHTML||''}<script>${p.codigoJS||''}</script></body></html>`;

    document.getElementById('modal-proyecto').style.display = 'flex';
    Prism.highlightAll();
  };
}

function copiarCodigoTexto(btn, texto) {
  navigator.clipboard.writeText(texto);
  const orig = btn.textContent;
  btn.textContent = '✅ Copiado';
  setTimeout(() => btn.textContent = orig, 1500);
}

function escapeHTML(str) { return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)); }
function escapeQuotes(str) { return (str || '').replace(/`/g, '\\`').replace(/\$/g, '\\$'); }

function cerrarModal() { document.getElementById('modal-proyecto').style.display = 'none'; }
function cambiarTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.target.classList.add('active');
}

// 9. Descargar Proyecto como .ZIP
function descargarProyectoArchivos(id) {
  const tx = db.transaction(['proyectos'], 'readonly');
  tx.objectStore('proyectos').get(id).onsuccess = (e) => {
    const p = e.target.result;
    const zip = new JSZip();

    let html = p.codigoHTML || "";
    if (html && !html.includes('styles.css')) html = `<link rel="stylesheet" href="styles.css">\n` + html;
    if (html && !html.includes('script.js')) html = html + `\n<script src="script.js"></script>`;

    if (p.codigoHTML) zip.file("index.html", html);
    if (p.codigoCSS) zip.file("styles.css", p.codigoCSS);
    if (p.codigoJS) zip.file("script.js", p.codigoJS);

    if (p.archivosExtra && Array.isArray(p.archivosExtra)) {
      p.archivosExtra.forEach(file => {
        if (file.esImagen) {
          const base64Data = file.contenido.split(',')[1];
          if (base64Data) zip.file(file.nombre, base64Data, { base64: true });
        } else {
          zip.file(file.nombre, file.contenido);
        }
      });
    }

    zip.generateAsync({ type: "blob" }).then((content) => {
      const nombreLimpio = p.titulo.toLowerCase().replace(/[^a-z0-9]/g, "_");
      saveAs(content, `${nombreLimpio}_proyecto.zip`);
    });
  };
}

// 10. Respaldos y Estadísticas Globales
document.getElementById('btn-export-db').addEventListener('click', () => {
  const tx = db.transaction(['proyectos'], 'readonly');
  tx.objectStore('proyectos').getAll().onsuccess = (e) => {
    const blob = new Blob([JSON.stringify(e.target.result, null, 2)], { type: 'application/json' });
    saveAs(blob, `backup_proyectos_${Date.now()}.json`);
  };
});

document.getElementById('import-db-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = JSON.parse(ev.target.result);
      const tx = db.transaction(['proyectos'], 'readwrite');
      const store = tx.objectStore('proyectos');
      data.forEach(item => { delete item.id; store.add(item); });
      tx.oncomplete = () => { cargarProyectos(); actualizarEstadisticas(); alert('¡Base de Datos Importada!'); };
    };
    reader.readAsText(file);
  }
});

function actualizarEstadisticas() {
  const tx = db.transaction(['proyectos'], 'readonly');
  tx.objectStore('proyectos').getAll().onsuccess = (e) => {
    const proys = e.target.result;
    document.getElementById('stat-total').textContent = proys.length;

    let totalArchivos = 0;
    proys.forEach(p => {
      if (p.codigoHTML) totalArchivos++;
      if (p.codigoCSS) totalArchivos++;
      if (p.codigoJS) totalArchivos++;
      if (p.archivosExtra) totalArchivos += p.archivosExtra.length;
    });
    document.getElementById('stat-archivos').textContent = totalArchivos;

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(est => {
        const mb = (est.usage / (1024 * 1024)).toFixed(2);
        document.getElementById('stat-espacio').textContent = `${mb} MB`;
      });
    }
  };
}

function eliminarProyecto(id) {
  if (confirm('¿Eliminar este proyecto?')) {
    const tx = db.transaction(['proyectos'], 'readwrite');
    tx.objectStore('proyectos').delete(id);
    tx.oncomplete = () => { cargarProyectos(); actualizarEstadisticas(); };
  }
}

// 11. Buscador en Tiempo Real
document.getElementById('buscador').addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase();
  const tx = db.transaction(['proyectos'], 'readonly');
  tx.objectStore('proyectos').getAll().onsuccess = (ev) => {
    const filtrados = ev.target.result.filter(p =>
      p.titulo.toLowerCase().includes(texto) ||
      p.lenguaje.toLowerCase().includes(texto) ||
      p.descripcion.toLowerCase().includes(texto)
    );

    const contenedor = document.getElementById('contenedor-proyectos');
    contenedor.innerHTML = '';
    filtrados.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <button class="card-favorite-btn ${p.favorito ? 'active' : ''}" onclick="toggleFavorito(${p.id})">★</button>
        <div class="card-body">
          <h3>${p.titulo}</h3>
          <p>${p.descripcion.substring(0, 100)}...</p>
          <span class="tag">${p.lenguaje}</span>
        </div>
        <div class="card-actions">
          <button class="btn-ver" onclick="abrirModal(${p.id})">Explorar</button>
          <button class="btn-editar" onclick="cargarParaEditar(${p.id})">✏️</button>
          <button class="btn-descargar" onclick="descargarProyectoArchivos(${p.id})">📦 ZIP</button>
          <button class="btn-eliminar" onclick="eliminarProyecto(${p.id})">🗑️</button>
        </div>
      `;
      contenedor.appendChild(card);
    });
  };
});