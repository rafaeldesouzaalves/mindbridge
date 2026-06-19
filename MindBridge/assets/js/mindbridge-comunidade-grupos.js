/* ================================================================
   MINDBRIDGE — COMUNIDADE: ENTRAR EM GRUPO (JS v1)
   Arquivo: mindbridge-comunidade-grupos.js

   O QUE ESTE ARQUIVO FAZ
   ───────────────────────
   1. Liga o clique em qualquer card de grupo (estático no HTML,
      ou criado dinamicamente pelo modal "Criar grupo" já existente
      em mindbridge-comunidade.js) ao modal "Entrar no grupo"
      (.ge-overlay), preenchendo nome, descrição, ícone, cor, temas,
      membros, privacidade e moderador a partir dos data-grupo-*
      do card (ou de um fallback lido do próprio DOM, para grupos
      criados na hora).

   2. Ao confirmar entrada ("Entrar no grupo"):
      a) Salva o grupo na lista de grupos do usuário, em
         localStorage, na MESMA chave que mindbridge-mensagens.js
         vai ler ('mb_grupos_participando') — é o contrato entre
         os dois arquivos.
      b) Redireciona para mindbridge-mensagens.html, passando o
         id do grupo via querystring (?grupo=<id>&aba=grupos),
         para a página de Mensagens já abrir direto na aba
         "Grupos" com aquele grupo selecionado.

   NÃO abre nenhum chat aqui — a página de Comunidade volta a ser
   só sobre descobrir/criar grupos e publicar no feed. O chat em
   si (mensagens, "digitando...", envio) vive inteiramente em
   mindbridge-mensagens.html / mindbridge-mensagens.js.

   ÍNDICE
   ──────
   0. Utilitários locais
   1. Leitura dos dados de um grupo a partir do card clicado
   2. Ativação de clique nos cards (estáticos + dinâmicos)
   3. Modal "Entrar no grupo" — abrir / fechar / preencher
   4. Persistir grupo + redirecionar para Mensagens
   5. Inicialização
================================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================================
     0. UTILITÁRIOS LOCAIS
  ============================================================ */

  function escaparHTML(texto) {
    var div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  var ROTULOS_TEMA = {
    ansiedade: 'Ansiedade', burnout: 'Burnout', luto: 'Luto',
    sono: 'Sono', autoestima: 'Autoestima',
    relacionamentos: 'Relacionamentos', outro: 'Outro'
  };

  /* Mapa de cor sólida por classe de cor do grupo — usado no banner
     do modal "Entrar no grupo", onde a cor é aplicada via style
     inline (o banner não tem uma classe .cor-* fixa no CSS). */
  var CORES_GRUPO = {
    'cor-ansiedade':       '#5A48C8',
    'cor-burnout':         '#2970C8',
    'cor-luto':            '#8B7BC4',
    'cor-sono':             '#1D9E75',
    'cor-autoestima':      '#E6A817',
    'cor-relacionamentos': '#E05C8A',
    'cor-outro':           '#888888'
  };


  /* ============================================================
     1. LEITURA DOS DADOS DE UM GRUPO A PARTIR DO CARD CLICADO
  ============================================================ */

  /**
   * Lê os dados de um grupo a partir do card clicado.
   * Prioriza os atributos data-grupo-*; quando ausentes (caso de
   * cards criados dinamicamente pelo botão "Criar grupo"), monta
   * os dados a partir do conteúdo visual do próprio card.
   * @param {HTMLElement} card
   * @returns {object} dados do grupo prontos para o modal
   */
  function lerDadosDoGrupo(card) {
    var ds = card.dataset;

    if (ds.grupoNome) {
      return {
        id: ds.grupoId || ds.grupoNome.toLowerCase().replace(/\s+/g, '-'),
        nome: ds.grupoNome,
        desc: ds.grupoDesc || 'Grupo de apoio da comunidade MindBridge.',
        icone: ds.grupoIcone || 'ti-users',
        cor: ds.grupoCor || 'cor-outro',
        temas: (ds.grupoTemas || 'outro').split(',').map(function (t) { return t.trim(); }),
        membros: parseInt(ds.grupoMembros, 10) || 1,
        moderador: ds.grupoModerador || 'Você',
        privacidade: ds.grupoPrivacidade || 'publico'
      };
    }

    /* Fallback: card criado dinamicamente, sem data-grupo-* */
    var nome   = (card.querySelector('h3') || {}).textContent || 'Grupo sem nome';
    var desc   = (card.querySelector('p')  || {}).textContent || 'Grupo de apoio da comunidade MindBridge.';
    var iconeEl = card.querySelector('.com-grupo-icone i');
    var icone  = iconeEl
      ? Array.from(iconeEl.classList).find(function (c) { return c.indexOf('ti-') === 0 && c !== 'ti'; })
      : 'ti-users';
    var corEl  = card.querySelector('.com-grupo-icone');
    var cor    = corEl
      ? Array.from(corEl.classList).find(function (c) { return c.indexOf('cor-') === 0; })
      : 'cor-outro';
    var temasEls = card.querySelectorAll('.com-grupo-tag-tema');
    var temas  = temasEls.length
      ? Array.from(temasEls).map(function (el) { return el.textContent.trim().toLowerCase(); })
      : ['outro'];
    var membrosTexto = (card.querySelector('.com-grupo-membros') || {}).textContent || '1 membro';
    var membros = parseInt(membrosTexto.replace(/\D/g, ''), 10) || 1;

    return {
      id: nome.toLowerCase().replace(/\s+/g, '-'),
      nome: nome,
      desc: desc,
      icone: icone || 'ti-users',
      cor: cor || 'cor-outro',
      temas: temas,
      membros: membros,
      moderador: 'Você (criador do grupo)',
      privacidade: membrosTexto.indexOf('Privado') !== -1 ? 'privado' : 'publico'
    };
  }


  /* ============================================================
     2. ATIVAÇÃO DE CLIQUE NOS CARDS (estáticos + dinâmicos)
  ============================================================ */

  function ativarCliqueNosGrupos() {
    var cards = document.querySelectorAll(
      '.com-grupos-grid > .com-grupo-card:not(.com-grupo-card-criar):not([data-clique-ativado])'
    );

    cards.forEach(function (card) {
      /* Marca como processado para não duplicar listeners caso esta
         função rode de novo (ex: após criar um grupo novo) */
      card.setAttribute('data-clique-ativado', 'true');
      card.classList.add('com-grupo-clicavel');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      card.addEventListener('click', function () {
        abrirModalEntrarGrupo(lerDadosDoGrupo(card));
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          abrirModalEntrarGrupo(lerDadosDoGrupo(card));
        }
      });
    });
  }


  /* ============================================================
     3. MODAL "ENTRAR NO GRUPO" — abrir / fechar / preencher
  ============================================================ */

  var geOverlay     = document.getElementById('geOverlay');
  var geFechar      = document.getElementById('geFechar');
  var geCancelar    = document.getElementById('geCancelar');
  var geBtnEntrar   = document.getElementById('geBtnEntrar');
  var geBanner      = document.getElementById('geBanner');
  var geBannerIcone = document.getElementById('geBannerIcone');
  var geNome        = document.getElementById('geNome');
  var geTemas       = document.getElementById('geTemas');
  var geDesc        = document.getElementById('geDesc');
  var geMetaMembros = document.getElementById('geMeta_membros');
  var geMetaPriv    = document.getElementById('geMeta_privacidade');
  var geMetaMod     = document.getElementById('geMeta_moderador');

  /* Guarda os dados do grupo atualmente aberto no modal, para usar
     ao confirmar a entrada (botão "Entrar no grupo"). */
  var grupoSelecionado = null;

  function abrirModalEntrarGrupo(dadosGrupo) {
    if (!geOverlay) return;
    grupoSelecionado = dadosGrupo;

    var corHex = CORES_GRUPO[dadosGrupo.cor] || CORES_GRUPO['cor-outro'];
    if (geBanner) geBanner.style.backgroundColor = corHex;
    if (geBannerIcone) geBannerIcone.className = 'ti ' + dadosGrupo.icone + ' ge-banner-icone';

    if (geNome) geNome.textContent = dadosGrupo.nome;
    if (geDesc) geDesc.textContent = dadosGrupo.desc;

    if (geTemas) {
      geTemas.innerHTML = dadosGrupo.temas
        .map(function (t) {
          var rotulo = ROTULOS_TEMA[t] || (t.charAt(0).toUpperCase() + t.slice(1));
          return '<span class="ge-tema-chip">' + escaparHTML(rotulo) + '</span>';
        })
        .join('');
    }

    if (geMetaMembros) {
      geMetaMembros.textContent = dadosGrupo.membros.toLocaleString('pt-BR') +
        (dadosGrupo.membros === 1 ? ' membro' : ' membros');
    }
    if (geMetaPriv) {
      geMetaPriv.textContent = dadosGrupo.privacidade === 'privado' ? 'Privado' : 'Público';
    }
    if (geMetaMod) {
      geMetaMod.textContent = 'Moderado por ' + dadosGrupo.moderador;
    }

    /* Texto do botão muda se o usuário já participa deste grupo,
       deixando claro que ele só vai ser levado para a conversa. */
    if (geBtnEntrar) {
      var jaParticipa = usuarioJaParticipaDoGrupo(dadosGrupo.id);
      geBtnEntrar.innerHTML = jaParticipa
        ? '<i class="ti ti-message-circle" aria-hidden="true"></i> Ir para a conversa'
        : '<i class="ti ti-door-enter" aria-hidden="true"></i> Entrar no grupo';
    }

    geOverlay.classList.add('aberto');
    document.body.style.overflow = 'hidden';
  }

  function fecharModalEntrarGrupo() {
    if (!geOverlay) return;
    geOverlay.classList.remove('aberto');
    document.body.style.overflow = '';
  }

  if (geFechar)   geFechar.addEventListener('click', fecharModalEntrarGrupo);
  if (geCancelar) geCancelar.addEventListener('click', fecharModalEntrarGrupo);
  if (geOverlay) {
    geOverlay.addEventListener('click', function (e) {
      if (e.target === geOverlay) fecharModalEntrarGrupo();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && geOverlay && geOverlay.classList.contains('aberto')) {
      fecharModalEntrarGrupo();
    }
  });


  /* ============================================================
     4. PERSISTIR GRUPO + REDIRECIONAR PARA MENSAGENS
  ============================================================ */

  /**
   * Lê a lista de grupos que o usuário já participa, salva em
   * localStorage sob a chave 'mb_grupos_participando'. Esta é a
   * MESMA chave lida por mindbridge-mensagens.js na aba "Grupos"
   * da sidebar — é o contrato de dados entre as duas páginas.
   * @returns {Array<object>}
   */
  function lerGruposParticipando() {
    try {
      return JSON.parse(localStorage.getItem('mb_grupos_participando') || '[]');
    } catch (e) { return []; }
  }

  function salvarGruposParticipando(lista) {
    try { localStorage.setItem('mb_grupos_participando', JSON.stringify(lista)); } catch (e) {}
  }

  function usuarioJaParticipaDoGrupo(grupoId) {
    return lerGruposParticipando().some(function (g) { return g.id === grupoId; });
  }

  /**
   * Garante que o grupo esteja salvo na lista de grupos do usuário
   * (sem duplicar caso ele já participe) e devolve o registro.
   * @param {object} dadosGrupo
   */
  function garantirGrupoSalvo(dadosGrupo) {
    var lista = lerGruposParticipando();
    var existente = lista.find(function (g) { return g.id === dadosGrupo.id; });

    if (existente) return existente;

    var novoRegistro = {
      id: dadosGrupo.id,
      nome: dadosGrupo.nome,
      desc: dadosGrupo.desc,
      icone: dadosGrupo.icone,
      cor: dadosGrupo.cor,
      temas: dadosGrupo.temas,
      membros: dadosGrupo.membros,
      moderador: dadosGrupo.moderador,
      privacidade: dadosGrupo.privacidade,
      entrouEm: new Date().toISOString()
    };

    lista.push(novoRegistro);
    salvarGruposParticipando(lista);
    return novoRegistro;
  }

  /* Confirmar entrada → salva o grupo e redireciona para a página
     de Mensagens, já indicando qual grupo abrir e em qual aba. */
  if (geBtnEntrar) {
    geBtnEntrar.addEventListener('click', function () {
      if (!grupoSelecionado) return;

      garantirGrupoSalvo(grupoSelecionado);

      /* [CORRIGIDO] O nome real do arquivo é "mindbridge-mensagens.html"
         (com "s" — confirme nos links do header/footer/menu mobile,
         todos usam essa grafia). Antes este redirecionamento apontava
         para "mindbridge-mensagem.html" (sem "s"), um link quebrado
         que levava a uma página inexistente. */
      var destino = 'mindbridge-mensagem.html'
        + '?aba=grupos'
        + '&grupo=' + encodeURIComponent(grupoSelecionado.id);

      window.location.href = destino;
    });
  }


  /* ============================================================
     5. INICIALIZAÇÃO
  ============================================================ */

  /* Ativa o clique nos grupos já presentes no HTML ao carregar */
  ativarCliqueNosGrupos();

  /* Observa a grade de grupos: sempre que um novo card for
     inserido (criação de grupo ou restauração do localStorage,
     ambas feitas por mindbridge-comunidade.js), reaplica o
     clique automaticamente, sem duplicar lógica lá. */
  var gruposGrid = document.querySelector('.com-grupos-grid');
  if (gruposGrid && window.MutationObserver) {
    var observer = new MutationObserver(function () {
      ativarCliqueNosGrupos();
    });
    observer.observe(gruposGrid, { childList: true });
  }

});