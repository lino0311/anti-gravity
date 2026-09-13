/*
 * app.js — interface do Precifica+ (usa as funções puras de calc.js)
 * Sem dependências externas, sem servidor. Dados salvos no localStorage do navegador.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "precificaMaisData";
  var LOGO_KEY = "precificaMaisLogo";
  var TEMA_KEY = "precificaMaisTema";

  // ------------------------------------------------------------------- //
  // Utilidades gerais
  // ------------------------------------------------------------------- //

  function gerarId() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function escapeXml(str) {
    return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function baixarArquivo(conteudo, nomeArquivo, tipoMime) {
    var blob = new Blob([conteudo], { type: tipoMime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function dataParaArquivo() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }

  // ------------------------------------------------------------------- //
  // Toasts e modal de confirmação
  // ------------------------------------------------------------------- //

  function mostrarToast(msg, tipo) {
    var container = document.getElementById("toasts");
    var div = document.createElement("div");
    div.className = "toast" + (tipo === "erro" ? " erro" : "");
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(function () { div.remove(); }, 3200);
  }

  var modalConfirmCallback = null;

  function abrirModal(titulo, texto, onConfirm) {
    document.getElementById("modal-titulo").textContent = titulo;
    document.getElementById("modal-texto").textContent = texto;
    modalConfirmCallback = onConfirm;
    document.getElementById("modal-confirmar").classList.add("ativo");
    document.getElementById("modal-confirmar-btn").focus();
  }

  function fecharModal() {
    document.getElementById("modal-confirmar").classList.remove("ativo");
    modalConfirmCallback = null;
  }

  // ------------------------------------------------------------------- //
  // Estado (persistido em localStorage)
  // ------------------------------------------------------------------- //

  function estadoPadrao() {
    return {
      ingredientes: [],
      pratos: [],
      config: { lucroPct: 20, taxaCartaoPct: 4, impostosPct: 6, outrosPct: 0 },
      custosFixos: [],
      faturamento: [],
    };
  }

  function carregarEstado() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return estadoPadrao();
      var dados = JSON.parse(raw);
      var base = estadoPadrao();
      return {
        ingredientes: Array.isArray(dados.ingredientes) ? dados.ingredientes : [],
        pratos: Array.isArray(dados.pratos) ? dados.pratos : [],
        config: Object.assign(base.config, dados.config || {}),
        custosFixos: Array.isArray(dados.custosFixos) ? dados.custosFixos : [],
        faturamento: Array.isArray(dados.faturamento) ? dados.faturamento : [],
      };
    } catch (e) {
      console.error("Não foi possível ler os dados salvos, iniciando do zero.", e);
      return estadoPadrao();
    }
  }

  function salvarEstado() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      mostrarToast("Não foi possível salvar (armazenamento cheio ou bloqueado pelo navegador).", "erro");
    }
  }

  var state = carregarEstado();
  var vistaAtual = "ingredientes";
  var pratoAtualId = null;

  // ------------------------------------------------------------------- //
  // TEMA CLARO / ESCURO
  // ------------------------------------------------------------------- //

  function inicializarTema() {
    var salvo = localStorage.getItem(TEMA_KEY);
    var prefereDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = salvo ? salvo === "dark" : prefereDark;
    document.documentElement.classList.toggle("dark", dark);
    atualizarIconeTema();
  }

  function alternarTema() {
    var isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem(TEMA_KEY, isDark ? "dark" : "light");
    atualizarIconeTema();
  }

  function atualizarIconeTema() {
    var isDark = document.documentElement.classList.contains("dark");
    document.getElementById("tema-icone").textContent = isDark ? "🌙" : "☀️";
  }

  document.getElementById("btn-tema").addEventListener("click", alternarTema);

  // ------------------------------------------------------------------- //
  // LOGO / BRANDING
  // ------------------------------------------------------------------- //

  function carregarLogo() {
    var logoData = localStorage.getItem(LOGO_KEY);
    var imgHeader = document.getElementById("logo-empresa");
    var imgPreview = document.getElementById("preview-logo");
    var placeholder = document.getElementById("branding-placeholder");
    var btnRemover = document.getElementById("btn-remover-logo");

    if (logoData) {
      imgHeader.src = logoData;
      imgHeader.style.display = "";
      if (imgPreview) { imgPreview.src = logoData; imgPreview.style.display = ""; }
      if (placeholder) placeholder.style.display = "none";
      if (btnRemover) btnRemover.style.display = "";
    } else {
      imgHeader.src = "";
      imgHeader.style.display = "none";
      if (imgPreview) { imgPreview.src = ""; imgPreview.style.display = "none"; }
      if (placeholder) placeholder.style.display = "";
      if (btnRemover) btnRemover.style.display = "none";
    }
  }

  document.getElementById("upload-logo").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      mostrarToast("Selecione um arquivo de imagem válido.", "erro");
      return;
    }
    if (file.size > 500000) {
      mostrarToast("Imagem muito grande (máx. 500 KB). Tente uma imagem menor.", "erro");
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      localStorage.setItem(LOGO_KEY, ev.target.result);
      carregarLogo();
      mostrarToast("Logo salva com sucesso.");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("btn-remover-logo").addEventListener("click", function () {
    abrirModal("Remover logo", "Deseja remover a logo da empresa?", function () {
      localStorage.removeItem(LOGO_KEY);
      carregarLogo();
      mostrarToast("Logo removida.");
    });
  });

  // ------------------------------------------------------------------- //
  // Cálculo de resumo de um prato (usa Calc)
  // ------------------------------------------------------------------- //

  function calcularResumoPrato(prato) {
    var itensComIngrediente = prato.itens.map(function (item) {
      return { item: item, ingrediente: state.ingredientes.find(function (i) { return i.id === item.ingredienteId; }) };
    });
    var custoDireto = Calc.custoDiretoPrato(itensComIngrediente);
    var r = Calc.calcularPreco(custoDireto, state.config);
    var precoFinal = prato.precoManual != null && !isNaN(prato.precoManual) ? prato.precoManual : r.preco || 0;
    return { custoDireto: custoDireto, precoSugerido: r.preco, precoFinal: precoFinal, valido: r.valido, itensComIngrediente: itensComIngrediente };
  }

  // ------------------------------------------------------------------- //
  // Navegação entre abas
  // ------------------------------------------------------------------- //

  function fecharSidebarMobile() {
    document.getElementById("sidebar").classList.remove("aberta");
    document.getElementById("sidebar-overlay").classList.remove("ativo");
    document.getElementById("btn-menu").setAttribute("aria-expanded", "false");
  }

  function irPara(vista) {
    vistaAtual = vista;
    document.querySelectorAll(".vista").forEach(function (v) { v.classList.remove("ativa"); });
    document.getElementById("vista-" + vista).classList.add("ativa");
    document.querySelectorAll(".sidebar-item").forEach(function (b) {
      var ativa = b.getAttribute("data-vista") === vista;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
    });
    fecharSidebarMobile();
    if (vista === "ingredientes") renderIngredientes();
    if (vista === "pratos") { mostrarListaPratos(); renderPratosLista(); }
    if (vista === "config") { renderConfig(); carregarLogo(); }
    if (vista === "custosfixos") renderCustosFixos();
    if (vista === "payback") renderPaybackUI();
    if (vista === "faturamento") renderFaturamento();
  }

  // ------------------------------------------------------------------- //
  // MODAL DE EDIÇÃO GENÉRICO
  // ------------------------------------------------------------------- //

  var editarCallback = null;

  function abrirModalEditar(titulo, campos, onSave) {
    document.getElementById("modal-editar-titulo").textContent = titulo;
    var container = document.getElementById("modal-editar-campos");
    container.innerHTML = "";
    campos.forEach(function (c) {
      var div = document.createElement("div");
      div.className = "campo";
      var label = document.createElement("label");
      label.textContent = c.label;
      label.setAttribute("for", "editar-" + c.name);
      div.appendChild(label);
      var input;
      if (c.type === "select") {
        input = document.createElement("select");
        c.options.forEach(function (o) {
          var opt = document.createElement("option");
          opt.value = o.value; opt.textContent = o.text;
          if (o.value === String(c.value)) opt.selected = true;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement("input");
        input.type = c.type || "text";
        input.value = c.value != null ? c.value : "";
        if (c.min != null) input.min = c.min;
        if (c.max != null) input.max = c.max;
        if (c.step != null) input.step = c.step;
        if (c.required) input.required = true;
      }
      input.id = "editar-" + c.name;
      input.name = c.name;
      div.appendChild(input);
      container.appendChild(div);
    });
    editarCallback = onSave;
    document.getElementById("modal-editar").classList.add("ativo");
  }

  function fecharModalEditar() {
    document.getElementById("modal-editar").classList.remove("ativo");
    editarCallback = null;
  }

  document.getElementById("modal-editar-cancelar").addEventListener("click", fecharModalEditar);
  document.getElementById("form-editar").addEventListener("submit", function (e) {
    e.preventDefault();
    if (editarCallback) {
      var form = document.getElementById("form-editar");
      var dados = {};
      var inputs = form.querySelectorAll("input, select");
      inputs.forEach(function (el) {
        dados[el.name] = el.type === "number" ? parseFloat(el.value) : el.value;
      });
      editarCallback(dados);
    }
    fecharModalEditar();
  });

  // ------------------------------------------------------------------- //
  // INGREDIENTES
  // ------------------------------------------------------------------- //

  function renderIngredientes() {
    var lista = document.getElementById("lista-ingredientes");
    var contador = document.getElementById("contador-ingredientes");
    var ordenados = state.ingredientes.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
    contador.textContent = ordenados.length + (ordenados.length === 1 ? " cadastrado" : " cadastrados");

    if (!ordenados.length) {
      lista.innerHTML = '<div class="vazio"><span class="emoji">🥕</span>Nenhum ingrediente cadastrado ainda.</div>';
      return;
    }

    var html = '<div class="tabela-wrap"><table><thead><tr><th>Nome</th><th>Compra</th><th>Custo por unidade</th><th></th></tr></thead><tbody>';
    ordenados.forEach(function (ing) {
      var custoBase = Calc.custoPorUnidadeBase(ing);
      var cat = Calc.categoriaDe(ing.unidadeCompra);
      var rotuloBase = cat === "massa" ? "g" : cat === "volume" ? "ml" : "un";
      html +=
        "<tr>" +
        "<td>" + escapeHtml(ing.nome) + "</td>" +
        "<td>" + ing.qtdEmbalagem + " " + Calc.ROTULOS_UNIDADE[ing.unidadeCompra] + " por " + Calc.formatarMoeda(ing.custoEmbalagem) +
        (ing.perdaPct ? ' <span class="badge alerta">perda ' + ing.perdaPct + "%</span>" : "") +
        "</td>" +
        '<td class="numerico">' + Calc.formatarMoeda(custoBase) + " / " + rotuloBase + "</td>" +
        '<td class="acoes-col">' +
        '<button type="button" class="btn editar pequeno" data-editar-ingrediente="' + ing.id + '" aria-label="Editar ' + escapeHtml(ing.nome) + '">✏️</button>' +
        '<button type="button" class="btn perigo pequeno" data-excluir-ingrediente="' + ing.id + '" aria-label="Excluir ' + escapeHtml(ing.nome) + '">🗑️</button>' +
        "</td></tr>";
    });
    html += "</tbody></table></div>";
    lista.innerHTML = html;
  }

  function limparFormIngrediente() {
    document.getElementById("form-ingrediente").reset();
    document.getElementById("ing-unidade-compra").value = "kg";
    document.getElementById("ing-qtd-embalagem").value = 1;
    document.getElementById("ing-custo-embalagem").value = 0;
    document.getElementById("ing-perda").value = 0;
  }

  document.getElementById("form-ingrediente").addEventListener("submit", function (e) {
    e.preventDefault();
    var nomeEl = document.getElementById("ing-nome");
    var qtdEl = document.getElementById("ing-qtd-embalagem");
    var custoEl = document.getElementById("ing-custo-embalagem");
    var nome = nomeEl.value.trim();
    var unidadeCompra = document.getElementById("ing-unidade-compra").value;
    var qtdEmbalagem = parseFloat(qtdEl.value);
    var custoEmbalagem = parseFloat(custoEl.value);
    var perdaPct = parseFloat(document.getElementById("ing-perda").value) || 0;

    var valido = true;
    if (!nome) { nomeEl.classList.add("campo-invalido"); valido = false; }
    if (isNaN(qtdEmbalagem) || qtdEmbalagem <= 0) { qtdEl.classList.add("campo-invalido"); valido = false; }
    if (isNaN(custoEmbalagem) || custoEmbalagem < 0) { custoEl.classList.add("campo-invalido"); valido = false; }
    if (!valido) { mostrarToast("Preencha os campos obrigatórios corretamente.", "erro"); return; }

    var existente = state.ingredientes.find(function (i) { return i.nome.toLowerCase() === nome.toLowerCase(); });
    if (existente) {
      Object.assign(existente, { unidadeCompra: unidadeCompra, qtdEmbalagem: qtdEmbalagem, custoEmbalagem: custoEmbalagem, perdaPct: perdaPct });
      mostrarToast('Ingrediente "' + nome + '" atualizado.');
    } else {
      state.ingredientes.push({ id: gerarId(), nome: nome, unidadeCompra: unidadeCompra, qtdEmbalagem: qtdEmbalagem, custoEmbalagem: custoEmbalagem, perdaPct: perdaPct });
      mostrarToast('Ingrediente "' + nome + '" adicionado.');
    }
    salvarEstado(); limparFormIngrediente(); renderIngredientes(); nomeEl.focus();
  });

  document.getElementById("lista-ingredientes").addEventListener("click", function (e) {
    // Editar ingrediente
    var btnEdit = e.target.closest("[data-editar-ingrediente]");
    if (btnEdit) {
      var id = btnEdit.getAttribute("data-editar-ingrediente");
      var ing = state.ingredientes.find(function (i) { return i.id === id; });
      if (!ing) return;
      var unidadeOpts = [
        { value: "kg", text: "Quilograma (kg)" }, { value: "g", text: "Grama (g)" },
        { value: "l", text: "Litro (L)" }, { value: "ml", text: "Mililitro (ml)" },
        { value: "un", text: "Unidade (un)" }
      ];
      abrirModalEditar("Editar ingrediente", [
        { name: "nome", label: "Nome", type: "text", value: ing.nome, required: true },
        { name: "unidadeCompra", label: "Unidade de compra", type: "select", value: ing.unidadeCompra, options: unidadeOpts },
        { name: "qtdEmbalagem", label: "Qtd na embalagem", type: "number", value: ing.qtdEmbalagem, min: 0, step: 0.001, required: true },
        { name: "custoEmbalagem", label: "Custo da embalagem (R$)", type: "number", value: ing.custoEmbalagem, min: 0, step: 0.01, required: true },
        { name: "perdaPct", label: "Perda / quebra (%)", type: "number", value: ing.perdaPct || 0, min: 0, max: 95, step: 0.1 },
      ], function (dados) {
        if (!dados.nome || !dados.nome.trim()) { mostrarToast("Nome é obrigatório.", "erro"); return; }
        Object.assign(ing, { nome: dados.nome.trim(), unidadeCompra: dados.unidadeCompra, qtdEmbalagem: dados.qtdEmbalagem, custoEmbalagem: dados.custoEmbalagem, perdaPct: dados.perdaPct || 0 });
        salvarEstado(); renderIngredientes(); mostrarToast("Ingrediente atualizado.");
      });
      return;
    }
    // Excluir ingrediente
    var btnDel = e.target.closest("[data-excluir-ingrediente]");
    if (!btnDel) return;
    var delId = btnDel.getAttribute("data-excluir-ingrediente");
    var ingDel = state.ingredientes.find(function (i) { return i.id === delId; });
    if (!ingDel) return;
    var usados = state.pratos.filter(function (p) { return p.itens.some(function (it) { return it.ingredienteId === delId; }); });
    var aviso = usados.length ? " Ele é usado em " + usados.length + " prato(s) — os itens correspondentes também serão removidos das fichas técnicas." : "";
    abrirModal("Excluir ingrediente", 'Tem certeza que deseja excluir "' + ingDel.nome + '"?' + aviso, function () {
      state.ingredientes = state.ingredientes.filter(function (i) { return i.id !== delId; });
      state.pratos.forEach(function (p) { p.itens = p.itens.filter(function (it) { return it.ingredienteId !== delId; }); });
      salvarEstado(); renderIngredientes(); mostrarToast("Ingrediente excluído.");
    });
  });

  // ------------------------------------------------------------------- //
  // PRATOS — lista
  // ------------------------------------------------------------------- //

  function mostrarListaPratos() {
    document.getElementById("pratos-lista-wrap").style.display = "";
    document.getElementById("prato-detalhe-wrap").style.display = "none";
  }
  function mostrarDetalhePrato() {
    document.getElementById("pratos-lista-wrap").style.display = "none";
    document.getElementById("prato-detalhe-wrap").style.display = "";
  }

  function renderPratosLista() {
    var lista = document.getElementById("lista-pratos");
    var contador = document.getElementById("contador-pratos");
    var ordenados = state.pratos.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
    contador.textContent = ordenados.length + (ordenados.length === 1 ? " cadastrado" : " cadastrados");
    if (!ordenados.length) {
      lista.innerHTML = '<div class="vazio"><span class="emoji">🍽️</span>Nenhum prato cadastrado ainda.</div>';
      return;
    }
    lista.innerHTML = ordenados.map(function (p) {
      var r = calcularResumoPrato(p);
      return '<div class="prato-card" data-abrir-prato="' + p.id + '" tabindex="0" role="button">' +
        '<div class="categoria">' + escapeHtml(p.categoria || "Sem categoria") + "</div>" +
        "<h4>" + escapeHtml(p.nome) + "</h4>" +
        '<div class="precos"><span>Custo <b>' + Calc.formatarMoeda(r.custoDireto) + "</b></span>" +
        "<span>Preço <b>" + Calc.formatarMoeda(r.precoFinal) + "</b></span></div></div>";
    }).join("");
  }

  document.getElementById("lista-pratos").addEventListener("click", function (e) {
    var card = e.target.closest("[data-abrir-prato]");
    if (card) abrirPratoDetalhe(card.getAttribute("data-abrir-prato"));
  });
  document.getElementById("lista-pratos").addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest("[data-abrir-prato]");
    if (!card) return;
    e.preventDefault();
    abrirPratoDetalhe(card.getAttribute("data-abrir-prato"));
  });

  document.getElementById("form-prato").addEventListener("submit", function (e) {
    e.preventDefault();
    var nomeEl = document.getElementById("prato-nome");
    var nome = nomeEl.value.trim();
    var categoria = document.getElementById("prato-categoria").value.trim();
    var mixVendasPct = parseFloat(document.getElementById("prato-mix").value) || 0;
    if (!nome) { nomeEl.classList.add("campo-invalido"); mostrarToast("Informe o nome do prato.", "erro"); return; }
    if (state.pratos.some(function (p) { return p.nome.toLowerCase() === nome.toLowerCase(); })) {
      mostrarToast("Já existe um prato com esse nome.", "erro"); return;
    }
    state.pratos.push({ id: gerarId(), nome: nome, categoria: categoria, mixVendasPct: mixVendasPct, precoManual: null, itens: [] });
    salvarEstado(); document.getElementById("form-prato").reset(); document.getElementById("prato-mix").value = 0;
    renderPratosLista(); mostrarToast('Prato "' + nome + '" criado.');
  });

  // ------------------------------------------------------------------- //
  // PRATOS — ficha técnica (detalhe)
  // ------------------------------------------------------------------- //

  function abrirPratoDetalhe(id) {
    pratoAtualId = id; mostrarDetalhePrato(); popularSelectIngredienteItem(); renderPratoDetalhe();
  }

  function popularSelectIngredienteItem() {
    var sel = document.getElementById("item-ingrediente");
    var ordenados = state.ingredientes.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
    if (!ordenados.length) {
      sel.innerHTML = '<option value="">Cadastre um ingrediente primeiro</option>';
    } else {
      sel.innerHTML = ordenados.map(function (i) { return '<option value="' + i.id + '">' + escapeHtml(i.nome) + "</option>"; }).join("");
    }
    atualizarUnidadesItem();
  }

  function atualizarUnidadesItem() {
    var sel = document.getElementById("item-ingrediente");
    var unidadeSel = document.getElementById("item-unidade");
    var ajuda = document.getElementById("item-unidade-ajuda");
    var ing = state.ingredientes.find(function (i) { return i.id === sel.value; });
    if (!ing) { unidadeSel.innerHTML = ""; ajuda.textContent = ""; return; }
    var compativeis = Calc.unidadesCompativeis(ing.unidadeCompra);
    unidadeSel.innerHTML = compativeis.map(function (u) {
      return '<option value="' + u + '"' + (u === ing.unidadeCompra ? " selected" : "") + ">" + Calc.ROTULOS_UNIDADE[u] + "</option>";
    }).join("");
    ajuda.textContent = "Comprado em " + Calc.ROTULOS_UNIDADE[ing.unidadeCompra] + " — pode usar na receita em: " +
      compativeis.map(function (u) { return Calc.ROTULOS_UNIDADE[u]; }).join(" ou ") + ".";
  }

  document.getElementById("item-ingrediente").addEventListener("change", atualizarUnidadesItem);

  function renderPratoDetalhe() {
    var prato = state.pratos.find(function (p) { return p.id === pratoAtualId; });
    if (!prato) { mostrarListaPratos(); return; }
    document.getElementById("detalhe-prato-nome").textContent = prato.nome;
    var r = calcularResumoPrato(prato);
    var itensDiv = document.getElementById("detalhe-itens");
    if (!prato.itens.length) {
      itensDiv.innerHTML = '<div class="vazio">Nenhum ingrediente adicionado a este prato ainda.</div>';
    } else {
      itensDiv.innerHTML = r.itensComIngrediente.map(function (par) {
        var nomeIng = par.ingrediente ? par.ingrediente.nome : "(ingrediente removido)";
        var custo = par.ingrediente ? Calc.custoItemPrato(par.item, par.ingrediente) : 0;
        return '<div class="item-linha"><span>' + escapeHtml(nomeIng) + " — " + par.item.qtd + " " + (Calc.ROTULOS_UNIDADE[par.item.unidade] || par.item.unidade) +
          '</span><span class="numerico">' + Calc.formatarMoeda(custo) + "</span>" +
          '<button type="button" class="btn perigo pequeno" data-remover-item="' + par.item.id + '" aria-label="Remover ' + escapeHtml(nomeIng) + '">🗑️</button></div>';
      }).join("");
    }
    var cmvPct = r.precoFinal ? (r.custoDireto / r.precoFinal) * 100 : 0;
    document.getElementById("detalhe-metricas").innerHTML =
      '<div class="metrica"><span>Custo direto</span><b>' + Calc.formatarMoeda(r.custoDireto) + "</b></div>" +
      '<div class="metrica"><span>Preço sugerido</span><b>' + (r.valido ? Calc.formatarMoeda(r.precoSugerido) : "—") + "</b></div>" +
      '<div class="metrica"><span>CMV sobre o preço</span><b>' + Calc.formatarPercentual(cmvPct) + "</b></div>";
    document.getElementById("detalhe-alerta").innerHTML = r.valido ? "" :
      '<div class="alerta">A soma de lucro + taxa + impostos + outros ultrapassa 100%. Ajuste em Configurações.</div>';
    document.getElementById("prato-preco-manual").value = r.precoFinal ? r.precoFinal.toFixed(2) : "";
  }

  document.getElementById("form-item-prato").addEventListener("submit", function (e) {
    e.preventDefault();
    var ingredienteId = document.getElementById("item-ingrediente").value;
    var qtdEl = document.getElementById("item-qtd");
    var qtd = parseFloat(qtdEl.value);
    var unidade = document.getElementById("item-unidade").value;
    if (!ingredienteId) { mostrarToast("Cadastre um ingrediente antes de montar a ficha técnica.", "erro"); return; }
    if (isNaN(qtd) || qtd <= 0) { qtdEl.classList.add("campo-invalido"); mostrarToast("Informe uma quantidade válida.", "erro"); return; }
    var prato = state.pratos.find(function (p) { return p.id === pratoAtualId; });
    prato.itens.push({ id: gerarId(), ingredienteId: ingredienteId, qtd: qtd, unidade: unidade });
    salvarEstado(); document.getElementById("form-item-prato").reset(); popularSelectIngredienteItem();
    renderPratoDetalhe(); mostrarToast("Ingrediente adicionado à receita.");
  });

  document.getElementById("detalhe-itens").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remover-item]");
    if (!btn) return;
    var itemId = btn.getAttribute("data-remover-item");
    var prato = state.pratos.find(function (p) { return p.id === pratoAtualId; });
    abrirModal("Remover ingrediente", "Remover este ingrediente da receita?", function () {
      prato.itens = prato.itens.filter(function (it) { return it.id !== itemId; });
      salvarEstado(); renderPratoDetalhe(); mostrarToast("Item removido.");
    });
  });

  document.getElementById("btn-salvar-preco-prato").addEventListener("click", function () {
    var prato = state.pratos.find(function (p) { return p.id === pratoAtualId; });
    var val = parseFloat(document.getElementById("prato-preco-manual").value);
    if (isNaN(val) || val < 0) { mostrarToast("Informe um preço válido.", "erro"); return; }
    prato.precoManual = val; salvarEstado(); renderPratoDetalhe(); mostrarToast("Preço final salvo.");
  });

  document.getElementById("btn-excluir-prato").addEventListener("click", function () {
    var prato = state.pratos.find(function (p) { return p.id === pratoAtualId; });
    if (!prato) return;
    abrirModal("Excluir prato", 'Tem certeza que deseja excluir o prato "' + prato.nome + '"? Essa ação não pode ser desfeita.', function () {
      state.pratos = state.pratos.filter(function (p) { return p.id !== pratoAtualId; });
      salvarEstado(); mostrarListaPratos(); renderPratosLista(); mostrarToast("Prato excluído.");
    });
  });

  document.getElementById("btn-voltar-pratos").addEventListener("click", function () {
    mostrarListaPratos(); renderPratosLista();
  });

  // ------------------------------------------------------------------- //
  // CONFIGURAÇÕES
  // ------------------------------------------------------------------- //

  function renderConfig() {
    document.getElementById("cfg-lucro").value = state.config.lucroPct;
    document.getElementById("cfg-cartao").value = state.config.taxaCartaoPct;
    document.getElementById("cfg-impostos").value = state.config.impostosPct;
    document.getElementById("cfg-outros").value = state.config.outrosPct;
    atualizarSomaConfig();
  }

  function atualizarSomaConfig() {
    var l = parseFloat(document.getElementById("cfg-lucro").value) || 0;
    var c = parseFloat(document.getElementById("cfg-cartao").value) || 0;
    var i = parseFloat(document.getElementById("cfg-impostos").value) || 0;
    var o = parseFloat(document.getElementById("cfg-outros").value) || 0;
    var soma = l + c + i + o;
    document.getElementById("cfg-soma").textContent = Calc.formatarPercentual(soma, 1);
    document.getElementById("cfg-alerta").innerHTML =
      soma >= 100 ? '<div class="alerta">A soma não pode chegar a 100% ou mais — o preço tenderia ao infinito.</div>' : "";
  }

  ["cfg-lucro", "cfg-cartao", "cfg-impostos", "cfg-outros"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", atualizarSomaConfig);
  });

  document.getElementById("form-config").addEventListener("submit", function (e) {
    e.preventDefault();
    state.config = {
      lucroPct: parseFloat(document.getElementById("cfg-lucro").value) || 0,
      taxaCartaoPct: parseFloat(document.getElementById("cfg-cartao").value) || 0,
      impostosPct: parseFloat(document.getElementById("cfg-impostos").value) || 0,
      outrosPct: parseFloat(document.getElementById("cfg-outros").value) || 0,
    };
    salvarEstado(); mostrarToast("Configurações salvas.");
  });

  // ------------------------------------------------------------------- //
  // CUSTOS FIXOS + PONTO DE EQUILÍBRIO
  // ------------------------------------------------------------------- //

  function renderCustosFixos() {
    var lista = document.getElementById("lista-custos-fixos");
    var ordenados = state.custosFixos.slice().sort(function (a, b) { return a.descricao.localeCompare(b.descricao, "pt-BR"); });
    var total = ordenados.reduce(function (s, c) { return s + c.valorMensal; }, 0);
    document.getElementById("total-custo-fixo").textContent = Calc.formatarMoeda(total);

    if (!ordenados.length) {
      lista.innerHTML = '<div class="vazio">Nenhum custo fixo cadastrado ainda.</div>';
    } else {
      lista.innerHTML =
        '<div class="tabela-wrap"><table><thead><tr><th>Descrição</th><th>Valor mensal</th><th></th></tr></thead><tbody>' +
        ordenados.map(function (c) {
          return "<tr><td>" + escapeHtml(c.descricao) + '</td><td class="numerico">' + Calc.formatarMoeda(c.valorMensal) +
            '</td><td class="acoes-col">' +
            '<button type="button" class="btn editar pequeno" data-editar-custo="' + c.id + '" aria-label="Editar ' + escapeHtml(c.descricao) + '">✏️</button>' +
            '<button type="button" class="btn perigo pequeno" data-excluir-custo="' + c.id + '" aria-label="Remover ' + escapeHtml(c.descricao) + '">🗑️</button></td></tr>';
        }).join("") +
        "</tbody></table></div>";
    }

    // Ponto de equilíbrio
    var peDiv = document.getElementById("ponto-equilibrio-conteudo");
    if (!state.pratos.length || total <= 0) {
      peDiv.innerHTML = '<div class="vazio">Cadastre pratos com preço definido e ao menos um custo fixo para calcular o ponto de equilíbrio.</div>';
      return;
    }
    var linhas = state.pratos.map(function (p) {
      var r = calcularResumoPrato(p);
      if (!r.precoFinal) return null;
      var mc = Calc.calcularMargemContribuicao(r.precoFinal, r.custoDireto, state.config.taxaCartaoPct, state.config.impostosPct);
      var mcPct = r.precoFinal ? mc / r.precoFinal : 0;
      return { nome: p.nome, mcPct: mcPct, mixVendasPct: p.mixVendasPct };
    }).filter(Boolean);

    if (!linhas.length) { peDiv.innerHTML = '<div class="vazio">Defina o preço dos pratos na ficha técnica primeiro.</div>'; return; }

    var pe = Calc.calcularPontoEquilibrioGeral(linhas.map(function (l) { return { mcPct: l.mcPct, mixVendasPct: l.mixVendasPct }; }), total);
    var html = "";
    if (pe) {
      html += '<div class="metricas"><div class="metrica"><span>Margem de contribuição média</span><b>' + Calc.formatarPercentual(pe.mcMedia * 100) + "</b></div>" +
        '<div class="metrica"><span>Faturamento p/ empatar</span><b>' + (pe.receita ? Calc.formatarMoeda(pe.receita) : "—") + "</b></div></div>";
    }
    html += '<div class="tabela-wrap"><table><thead><tr><th>Prato</th><th>Margem de contribuição</th></tr></thead><tbody>' +
      linhas.map(function (l) { return "<tr><td>" + escapeHtml(l.nome) + '</td><td class="numerico">' + Calc.formatarPercentual(l.mcPct * 100) + "</td></tr>"; }).join("") +
      "</tbody></table></div>";
    html += '<p class="subtitulo">Se o % de participação nas vendas não for preenchido nos pratos, é usada uma média simples entre eles.</p>';
    peDiv.innerHTML = html;
  }

  document.getElementById("form-custo-fixo").addEventListener("submit", function (e) {
    e.preventDefault();
    var descEl = document.getElementById("cf-descricao");
    var valorEl = document.getElementById("cf-valor");
    var descricao = descEl.value.trim();
    var valorMensal = parseFloat(valorEl.value);
    if (!descricao) { descEl.classList.add("campo-invalido"); mostrarToast("Informe uma descrição.", "erro"); return; }
    if (isNaN(valorMensal) || valorMensal < 0) { valorEl.classList.add("campo-invalido"); mostrarToast("Informe um valor válido.", "erro"); return; }
    state.custosFixos.push({ id: gerarId(), descricao: descricao, valorMensal: valorMensal });
    salvarEstado(); document.getElementById("form-custo-fixo").reset(); renderCustosFixos(); mostrarToast("Custo fixo adicionado.");
  });

  document.getElementById("lista-custos-fixos").addEventListener("click", function (e) {
    // Editar custo fixo
    var btnEdit = e.target.closest("[data-editar-custo]");
    if (btnEdit) {
      var id = btnEdit.getAttribute("data-editar-custo");
      var cf = state.custosFixos.find(function (c) { return c.id === id; });
      if (!cf) return;
      abrirModalEditar("Editar custo fixo", [
        { name: "descricao", label: "Descrição", type: "text", value: cf.descricao, required: true },
        { name: "valorMensal", label: "Valor mensal (R$)", type: "number", value: cf.valorMensal, min: 0, step: 0.01, required: true },
      ], function (dados) {
        if (!dados.descricao || !dados.descricao.trim()) { mostrarToast("Descrição é obrigatória.", "erro"); return; }
        cf.descricao = dados.descricao.trim();
        cf.valorMensal = dados.valorMensal || 0;
        salvarEstado(); renderCustosFixos(); mostrarToast("Custo fixo atualizado.");
      });
      return;
    }
    // Excluir custo fixo
    var btnDel = e.target.closest("[data-excluir-custo]");
    if (!btnDel) return;
    var delId = btnDel.getAttribute("data-excluir-custo");
    abrirModal("Remover custo fixo", "Tem certeza que deseja remover este custo fixo?", function () {
      state.custosFixos = state.custosFixos.filter(function (c) { return c.id !== delId; });
      salvarEstado(); renderCustosFixos(); mostrarToast("Custo fixo removido.");
    });
  });

  // ------------------------------------------------------------------- //
  // PAYBACK DESCONTADO
  // ------------------------------------------------------------------- //

  var paybackFluxos = [0];

  function renderPaybackUI() {
    renderPaybackFluxos();
  }

  function renderPaybackFluxos() {
    var container = document.getElementById("payback-fluxos");
    container.innerHTML = paybackFluxos.map(function (val, idx) {
      return '<div class="payback-fluxo-row">' +
        '<span class="periodo-label">Período ' + (idx + 1) + '</span>' +
        '<input type="number" class="pb-fluxo-input" data-idx="' + idx + '" value="' + (val || '') + '" min="0" step="0.01" placeholder="R$ fluxo de caixa">' +
        '<button type="button" class="btn perigo pequeno" data-remover-fluxo="' + idx + '" aria-label="Remover período ' + (idx + 1) + '"' +
        (paybackFluxos.length <= 1 ? ' disabled' : '') + '>✕</button></div>';
    }).join("");
  }

  document.getElementById("payback-fluxos").addEventListener("input", function (e) {
    var input = e.target.closest(".pb-fluxo-input");
    if (input) paybackFluxos[parseInt(input.dataset.idx)] = parseFloat(input.value) || 0;
  });

  document.getElementById("payback-fluxos").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remover-fluxo]");
    if (!btn || paybackFluxos.length <= 1) return;
    paybackFluxos.splice(parseInt(btn.dataset.removerFluxo), 1);
    renderPaybackFluxos();
  });

  document.getElementById("btn-add-fluxo").addEventListener("click", function () {
    paybackFluxos.push(0);
    renderPaybackFluxos();
    var inputs = document.querySelectorAll(".pb-fluxo-input");
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  // Quick fill modal
  document.getElementById("btn-preencher-rapido").addEventListener("click", function () {
    document.getElementById("modal-preencher-rapido").classList.add("ativo");
  });
  document.getElementById("modal-rapido-cancelar").addEventListener("click", function () {
    document.getElementById("modal-preencher-rapido").classList.remove("ativo");
  });
  document.getElementById("form-preencher-rapido").addEventListener("submit", function (e) {
    e.preventDefault();
    var qtd = parseInt(document.getElementById("rapido-qtd-periodos").value) || 0;
    var val = parseFloat(document.getElementById("rapido-valor").value) || 0;
    if (qtd <= 0) { mostrarToast("Informe a quantidade de períodos.", "erro"); return; }
    paybackFluxos = [];
    for (var i = 0; i < qtd; i++) paybackFluxos.push(val);
    renderPaybackFluxos();
    document.getElementById("modal-preencher-rapido").classList.remove("ativo");
    mostrarToast(qtd + " períodos preenchidos.");
  });

  // Calculate payback
  document.getElementById("btn-calcular-payback").addEventListener("click", function () {
    var investimento = parseFloat(document.getElementById("pb-investimento").value);
    var taxa = parseFloat(document.getElementById("pb-taxa").value);
    var base = document.getElementById("pb-taxa-base").value;

    if (isNaN(investimento) || investimento <= 0) {
      mostrarToast("Informe o investimento inicial.", "erro"); return;
    }
    if (isNaN(taxa) || taxa < 0) {
      mostrarToast("Informe a taxa de desconto.", "erro"); return;
    }

    var taxaDecimal = taxa / 100;
    var resultado = Calc.calcularPaybackDescontado(investimento, taxaDecimal, paybackFluxos);

    // KPI Card
    var kpiDiv = document.getElementById("payback-kpi");
    if (resultado.recuperado) {
      kpiDiv.innerHTML = '<div class="kpi-destaque">' +
        '<div class="kpi-label">Payback Descontado</div>' +
        '<div class="kpi-valor">' + Calc.formatarPeriodo(resultado.payback, base) + '</div>' +
        '<div class="kpi-extra">O investimento se paga em ' + Calc.formatarPeriodo(resultado.payback, base) +
        ' (taxa de ' + Calc.formatarPercentual(taxa) + ' ' + (base === "anual" ? "a.a." : "a.m.") + ')</div></div>';
    } else {
      kpiDiv.innerHTML = '<div class="kpi-destaque alerta">' +
        '<div class="kpi-label">Payback Descontado</div>' +
        '<div class="kpi-valor">Não recuperado</div>' +
        '<div class="kpi-extra">O investimento não se paga no horizonte de ' + paybackFluxos.length + ' período(s) analisado(s)</div></div>';
    }

    // Alert
    var alertDiv = document.getElementById("payback-alerta");
    alertDiv.innerHTML = resultado.recuperado ? "" :
      '<div class="alerta">⚠️ Investimento não recuperado no período analisado. Considere aumentar o horizonte, revisar os fluxos projetados ou reavaliar a taxa de desconto.</div>';

    // Table
    var tabelaDiv = document.getElementById("payback-tabela");
    var thtml = '<div class="tabela-wrap"><table><thead><tr>' +
      '<th>Período</th><th>Fluxo Nominal</th><th>Fator Desconto</th><th>Fluxo Descontado</th><th>Acumulado</th></tr></thead><tbody>';
    resultado.tabela.forEach(function (row) {
      var cls = row.acumulado >= 0 ? ' style="color:var(--verde);font-weight:700"' : '';
      thtml += '<tr><td>' + row.periodo + '</td>' +
        '<td class="numerico">' + Calc.formatarMoeda(row.fluxoNominal) + '</td>' +
        '<td class="numerico">' + row.fatorDesconto.toFixed(4) + '</td>' +
        '<td class="numerico">' + Calc.formatarMoeda(row.fluxoDescontado) + '</td>' +
        '<td class="numerico"' + cls + '>' + Calc.formatarMoeda(row.acumulado) + '</td></tr>';
    });
    thtml += '</tbody></table></div>';
    tabelaDiv.innerHTML = thtml;

    // Show results
    document.getElementById("payback-resultado-wrap").style.display = "";

    // Draw chart
    desenharGraficoPayback(resultado.tabela);
  });

  function desenharGraficoPayback(tabela) {
    var wrap = document.getElementById("grafico-wrap");
    var canvas = document.getElementById("grafico-payback");
    if (!canvas || tabela.length < 2) { wrap.style.display = "none"; return; }
    wrap.style.display = "";

    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var pad = { top: 30, right: 30, bottom: 40, left: 80 };
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    var vals = tabela.map(function (r) { return r.acumulado; });
    var minV = Math.min.apply(null, vals);
    var maxV = Math.max.apply(null, vals);
    if (minV === maxV) { minV -= 1; maxV += 1; }
    var range = maxV - minV;

    var isDark = document.documentElement.classList.contains("dark");
    var bgColor = isDark ? "#1F1833" : "#ffffff";
    var gridColor = isDark ? "#2F2848" : "#E2E0EB";
    var textColor = isDark ? "#A09CB0" : "#5B5470";
    var lineColor = "#FF7A00";
    var zeroColor = "#FFD60A";

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    for (var g = 0; g <= 4; g++) {
      var gy = pad.top + (chartH * g / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
      var gval = maxV - (range * g / 4);
      ctx.fillStyle = textColor; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(Calc.formatarMoeda(gval), pad.left - 8, gy + 4);
    }

    // Zero line
    var zeroY = pad.top + chartH * (maxV / range);
    if (zeroY >= pad.top && zeroY <= pad.top + chartH) {
      ctx.strokeStyle = zeroColor; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(W - pad.right, zeroY); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Data line
    ctx.strokeStyle = lineColor; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath();
    var n = tabela.length;
    for (var i = 0; i < n; i++) {
      var x = pad.left + (chartW * i / (n - 1));
      var y = pad.top + chartH * ((maxV - vals[i]) / range);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Points and labels
    for (var j = 0; j < n; j++) {
      var px = pad.left + (chartW * j / (n - 1));
      var py = pad.top + chartH * ((maxV - vals[j]) / range);
      ctx.fillStyle = vals[j] >= 0 ? (isDark ? "#4ADE80" : "#16A34A") : "#FF7A00";
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = textColor; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("P" + tabela[j].periodo, px, pad.top + chartH + 20);
    }
  }

  // ------------------------------------------------------------------- //
  // RELATÓRIOS (PDF via impressão do navegador + planilha .xls)
  // ------------------------------------------------------------------- //

  function montarRelatorioImprimivel() {
    var total = state.custosFixos.reduce(function (s, c) { return s + c.valorMensal; }, 0);
    var linhasPratos = state.pratos.map(function (p) {
      var r = calcularResumoPrato(p);
      var cmvPct = r.precoFinal ? (r.custoDireto / r.precoFinal) * 100 : 0;
      return "<tr><td>" + escapeHtml(p.nome) + "</td><td>" + escapeHtml(p.categoria || "") + "</td><td>" +
        Calc.formatarMoeda(r.custoDireto) + "</td><td>" + Calc.formatarMoeda(r.precoFinal) + "</td><td>" +
        Calc.formatarPercentual(cmvPct) + "</td><td>" + (p.mixVendasPct || 0) + "%</td></tr>";
    }).join("");
    if (!linhasPratos) linhasPratos = '<tr><td colspan="6">Nenhum prato cadastrado.</td></tr>';

    // Logo
    var logoData = localStorage.getItem(LOGO_KEY);
    var logoHtml = logoData ? '<img src="' + logoData + '" style="max-height:60px;margin-bottom:8px" alt="Logo">' : '';

    var html =
      '<div style="font-family:Arial, sans-serif; padding:24px; color:#2B1B10">' +
      logoHtml +
      '<h1 style="color:#7A1216; margin-bottom:4px">Relatório de Precificação do Cardápio</h1>' +
      "<p>Gerado em " + new Date().toLocaleString("pt-BR") + "</p>" +
      '<h2 style="color:#C41E24">Resumo por prato</h2>' +
      '<table style="width:100%; border-collapse:collapse" border="1" cellpadding="6">' +
      '<thead style="background:#C41E24;color:white"><tr><th>Prato</th><th>Categoria</th><th>Custo direto</th><th>Preço</th><th>CMV %</th><th>Mix %</th></tr></thead>' +
      "<tbody>" + linhasPratos + "</tbody></table>" +
      '<h2 style="color:#C41E24; margin-top:24px">Parâmetros de precificação</h2>' +
      "<p>Lucro desejado: " + state.config.lucroPct + "% | Taxa de cartão: " + state.config.taxaCartaoPct +
      "% | Impostos: " + state.config.impostosPct + "% | Outros: " + state.config.outrosPct + "%</p>" +
      '<h2 style="color:#C41E24; margin-top:24px">Custos fixos e ponto de equilíbrio</h2>' +
      "<p>Total de custos fixos mensais: " + Calc.formatarMoeda(total) + "</p></div>";

    document.getElementById("relatorio-imprimivel").innerHTML = html;
  }

  document.getElementById("btn-gerar-pdf").addEventListener("click", function () {
    montarRelatorioImprimivel();
    window.print();
  });

  function gerarLinhaXml(valores) {
    return "<Row>" + valores.map(function (v) {
      if (typeof v === "number") return '<Cell><Data ss:Type="Number">' + v + "</Data></Cell>";
      return '<Cell><Data ss:Type="String">' + escapeXml(String(v)) + "</Data></Cell>";
    }).join("") + "</Row>";
  }

  function gerarPlanilhaXls() {
    var ingRows = [gerarLinhaXml(["Nome", "Unidade de compra", "Qtd embalagem", "Custo embalagem", "Perda %", "Custo por unidade base"])];
    state.ingredientes.forEach(function (i) {
      ingRows.push(gerarLinhaXml([i.nome, i.unidadeCompra, i.qtdEmbalagem, i.custoEmbalagem, i.perdaPct || 0, Number(Calc.custoPorUnidadeBase(i).toFixed(4))]));
    });
    var resumoRows = [gerarLinhaXml(["Prato", "Categoria", "Custo direto", "Preço de venda", "CMV %", "Mix de vendas %"])];
    state.pratos.forEach(function (p) {
      var r = calcularResumoPrato(p);
      var cmvPct = r.precoFinal ? (r.custoDireto / r.precoFinal) * 100 : 0;
      resumoRows.push(gerarLinhaXml([p.nome, p.categoria || "", Number(r.custoDireto.toFixed(2)), Number(r.precoFinal.toFixed(2)), Number(cmvPct.toFixed(1)), p.mixVendasPct || 0]));
    });
    var cfRows = [gerarLinhaXml(["Descrição", "Valor mensal"])];
    state.custosFixos.forEach(function (c) { cfRows.push(gerarLinhaXml([c.descricao, c.valorMensal])); });
    var cfgRows = [
      gerarLinhaXml(["Lucro %", "Taxa cartão %", "Impostos %", "Outros %"]),
      gerarLinhaXml([state.config.lucroPct, state.config.taxaCartaoPct, state.config.impostosPct, state.config.outrosPct]),
    ];
    function planilha(nome, linhas) {
      return '<Worksheet ss:Name="' + nome + '"><Table>' + linhas.join("") + "</Table></Worksheet>";
    }
    return '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
      planilha("Ingredientes", ingRows) + planilha("Resumo Precificacao", resumoRows) +
      planilha("Custos Fixos", cfRows) + planilha("Configuracoes", cfgRows) + "\n</Workbook>";
  }

  document.getElementById("btn-exportar-planilha").addEventListener("click", function () {
    baixarArquivo(gerarPlanilhaXls(), "precificacao_" + dataParaArquivo() + ".xls", "application/vnd.ms-excel");
    mostrarToast("Planilha gerada.");
  });

  // ------------------------------------------------------------------- //
  // IMPORTAR (CSV de ingredientes) e BACKUP (JSON completo)
  // ------------------------------------------------------------------- //

  document.getElementById("btn-baixar-modelo").addEventListener("click", function () {
    var csv = "nome,unidadeCompra,qtdEmbalagem,custoEmbalagem,perdaPct\nCaranguejo limpo,kg,1,45,10\n";
    baixarArquivo(csv, "modelo_ingredientes.csv", "text/csv;charset=utf-8");
  });

  function parseCsv(texto) {
    return texto.split(/\r?\n/).filter(function (l) { return l.trim().length; })
      .map(function (l) { return l.split(",").map(function (v) { return v.trim(); }); });
  }

  document.getElementById("form-importar").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("arquivo-csv");
    var resultado = document.getElementById("importar-resultado");
    if (!input.files.length) { mostrarToast("Selecione um arquivo CSV.", "erro"); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var linhas = parseCsv(ev.target.result);
        var header = linhas[0].map(function (h) { return h.toLowerCase(); });
        var idxNome = header.indexOf("nome");
        var idxUnidade = header.indexOf("unidadecompra");
        var idxQtd = header.indexOf("qtdembalagem");
        var idxCusto = header.indexOf("custoembalagem");
        var idxPerda = header.indexOf("perdapct");
        if (idxNome < 0 || idxUnidade < 0 || idxQtd < 0 || idxCusto < 0) {
          resultado.innerHTML = '<div class="alerta">O CSV precisa conter as colunas: nome, unidadeCompra, qtdEmbalagem, custoEmbalagem.</div>';
          return;
        }
        var total = 0;
        for (var idx = 1; idx < linhas.length; idx++) {
          var linha = linhas[idx];
          var nome = linha[idxNome];
          if (!nome) continue;
          var unidadeCompra = (linha[idxUnidade] || "kg").toLowerCase();
          if (!Calc.FATOR_BASE.hasOwnProperty(unidadeCompra)) continue;
          var qtdEmbalagem = parseFloat(linha[idxQtd]) || 0;
          var custoEmbalagem = parseFloat(linha[idxCusto]) || 0;
          var perdaPct = idxPerda >= 0 ? parseFloat(linha[idxPerda]) || 0 : 0;
          var existente = state.ingredientes.find(function (x) { return x.nome.toLowerCase() === nome.toLowerCase(); });
          if (existente) {
            Object.assign(existente, { unidadeCompra: unidadeCompra, qtdEmbalagem: qtdEmbalagem, custoEmbalagem: custoEmbalagem, perdaPct: perdaPct });
          } else {
            state.ingredientes.push({ id: gerarId(), nome: nome, unidadeCompra: unidadeCompra, qtdEmbalagem: qtdEmbalagem, custoEmbalagem: custoEmbalagem, perdaPct: perdaPct });
          }
          total++;
        }
        salvarEstado();
        resultado.innerHTML = '<div class="aviso">' + total + " ingrediente(s) importado(s)/atualizado(s) com sucesso.</div>";
        mostrarToast("Importação concluída.");
        if (vistaAtual === "ingredientes") renderIngredientes();
      } catch (err) {
        resultado.innerHTML = '<div class="alerta">Não foi possível ler o arquivo. Confira o formato do CSV.</div>';
      }
    };
    reader.readAsText(input.files[0], "UTF-8");
  });

  document.getElementById("btn-exportar-backup").addEventListener("click", function () {
    var backup = JSON.parse(JSON.stringify(state));
    var logoData = localStorage.getItem(LOGO_KEY);
    if (logoData) backup.logoEmpresa = logoData;
    baixarArquivo(JSON.stringify(backup, null, 2), "precifica-backup_" + dataParaArquivo() + ".json", "application/json");
    mostrarToast("Backup exportado.");
  });

  document.getElementById("form-importar-backup").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = document.getElementById("arquivo-backup");
    if (!input.files.length) { mostrarToast("Selecione um arquivo de backup.", "erro"); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var novo = JSON.parse(ev.target.result);
        if (!novo || typeof novo !== "object") throw new Error("formato inválido");
        abrirModal("Restaurar backup", "Isso vai substituir TODOS os dados atuais pelos do arquivo. Deseja continuar?", function () {
          // Restore logo if present in backup
          if (novo.logoEmpresa) {
            localStorage.setItem(LOGO_KEY, novo.logoEmpresa);
          }
          delete novo.logoEmpresa;
          state = Object.assign(estadoPadrao(), novo);
          salvarEstado();
          carregarLogo();
          irPara(vistaAtual);
          mostrarToast("Backup restaurado.");
        });
      } catch (err) {
        mostrarToast("Arquivo de backup inválido.", "erro");
      }
    };
    reader.readAsText(input.files[0], "UTF-8");
  });

  // ------------------------------------------------------------------- //
  // Modal / navegação / inicialização
  // ------------------------------------------------------------------- //

  document.getElementById("modal-cancelar").addEventListener("click", fecharModal);
  document.getElementById("modal-confirmar-btn").addEventListener("click", function () {
    if (modalConfirmCallback) modalConfirmCallback();
    fecharModal();
  });
  document.getElementById("modal-confirmar").addEventListener("click", function (e) {
    if (e.target === this) fecharModal();
  });
  document.getElementById("modal-editar").addEventListener("click", function (e) {
    if (e.target === this) fecharModalEditar();
  });
  document.getElementById("modal-preencher-rapido").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("ativo");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      fecharModal();
      fecharModalEditar();
      document.getElementById("modal-preencher-rapido").classList.remove("ativo");
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target && e.target.classList) e.target.classList.remove("campo-invalido");
  });

  document.querySelectorAll(".sidebar-item").forEach(function (b) {
    b.addEventListener("click", function () { irPara(b.getAttribute("data-vista")); });
  });

  // ─── Sidebar mobile toggle ────────────────────────
  var btnMenu = document.getElementById("btn-menu");
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebar-overlay");

  btnMenu.addEventListener("click", function () {
    var aberta = sidebar.classList.toggle("aberta");
    overlay.classList.toggle("ativo", aberta);
    btnMenu.setAttribute("aria-expanded", aberta ? "true" : "false");
  });

  overlay.addEventListener("click", fecharSidebarMobile);

  // Botão tema mobile
  var btnTemaMobile = document.getElementById("btn-tema-mobile");
  if (btnTemaMobile) {
    btnTemaMobile.addEventListener("click", function () {
      alternarTema();
      var isDark = document.documentElement.classList.contains("dark");
      btnTemaMobile.querySelector(".tema-icone").textContent = isDark ? "🌙" : "☀️";
    });
  }

  // ─── Sincronizar ícone tema mobile com sidebar ────
  var _origAtualizarIcone = atualizarIconeTema;
  atualizarIconeTema = function () {
    _origAtualizarIcone();
    var isDark = document.documentElement.classList.contains("dark");
    var mobileIcone = document.getElementById("tema-icone-mobile");
    if (mobileIcone) mobileIcone.textContent = isDark ? "🌙" : "☀️";
  };

  // ═══════════════════════════════════════════════════
  // FATURAMENTO
  // ═══════════════════════════════════════════════════

  // Preenche o select de pratos do formulário de faturamento e filtros
  function popularSelectsFaturamento() {
    var selPrato = document.getElementById("fat-prato");
    var selFil = document.getElementById("fat-fil-prato");
    var ordenados = state.pratos.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });

    if (!ordenados.length) {
      selPrato.innerHTML = '<option value="">Cadastre pratos primeiro</option>';
    } else {
      selPrato.innerHTML = ordenados.map(function (p) {
        return '<option value="' + p.id + '">' + escapeHtml(p.nome) + '</option>';
      }).join("");
    }

    selFil.innerHTML = '<option value="">Todos os pratos</option>' +
      ordenados.map(function (p) {
        return '<option value="' + p.id + '">' + escapeHtml(p.nome) + '</option>';
      }).join("");

    // Preenche preço ao mudar prato
    atualizarPrecoPratoPadrao();
  }

  function atualizarPrecoPratoPadrao() {
    var selPrato = document.getElementById("fat-prato");
    var inputPreco = document.getElementById("fat-preco");
    var pratoId = selPrato.value;
    var prato = state.pratos.find(function (p) { return p.id === pratoId; });
    if (prato) {
      var r = calcularResumoPrato(prato);
      inputPreco.value = r.precoFinal ? r.precoFinal.toFixed(2) : "";
    } else {
      inputPreco.value = "";
    }
  }

  document.getElementById("fat-prato").addEventListener("change", atualizarPrecoPratoPadrao);

  // Formulário de lançamento
  document.getElementById("form-fat").addEventListener("submit", function (e) {
    e.preventDefault();
    var dataEl = document.getElementById("fat-data");
    var pratoEl = document.getElementById("fat-prato");
    var qtdEl = document.getElementById("fat-qtd");
    var precoEl = document.getElementById("fat-preco");

    var data = dataEl.value;
    var pratoId = pratoEl.value;
    var qtd = parseInt(qtdEl.value) || 0;
    var precoUnitario = parseFloat(precoEl.value);

    var valido = true;
    if (!data) { dataEl.classList.add("campo-invalido"); valido = false; }
    if (!pratoId) { pratoEl.classList.add("campo-invalido"); valido = false; }
    if (qtd <= 0) { qtdEl.classList.add("campo-invalido"); valido = false; }
    if (isNaN(precoUnitario) || precoUnitario < 0) { precoEl.classList.add("campo-invalido"); valido = false; }
    if (!valido) { mostrarToast("Preencha todos os campos corretamente.", "erro"); return; }

    var prato = state.pratos.find(function (p) { return p.id === pratoId; });
    var pratoNome = prato ? prato.nome : "Desconhecido";
    var total = qtd * precoUnitario;

    state.faturamento.push({
      id: gerarId(),
      data: data,
      pratoId: pratoId,
      pratoNome: pratoNome,
      qtd: qtd,
      precoUnitario: precoUnitario,
      total: total,
    });

    salvarEstado();
    mostrarToast('Venda de "' + pratoNome + '" registrada — ' + Calc.formatarMoeda(total));
    document.getElementById("form-fat").reset();
    // Repor data de hoje
    document.getElementById("fat-data").value = new Date().toISOString().slice(0, 10);
    popularSelectsFaturamento();
    renderFaturamento();
  });

  // Filtro
  function getLancamentosFiltrados() {
    var ini = document.getElementById("fat-fil-ini").value;
    var fim = document.getElementById("fat-fil-fim").value;
    var pratoId = document.getElementById("fat-fil-prato").value;
    return state.faturamento.filter(function (l) {
      if (ini && l.data < ini) return false;
      if (fim && l.data > fim) return false;
      if (pratoId && l.pratoId !== pratoId) return false;
      return true;
    });
  }

  document.getElementById("btn-fat-filtrar").addEventListener("click", renderFaturamento);
  document.getElementById("btn-fat-limpar").addEventListener("click", function () {
    document.getElementById("fat-fil-ini").value = "";
    document.getElementById("fat-fil-fim").value = "";
    document.getElementById("fat-fil-prato").value = "";
    renderFaturamento();
  });

  // Render principal do faturamento
  function renderFaturamento() {
    popularSelectsFaturamento();
    var lista = getLancamentosFiltrados();
    var kpisDiv = document.getElementById("fat-kpis");
    var fatLista = document.getElementById("fat-lista");

    // KPIs
    var totalFat = lista.reduce(function (s, l) { return s + l.total; }, 0);
    var totalQtd = lista.reduce(function (s, l) { return s + l.qtd; }, 0);
    var ticketMedio = lista.length ? totalFat / lista.length : 0;

    // Prato campeão
    var porPrato = {};
    lista.forEach(function (l) {
      porPrato[l.pratoNome] = (porPrato[l.pratoNome] || 0) + l.total;
    });
    var campeao = "-";
    var maxFat = 0;
    Object.keys(porPrato).forEach(function (nome) {
      if (porPrato[nome] > maxFat) { maxFat = porPrato[nome]; campeao = nome; }
    });

    kpisDiv.innerHTML =
      kpiCard("laranja", "💰", "Faturamento Total", Calc.formatarMoeda(totalFat)) +
      kpiCard("ouro", "🧾", "Ticket Médio", Calc.formatarMoeda(ticketMedio)) +
      kpiCard("verde", "📦", "Itens Vendidos", totalQtd) +
      kpiCard("roxo", "🏆", "Prato Campeão", campeao.length > 14 ? campeao.slice(0, 13) + "…" : campeao);

    // Gráfico
    desenharGraficoFaturamento(lista);

    // Tabela
    if (!lista.length) {
      fatLista.innerHTML = '<div class="vazio"><span class="emoji">💰</span>Nenhum lançamento no período selecionado.</div>';
      return;
    }

    var ordenados = lista.slice().sort(function (a, b) { return b.data.localeCompare(a.data); });
    var html = '<div class="tabela-wrap"><table><thead><tr><th>Data</th><th>Prato</th><th>Qtd</th><th>Preço Unit.</th><th>Total</th><th></th></tr></thead><tbody>';
    ordenados.forEach(function (l) {
      var dataFmt = l.data ? l.data.split("-").reverse().join("/") : "-";
      html += '<tr>' +
        '<td>' + dataFmt + '</td>' +
        '<td>' + escapeHtml(l.pratoNome) + '</td>' +
        '<td class="numerico">' + l.qtd + '</td>' +
        '<td class="numerico">' + Calc.formatarMoeda(l.precoUnitario) + '</td>' +
        '<td class="numerico"><b>' + Calc.formatarMoeda(l.total) + '</b></td>' +
        '<td class="acoes-col"><button type="button" class="btn perigo pequeno" data-excluir-fat="' + l.id + '" aria-label="Excluir lançamento">🗑️</button></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    fatLista.innerHTML = html;
  }

  function kpiCard(cor, icone, label, valor) {
    return '<div class="fat-kpi-card ' + cor + '">' +
      '<div class="fat-kpi-icon">' + icone + '</div>' +
      '<div class="fat-kpi-label">' + label + '</div>' +
      '<div class="fat-kpi-valor">' + valor + '</div>' +
      '</div>';
  }

  // Excluir lançamento
  document.getElementById("fat-lista").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-excluir-fat]");
    if (!btn) return;
    var id = btn.getAttribute("data-excluir-fat");
    abrirModal("Excluir lançamento", "Remover este lançamento de faturamento?", function () {
      state.faturamento = state.faturamento.filter(function (l) { return l.id !== id; });
      salvarEstado();
      renderFaturamento();
      mostrarToast("Lançamento removido.");
    });
  });

  // Gráfico de barras — faturamento por dia
  function desenharGraficoFaturamento(lista) {
    var wrap = document.getElementById("fat-grafico-wrap");
    var canvas = document.getElementById("grafico-faturamento");
    if (!lista.length) { wrap.style.display = "none"; return; }
    wrap.style.display = "";

    // Agrupa por data
    var porDia = {};
    lista.forEach(function (l) { porDia[l.data] = (porDia[l.data] || 0) + l.total; });
    var dias = Object.keys(porDia).sort();
    if (dias.length < 1) { wrap.style.display = "none"; return; }

    var vals = dias.map(function (d) { return porDia[d]; });
    var maxV = Math.max.apply(null, vals) * 1.15 || 1;

    var isDark = document.documentElement.classList.contains("dark");
    var bgColor = isDark ? "#1F1833" : "#ffffff";
    var gridColor = isDark ? "#2F2848" : "#E2E0EB";
    var textColor = isDark ? "#A09CB0" : "#5B5470";
    var barColor = "#FF7A00";
    var barHover = "#FFD60A";

    var W = canvas.width, H = canvas.height;
    var pad = { top: 24, right: 20, bottom: 52, left: 80 };
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;
    var n = dias.length;
    var barW = Math.max(4, Math.floor(chartW / n) - 6);
    var ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // Grid horizontal
    var gridSteps = 4;
    for (var g = 0; g <= gridSteps; g++) {
      var gy = pad.top + (chartH * g / gridSteps);
      ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
      var gval = maxV * (1 - g / gridSteps);
      ctx.fillStyle = textColor; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(Calc.formatarMoeda(gval), pad.left - 6, gy + 4);
    }

    // Barras
    for (var i = 0; i < n; i++) {
      var x = pad.left + (chartW * i / n) + (chartW / n - barW) / 2;
      var barH2 = chartH * (vals[i] / maxV);
      var y = pad.top + chartH - barH2;
      var grad = ctx.createLinearGradient(0, y, 0, y + barH2);
      grad.addColorStop(0, barColor);
      grad.addColorStop(1, barHover);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barW, barH2, [4, 4, 0, 0]) : ctx.rect(x, y, barW, barH2);
      ctx.fill();

      // Label data (dd/mm) — only show every nth
      var step = Math.ceil(n / 12);
      if (i % step === 0) {
        var parts = dias[i].split("-");
        var label = parts[2] + "/" + parts[1];
        ctx.fillStyle = textColor; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(label, x + barW / 2, pad.top + chartH + 16);
      }
    }
  }

  // ─── Exportar PDF faturamento ─────────────────────
  document.getElementById("btn-fat-pdf").addEventListener("click", function () {
    var lista = getLancamentosFiltrados();
    var totalFat = lista.reduce(function (s, l) { return s + l.total; }, 0);
    var ordenados = lista.slice().sort(function (a, b) { return b.data.localeCompare(a.data); });
    var linhas = ordenados.map(function (l) {
      var dataFmt = l.data ? l.data.split("-").reverse().join("/") : "-";
      return "<tr><td>" + dataFmt + "</td><td>" + escapeHtml(l.pratoNome) + "</td><td style='text-align:right'>" +
        l.qtd + "</td><td style='text-align:right'>" + Calc.formatarMoeda(l.precoUnitario) +
        "</td><td style='text-align:right'><b>" + Calc.formatarMoeda(l.total) + "</b></td></tr>";
    }).join("");
    var logoData = localStorage.getItem(LOGO_KEY);
    var logoHtml = logoData ? '<img src="' + logoData + '" style="max-height:50px;margin-bottom:8px" alt="Logo">' : '';
    var html = '<div style="font-family:Arial,sans-serif;padding:24px;color:#1F1833">' +
      logoHtml +
      '<h1 style="color:#FF7A00;margin-bottom:4px">Relatório de Faturamento</h1>' +
      '<p>Gerado em ' + new Date().toLocaleString("pt-BR") + '</p>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:16px" border="1" cellpadding="6">' +
      '<thead style="background:#FF7A00;color:white"><tr><th>Data</th><th>Prato</th><th>Qtd</th><th>Preço Unit.</th><th>Total</th></tr></thead>' +
      '<tbody>' + (linhas || '<tr><td colspan="5">Nenhum lançamento.</td></tr>') + '</tbody>' +
      '<tfoot><tr><td colspan="4"><b>Total</b></td><td style="text-align:right"><b>' + Calc.formatarMoeda(totalFat) + '</b></td></tr></tfoot>' +
      '</table></div>';
    document.getElementById("fat-imprimivel").innerHTML = html;
    document.getElementById("fat-imprimivel").style.display = "block";
    document.getElementById("relatorio-imprimivel").innerHTML = "";
    window.print();
    setTimeout(function () {
      document.getElementById("fat-imprimivel").style.display = "none";
    }, 1000);
  });

  // ─── Exportar Excel faturamento ─────────────────────
  document.getElementById("btn-fat-excel").addEventListener("click", function () {
    var lista = getLancamentosFiltrados();
    var ordenados = lista.slice().sort(function (a, b) { return b.data.localeCompare(a.data); });
    var rows = [gerarLinhaXml(["Data", "Prato", "Quantidade", "Preço Unitário", "Total"])];
    ordenados.forEach(function (l) {
      var dataFmt = l.data ? l.data.split("-").reverse().join("/") : "-";
      rows.push(gerarLinhaXml([dataFmt, l.pratoNome, l.qtd, Number(l.precoUnitario.toFixed(2)), Number(l.total.toFixed(2))]));
    });
    var total = lista.reduce(function (s, l) { return s + l.total; }, 0);
    rows.push(gerarLinhaXml(["TOTAL", "", "", "", Number(total.toFixed(2))]));

    var xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n' +
      '<Worksheet ss:Name="Faturamento"><Table>' + rows.join("") + '</Table></Worksheet>' +
      '\n</Workbook>';

    baixarArquivo(xml, "faturamento_" + dataParaArquivo() + ".xls", "application/vnd.ms-excel");
    mostrarToast("Planilha de faturamento gerada.");
  });

  // ─── Define data padrão de hoje no formulário ─────
  var hoje = new Date().toISOString().slice(0, 10);
  document.getElementById("fat-data").value = hoje;

  // Init
  inicializarTema();
  carregarLogo();
  irPara("ingredientes");

  window.__precificaAppTestHook = { getState: function () { return state; }, gerarPlanilhaXls: gerarPlanilhaXls };
})();

