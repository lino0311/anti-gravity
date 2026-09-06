/*
 * calc.js — regras de negócio do Precifica+ (puras, sem DOM).
 * Isoladas para poderem ser testadas com Node antes de ligar na interface.
 */
(function (root) {
  "use strict";

  var FATOR_BASE = { g: 1, kg: 1000, ml: 1, l: 1000, un: 1 };
  var CATEGORIA_UNIDADE = { g: "massa", kg: "massa", ml: "volume", l: "volume", un: "contagem" };
  var GRUPOS_COMPATIVEIS = { massa: ["g", "kg"], volume: ["ml", "l"], contagem: ["un"] };
  var ROTULOS_UNIDADE = { g: "g", kg: "kg", ml: "ml", l: "L", un: "unidade(s)" };

  function categoriaDe(unidade) {
    return CATEGORIA_UNIDADE[unidade] || null;
  }

  function unidadesCompativeis(unidade) {
    return GRUPOS_COMPATIVEIS[categoriaDe(unidade)] || [];
  }

  // Converte uma quantidade numa unidade para a unidade-base da sua categoria (g, ml ou un)
  function paraBase(qtd, unidade) {
    var q = Number(qtd) || 0;
    var f = FATOR_BASE[unidade];
    return f ? q * f : q;
  }

  // Custo de 1 unidade-base (1 g / 1 ml / 1 un) de um ingrediente, já considerando perda (%)
  function custoPorUnidadeBase(ingrediente) {
    var baseQtd = paraBase(ingrediente.qtdEmbalagem, ingrediente.unidadeCompra);
    if (baseQtd <= 0) return 0;
    var custoBase = (Number(ingrediente.custoEmbalagem) || 0) / baseQtd;
    var fatorPerda = 1 - (Number(ingrediente.perdaPct) || 0) / 100;
    return fatorPerda > 0 ? custoBase / fatorPerda : custoBase;
  }

  // Custo de um item de ficha técnica: quantidade usada (em QUALQUER unidade compatível) x custo do ingrediente
  function custoItemPrato(item, ingrediente) {
    if (!ingrediente) return 0;
    var qtdBase = paraBase(item.qtd, item.unidade);
    return qtdBase * custoPorUnidadeBase(ingrediente);
  }

  // Soma o custo direto de um prato a partir da lista de {item, ingrediente}
  function custoDiretoPrato(itensComIngrediente) {
    return itensComIngrediente.reduce(function (soma, par) {
      return soma + custoItemPrato(par.item, par.ingrediente);
    }, 0);
  }

  // Preço de venda pelo método do divisor de markup
  function calcularPreco(custoDireto, config) {
    var soma =
      (Number(config.lucroPct) || 0) +
      (Number(config.taxaCartaoPct) || 0) +
      (Number(config.impostosPct) || 0) +
      (Number(config.outrosPct) || 0);
    var divisor = 1 - soma / 100;
    if (divisor <= 0) return { preco: null, divisor: divisor, valido: false };
    return { preco: custoDireto / divisor, divisor: divisor, valido: true };
  }

  // Margem de contribuição em R$ (preço - custo direto - taxa de cartão - impostos, todos sobre o preço)
  function calcularMargemContribuicao(preco, custoDireto, taxaCartaoPct, impostosPct) {
    var variavelPct = (Number(taxaCartaoPct) || 0) + (Number(impostosPct) || 0);
    return preco - custoDireto - (preco * variavelPct) / 100;
  }

  // Ponto de equilíbrio geral, ponderado pelo mix de vendas (ou média simples se mix não for informado)
  function calcularPontoEquilibrioGeral(listaMcMix, totalCustosFixos) {
    if (!listaMcMix.length || totalCustosFixos <= 0) return null;
    var mixTotal = listaMcMix.reduce(function (s, x) {
      return s + (Number(x.mixVendasPct) || 0);
    }, 0);
    var mcMedia;
    if (mixTotal > 0) {
      mcMedia =
        listaMcMix.reduce(function (s, x) {
          return s + x.mcPct * (Number(x.mixVendasPct) || 0);
        }, 0) / mixTotal;
    } else {
      mcMedia =
        listaMcMix.reduce(function (s, x) {
          return s + x.mcPct;
        }, 0) / listaMcMix.length;
    }
    if (mcMedia <= 0) return { mcMedia: mcMedia, receita: null };
    return { mcMedia: mcMedia, receita: totalCustosFixos / mcMedia };
  }

  function formatarMoeda(v) {
    var n = Number(v) || 0;
    return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatarPercentual(v, casas) {
    var n = Number(v) || 0;
    return n.toFixed(casas == null ? 1 : casas).replace(".", ",") + "%";
  }

  // ------------------------------------------------------------------- //
  // Payback Descontado
  // ------------------------------------------------------------------- //

  /**
   * Calcula o payback descontado (discounted payback period).
   * @param {number} investimentoInicial - Valor positivo do investimento (I₀)
   * @param {number} taxaDesconto - Taxa de desconto por período (ex: 0.12 = 12%)
   * @param {number[]} fluxosCaixa - Array de fluxos de caixa nominais por período
   * @param {string} baseTaxa - "anual" ou "mensal" (usado apenas para exibição)
   * @returns {{ tabela: Array, payback: number|null, recuperado: boolean }}
   */
  function calcularPaybackDescontado(investimentoInicial, taxaDesconto, fluxosCaixa) {
    var I0 = Number(investimentoInicial) || 0;
    var r = Number(taxaDesconto) || 0;
    var tabela = [];
    var acumulado = -I0;
    var payback = null;
    var recuperado = false;

    // Período 0 (investimento)
    tabela.push({
      periodo: 0,
      fluxoNominal: -I0,
      fatorDesconto: 1,
      fluxoDescontado: -I0,
      acumulado: acumulado
    });

    for (var t = 0; t < fluxosCaixa.length; t++) {
      var fc = Number(fluxosCaixa[t]) || 0;
      var fator = 1 / Math.pow(1 + r, t + 1);
      var pvt = fc * fator;
      var acumAnterior = acumulado;
      acumulado += pvt;

      tabela.push({
        periodo: t + 1,
        fluxoNominal: fc,
        fatorDesconto: fator,
        fluxoDescontado: pvt,
        acumulado: acumulado
      });

      // Interpolação linear para payback fracionado exato
      if (!recuperado && acumulado >= 0 && acumAnterior < 0) {
        // fração do período onde cruza zero
        var frac = pvt !== 0 ? Math.abs(acumAnterior) / pvt : 0;
        payback = t + frac; // t é 0-indexed, mas período é t+1, e frac < 1
        recuperado = true;
      }
    }

    return { tabela: tabela, payback: payback, recuperado: recuperado };
  }

  /**
   * Formata um valor de payback em "X anos e Y meses" ou "X meses"
   * @param {number} valor - Payback em períodos (ex: 3.45)
   * @param {string} unidadePeriodo - "anual" ou "mensal"
   */
  function formatarPeriodo(valor, unidadePeriodo) {
    if (valor == null) return "—";
    if (unidadePeriodo === "mensal") {
      var meses = Math.round(valor * 10) / 10;
      if (meses === 1) return "1 mês";
      return meses.toFixed(1).replace(".", ",") + " meses";
    }
    // anual
    var anos = Math.floor(valor);
    var mesesRestantes = Math.round((valor - anos) * 12);
    if (mesesRestantes >= 12) { anos++; mesesRestantes = 0; }
    var partes = [];
    if (anos > 0) partes.push(anos + (anos === 1 ? " ano" : " anos"));
    if (mesesRestantes > 0) partes.push(mesesRestantes + (mesesRestantes === 1 ? " mês" : " meses"));
    return partes.length ? partes.join(" e ") : "0 meses";
  }

  var api = {
    FATOR_BASE: FATOR_BASE,
    CATEGORIA_UNIDADE: CATEGORIA_UNIDADE,
    ROTULOS_UNIDADE: ROTULOS_UNIDADE,
    categoriaDe: categoriaDe,
    unidadesCompativeis: unidadesCompativeis,
    paraBase: paraBase,
    custoPorUnidadeBase: custoPorUnidadeBase,
    custoItemPrato: custoItemPrato,
    custoDiretoPrato: custoDiretoPrato,
    calcularPreco: calcularPreco,
    calcularMargemContribuicao: calcularMargemContribuicao,
    calcularPontoEquilibrioGeral: calcularPontoEquilibrioGeral,
    formatarMoeda: formatarMoeda,
    formatarPercentual: formatarPercentual,
    calcularPaybackDescontado: calcularPaybackDescontado,
    formatarPeriodo: formatarPeriodo,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Calc = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
