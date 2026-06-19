/* ================================================================
   MINDBRIDGE — MENSAGENS DIRETAS (JavaScript v1)
   Arquivo: mindbridge-mensagens.js

   Tudo roda no cliente (sem backend). Conversas, mensagens e
   contatos adicionados ficam salvos em localStorage para persistir
   entre sessões. Respostas da "outra pessoa" são simuladas com um
   pequeno atraso e indicador de "digitando...", só para tornar a
   experiência de demonstração mais viva — nada é enviado para
   nenhum servidor.

   ÍNDICE
   ──────
   0.  Dados base (contatos sugeridos + conversas iniciais)
   1.  Utilitários (toast, escapar HTML, tempo relativo, persistência)
   2.  Estado em memória
   3.  Renderização da sidebar (lista de conversas)
   4.  Busca e filtros da sidebar
   5.  Abertura/fechamento de conversa (+ comportamento mobile)
   6.  Renderização de mensagens no corpo do chat
   7.  Envio de mensagem + resposta simulada
   8.  Menu "mais opções" (favoritar, silenciar, bloquear, denunciar)
   9.  Modal "Encontrar pessoas"
   10. Modal "Chamada" (voz / vídeo)
   11. Inicialização
================================================================ */

document.addEventListener('DOMContentLoaded', function () {

    /* ============================================================
       0. DADOS BASE
    ============================================================ */
  
    /* Pessoas sugeridas para iniciar conversa — usadas no modal
       "Encontrar pessoas". Algumas já têm conversa, outras não. */
    var PESSOAS_SUGERIDAS = [
      { id: 'ana',       nome: 'Ana Gabrielly',  tema: 'ansiedade',       tag: 'Grupo: Ansiedade & Pânico' },
      { id: 'rafael',    nome: 'Rafael Lima',    tema: 'ansiedade',       tag: 'Grupo: Ansiedade & Pânico' },
      { id: 'camila',    nome: 'Camila Souza',   tema: 'burnout',         tag: 'Grupo: Burnout & Carreira' },
      { id: 'daniel',    nome: 'Daniel Alves',   tema: 'luto',            tag: 'Grupo: Luto & Perdas' },
      { id: 'beatriz',   nome: 'Beatriz Nunes',  tema: 'autoestima',      tag: 'Grupo: Autoestima' },
      { id: 'lucas',     nome: 'Lucas Tavares',  tema: 'relacionamentos', tag: 'Grupo: Relacionamentos' },
      { id: 'fernanda',  nome: 'Fernanda Costa', tema: 'ansiedade',       tag: 'Grupo: Ansiedade & Pânico' },
      { id: 'gabriel',   nome: 'Gabriel Rocha',  tema: 'sono',            tag: 'Grupo: Sono & Descanso' },
      { id: 'juliana',   nome: 'Juliana Prado',  tema: 'sono',            tag: 'Grupo: Sono & Descanso' },
      { id: 'pedro',     nome: 'Pedro Henrique', tema: 'burnout',         tag: 'Grupo: Burnout & Carreira' }
    ];
  
    /* Conversas iniciais que já existem quando a página carrega,
       simulando um histórico prévio. Cada mensagem tem remetente
       ('eu' ou 'outro'), texto e minutosAtras (usado para gerar
       horário relativo na primeira renderização). */
    var CONVERSAS_INICIAIS = [
      {
        id: 'ana', nome: 'Ana Gabrielly', online: true, favorita: false,
        mensagens: [
          { de: 'outro', texto: 'Oi! Vi sua mensagem no grupo de Ansiedade, tudo bem?', minutosAtras: 50 },
          { de: 'eu',    texto: 'Oi Ana! Tudo bem sim, melhorando aos poucos. E você?', minutosAtras: 45 },
          { de: 'outro', texto: 'Também. Hoje foi um dia mais leve. Obrigada por perguntar 💜', minutosAtras: 40 }
        ]
      },
      {
        id: 'rafael', nome: 'Rafael Lima', online: false, favorita: true,
        mensagens: [
          { de: 'outro', texto: 'A técnica de respiração 4-7-8 que você comentou realmente ajudou.', minutosAtras: 220 },
          { de: 'eu',    texto: 'Que bom! Eu uso bastante antes de dormir também.', minutosAtras: 200 }
        ]
      },
      {
        id: 'camila', nome: 'Camila Souza', online: true, favorita: false,
        mensagens: [
          { de: 'outro', texto: 'Como foi sua semana de volta ao trabalho?', minutosAtras: 30 }
        ]
      },
      {
        id: 'daniel', nome: 'Daniel Alves', online: false, favorita: false,
        mensagens: [
          { de: 'eu',    texto: 'Pensando em você hoje. Como você está?', minutosAtras: 1500 },
          { de: 'outro', texto: 'Obrigado por lembrar. Hoje está sendo um dia mais difícil, mas vou superando aos poucos.', minutosAtras: 1450 }
        ]
      }
    ];
  
    /* Respostas simuladas curtas, sorteadas quando o usuário envia
       uma mensagem — apenas para dar vida à demonstração. */
    var RESPOSTAS_SIMULADAS = [
      'Obrigada por compartilhar isso comigo 💜',
      'Entendo completamente o que você está sentindo.',
      'Estou aqui, pode falar à vontade.',
      'Isso faz muito sentido. Como você está se sentindo agora?',
      'Fico feliz que você tenha me contado isso.',
      'Você não está sozinho(a) nisso.',
      'Que bom que você passou por aqui hoje.'
    ];
  
  
    /* ============================================================
       1. UTILITÁRIOS
    ============================================================ */
  
    function escaparHTML(texto) {
      var div = document.createElement('div');
      div.textContent = texto;
      return div.innerHTML;
    }
  
    var toastTimeout;
    function mostrarToast(mensagem, tipo) {
      var toast      = document.getElementById('toast');
      var toastTexto = document.getElementById('toastTexto');
      if (!toast) return;
      toastTexto.textContent = mensagem;
      toast.classList.remove('toast-erro', 'toast-sucesso');
      if (tipo === 'erro')    toast.classList.add('toast-erro');
      if (tipo === 'sucesso') toast.classList.add('toast-sucesso');
      toast.classList.add('visivel');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(function () {
        toast.classList.remove('visivel', 'toast-erro', 'toast-sucesso');
      }, 2600);
    }
  
    /** Retorna "HH:MM" a partir de um objeto Date. */
    function horaCurta(data) {
      var h = data.getHours().toString().padStart(2, '0');
      var m = data.getMinutes().toString().padStart(2, '0');
      return h + ':' + m;
    }
  
    /** Tempo relativo curto para a lista de conversas (ex: "5 min", "2h", "Ontem"). */
    function tempoRelativoCurto(data) {
      var diff = Math.floor((Date.now() - data.getTime()) / 60000); /* minutos */
      if (diff < 1)     return 'agora';
      if (diff < 60)    return diff + ' min';
      if (diff < 1440)  return Math.floor(diff / 60) + 'h';
      if (diff < 2880)  return 'Ontem';
      return Math.floor(diff / 1440) + 'd';
    }
  
    function iniciaisDe(nome) {
      return nome.split(' ').slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
    }
  
    /* Persistência simples em localStorage; falha silenciosamente
       em modo privado ou se o storage estiver bloqueado. */
    function salvarConversas() {
      try { localStorage.setItem('mb_conversas', JSON.stringify(estado.conversas)); } catch (e) {}
    }
    function carregarConversas() {
      try {
        var salvas = localStorage.getItem('mb_conversas');
        return salvas ? JSON.parse(salvas) : null;
      } catch (e) { return null; }
    }
  
  
    /* ============================================================
       2. ESTADO EM MEMÓRIA
    ============================================================ */
  
    var estado = {
      conversas: [],       /* lista de conversas, cada uma com mensagens já com timestamp absoluto (ISO) */
      conversaAtivaId: null,
      filtroAtual: 'todas',
      buscaAtual: ''
    };
  
    /** Converte CONVERSAS_INICIAIS (minutosAtras) em timestamps absolutos ISO,
     *  usado apenas na primeiríssima visita (sem dados salvos). */
    function montarConversasIniciais() {
      return CONVERSAS_INICIAIS.map(function (c) {
        return {
          id: c.id,
          nome: c.nome,
          online: c.online,
          favorita: c.favorita,
          naoLidas: 0,
          mensagens: c.mensagens.map(function (m) {
            var ts = new Date(Date.now() - m.minutosAtras * 60000).toISOString();
            return { de: m.de, texto: m.texto, ts: ts };
          })
        };
      });
    }
  
    function inicializarEstado() {
      var salvas = carregarConversas();
      estado.conversas = (salvas && salvas.length) ? salvas : montarConversasIniciais();
    }
  
    function buscarConversa(id) {
      return estado.conversas.find(function (c) { return c.id === id; });
    }
  
    function ultimaMensagem(conversa) {
      return conversa.mensagens.length ? conversa.mensagens[conversa.mensagens.length - 1] : null;
    }
  
  
    /* ============================================================
       3. RENDERIZAÇÃO DA SIDEBAR (lista de conversas)
    ============================================================ */
  
    var msgLista      = document.getElementById('msgLista');
    var msgListaVazia = document.getElementById('msgListaVazia');
  
    function ordenarConversasPorRecencia(lista) {
      return lista.slice().sort(function (a, b) {
        var ua = ultimaMensagem(a), ub = ultimaMensagem(b);
        var ta = ua ? new Date(ua.ts).getTime() : 0;
        var tb = ub ? new Date(ub.ts).getTime() : 0;
        return tb - ta;
      });
    }
  
    function renderizarLista() {
      if (!msgLista) return;
  
      var lista = ordenarConversasPorRecencia(estado.conversas);
  
      /* Filtro por chip ativo */
      if (estado.filtroAtual === 'nao-lidas') {
        lista = lista.filter(function (c) { return c.naoLidas > 0; });
      } else if (estado.filtroAtual === 'favoritas') {
        lista = lista.filter(function (c) { return c.favorita; });
      }
  
      /* Filtro por texto de busca (nome) */
      if (estado.buscaAtual.trim()) {
        var termo = estado.buscaAtual.trim().toLowerCase();
        lista = lista.filter(function (c) { return c.nome.toLowerCase().indexOf(termo) !== -1; });
      }
  
      msgLista.innerHTML = '';
  
      if (!lista.length) {
        msgListaVazia.hidden = false;
        return;
      }
      msgListaVazia.hidden = true;
  
      lista.forEach(function (c) {
        var ultima = ultimaMensagem(c);
        var preview = ultima
          ? (ultima.de === 'eu' ? 'Você: ' : '') + ultima.texto
          : 'Começe a conversar...';
        var hora = ultima ? tempoRelativoCurto(new Date(ultima.ts)) : '';
  
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'msg-item' + (c.id === estado.conversaAtivaId ? ' ativo' : '') + (c.naoLidas > 0 ? ' nao-lida' : '');
        item.setAttribute('data-conversa-id', c.id);
  
        item.innerHTML =
          '<div class="msg-item-avatar-wrap">' +
            '<div class="msg-avatar">' + escaparHTML(iniciaisDe(c.nome)) + '</div>' +
            '<span class="msg-item-status-ponto' + (c.online ? '' : ' offline') + '"></span>' +
          '</div>' +
          '<div class="msg-item-conteudo">' +
            '<div class="msg-item-linha-topo">' +
              '<span class="msg-item-nome">' +
                (c.favorita ? '<i class="ti ti-star-filled"></i>' : '') +
                escaparHTML(c.nome) +
              '</span>' +
              '<span class="msg-item-hora">' + escaparHTML(hora) + '</span>' +
            '</div>' +
            '<div class="msg-item-linha-baixo">' +
              '<span class="msg-item-preview">' + escaparHTML(preview) + '</span>' +
              (c.naoLidas > 0 ? '<span class="msg-item-badge">' + c.naoLidas + '</span>' : '') +
            '</div>' +
          '</div>';
  
        item.addEventListener('click', function () { abrirConversa(c.id); });
        msgLista.appendChild(item);
      });
    }
  
  
    /* ============================================================
       4. BUSCA E FILTROS DA SIDEBAR
    ============================================================ */
  
    var msgBuscaInput = document.getElementById('msgBuscaInput');
    if (msgBuscaInput) {
      msgBuscaInput.addEventListener('input', function () {
        estado.buscaAtual = msgBuscaInput.value;
        renderizarLista();
      });
    }
  
    document.querySelectorAll('.msg-filtro-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.msg-filtro-chip').forEach(function (c) { c.classList.remove('ativo'); });
        chip.classList.add('ativo');
        estado.filtroAtual = chip.getAttribute('data-filtro-conversa');
        renderizarLista();
      });
    });
  
  
    /* ============================================================
       5. ABERTURA/FECHAMENTO DE CONVERSA (+ comportamento mobile)
    ============================================================ */
  
    var msgShell       = document.querySelector('.msg-shell');
    var msgChatVazio    = document.getElementById('msgChatVazio');
    var msgConversaBox  = document.getElementById('msgConversa');
    var msgConversaNome   = document.getElementById('msgConversaNome');
    var msgConversaAvatar = document.getElementById('msgConversaAvatar');
    var msgConversaStatus = document.getElementById('msgConversaStatus');
    var msgVoltar = document.getElementById('msgVoltar');
  
    function abrirConversa(id) {
      var conversa = buscarConversa(id);
      if (!conversa) return;
  
      estado.conversaAtivaId = id;
      conversa.naoLidas = 0; /* marca como lida ao abrir */
  
      /* Atualiza cabeçalho da conversa */
      msgConversaNome.textContent = conversa.nome;
      msgConversaAvatar.textContent = iniciaisDe(conversa.nome);
      msgConversaStatus.innerHTML = '<span class="msg-status-ponto"></span> ' + (conversa.online ? 'Online agora' : 'Offline');
      msgConversaStatus.classList.toggle('offline', !conversa.online);
  
      /* Atualiza estado visual do botão "favoritar" no menu */
      var btnFav = document.getElementById('btnFavoritar');
      if (btnFav) {
        btnFav.classList.toggle('ativo', !!conversa.favorita);
        btnFav.querySelector('span').textContent = conversa.favorita ? 'Remover dos favoritos' : 'Favoritar conversa';
      }
  
      /* Mostra a área de conversa, esconde o estado vazio */
      msgChatVazio.hidden = true;
      msgConversaBox.hidden = false;
  
      /* No mobile, desliza para a tela de chat */
      if (msgShell) msgShell.classList.add('mostrando-chat');
  
      renderizarMensagens(conversa);
      renderizarLista(); /* para refletir "ativo" e remover badge de não lida */
      salvarConversas();
  
      /* Foca no campo de digitação (sem rolar a página) */
      var textarea = document.getElementById('msgTextarea');
      if (textarea) setTimeout(function () { textarea.focus({ preventScroll: true }); }, 150);
    }
  
    if (msgVoltar && msgShell) {
      msgVoltar.addEventListener('click', function () {
        msgShell.classList.remove('mostrando-chat');
      });
    }
  
    var btnEncontrarVazio = document.getElementById('btnEncontrarVazio');
    if (btnEncontrarVazio) btnEncontrarVazio.addEventListener('click', abrirModalPessoas);
  
  
    /* ============================================================
       6. RENDERIZAÇÃO DE MENSAGENS NO CORPO DO CHAT
    ============================================================ */
  
    var msgCorpo = document.getElementById('msgCorpo');
  
    function formatarDivisorData(data) {
      var hoje = new Date();
      var ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
      var mesmodia = function (a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
      };
      if (mesmodia(data, hoje))  return 'Hoje';
      if (mesmodia(data, ontem)) return 'Ontem';
      return data.toLocaleDateString('pt-BR');
    }
  
    function renderizarMensagens(conversa) {
      msgCorpo.innerHTML = '';
      var ultimoDivisor = null;
  
      conversa.mensagens.forEach(function (m) {
        var data = new Date(m.ts);
        var rotuloData = formatarDivisorData(data);
  
        if (rotuloData !== ultimoDivisor) {
          var divisor = document.createElement('div');
          divisor.className = 'msg-data-divisor';
          divisor.textContent = rotuloData;
          msgCorpo.appendChild(divisor);
          ultimoDivisor = rotuloData;
        }
  
        var linha = document.createElement('div');
        linha.className = 'msg-bolha-linha ' + (m.de === 'eu' ? 'enviada' : 'recebida');
        linha.innerHTML =
          '<div class="msg-bolha">' +
            escaparHTML(m.texto) +
            '<span class="msg-bolha-hora">' + horaCurta(data) + '</span>' +
          '</div>';
        msgCorpo.appendChild(linha);
      });
  
      rolarParaFinal();
    }
  
    function rolarParaFinal() {
      requestAnimationFrame(function () { msgCorpo.scrollTop = msgCorpo.scrollHeight; });
    }
  
  
    /* ============================================================
       7. ENVIO DE MENSAGEM + RESPOSTA SIMULADA
    ============================================================ */
  
    var msgTextarea  = document.getElementById('msgTextarea');
    var msgEnviarBtn = document.getElementById('msgEnviarBtn');
    var msgDigitando = document.getElementById('msgDigitando');
    var msgDigitandoAvatar = document.getElementById('msgDigitandoAvatar');
  
    if (msgTextarea) {
      msgTextarea.addEventListener('input', function () {
        msgEnviarBtn.disabled = msgTextarea.value.trim().length === 0;
        /* Auto-cresce a textarea até o limite definido no CSS (max-height) */
        msgTextarea.style.height = 'auto';
        msgTextarea.style.height = Math.min(msgTextarea.scrollHeight, 110) + 'px';
      });
  
      msgTextarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          enviarMensagem();
        }
      });
    }
  
    if (msgEnviarBtn) msgEnviarBtn.addEventListener('click', enviarMensagem);
  
    function enviarMensagem() {
      var texto = msgTextarea.value.trim();
      if (!texto || !estado.conversaAtivaId) return;
  
      var conversa = buscarConversa(estado.conversaAtivaId);
      if (!conversa) return;
  
      conversa.mensagens.push({ de: 'eu', texto: texto, ts: new Date().toISOString() });
  
      msgTextarea.value = '';
      msgTextarea.style.height = 'auto';
      msgEnviarBtn.disabled = true;
  
      renderizarMensagens(conversa);
      renderizarLista();
      salvarConversas();
  
      /* Simula a outra pessoa digitando e respondendo, só para dar
         vida à demonstração — nenhuma chamada de rede é feita. */
      simularResposta(conversa);
    }
  
    function simularResposta(conversa) {
      if (!conversa.online) return; /* pessoas offline não respondem na hora */
  
      msgDigitandoAvatar.textContent = iniciaisDe(conversa.nome);
      msgDigitando.hidden = false;
      rolarParaFinal();
  
      var atraso = 1400 + Math.random() * 1600;
      setTimeout(function () {
        /* Garante que a conversa ainda está aberta antes de inserir a resposta */
        msgDigitando.hidden = true;
        if (estado.conversaAtivaId !== conversa.id) {
          /* Usuário trocou de conversa: ainda registra a resposta,
             só não mexe na tela atual, e marca como não lida. */
          var respostaTexto = RESPOSTAS_SIMULADAS[Math.floor(Math.random() * RESPOSTAS_SIMULADAS.length)];
          conversa.mensagens.push({ de: 'outro', texto: respostaTexto, ts: new Date().toISOString() });
          conversa.naoLidas = (conversa.naoLidas || 0) + 1;
          renderizarLista();
          salvarConversas();
          return;
        }
  
        var respostaTexto = RESPOSTAS_SIMULADAS[Math.floor(Math.random() * RESPOSTAS_SIMULADAS.length)];
        conversa.mensagens.push({ de: 'outro', texto: respostaTexto, ts: new Date().toISOString() });
        renderizarMensagens(conversa);
        renderizarLista();
        salvarConversas();
      }, atraso);
    }
  
  
    /* ============================================================
       8. MENU "MAIS OPÇÕES"
    ============================================================ */
  
    var btnMais     = document.getElementById('btnMais');
    var msgMenuMais = document.getElementById('msgMenuMais');
  
    if (btnMais && msgMenuMais) {
      btnMais.addEventListener('click', function (e) {
        e.stopPropagation();
        msgMenuMais.classList.toggle('aberto');
      });
      document.addEventListener('click', function (e) {
        if (!msgMenuMais.contains(e.target) && e.target !== btnMais) {
          msgMenuMais.classList.remove('aberto');
        }
      });
    }
  
    document.querySelectorAll('.msg-menu-mais button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var acao = btn.getAttribute('data-acao');
        var conversa = buscarConversa(estado.conversaAtivaId);
        msgMenuMais.classList.remove('aberto');
        if (!conversa) return;
  
        if (acao === 'favoritar') {
          conversa.favorita = !conversa.favorita;
          salvarConversas();
          renderizarLista();
          btn.classList.toggle('ativo', conversa.favorita);
          btn.querySelector('span').textContent = conversa.favorita ? 'Remover dos favoritos' : 'Favoritar conversa';
          mostrarToast(conversa.favorita ? 'Conversa favoritada ⭐' : 'Removida dos favoritos');
        } else if (acao === 'silenciar') {
          mostrarToast('Notificações silenciadas para essa conversa.');
        } else if (acao === 'perfil') {
          mostrarToast('Em breve: visualização de perfil completo.');
        } else if (acao === 'bloquear') {
          mostrarToast('Pessoa bloqueada. Você não receberá mais mensagens dela.', 'erro');
        } else if (acao === 'denunciar') {
          mostrarToast('Denúncia enviada à nossa equipe de moderação.', 'erro');
        }
      });
    });
  
  
    /* ============================================================
       9. MODAL "ENCONTRAR PESSOAS"
    ============================================================ */
  
    var mpOverlay      = document.getElementById('mpOverlay');
    var mpFechar       = document.getElementById('mpFechar');
    var mpBuscaInput   = document.getElementById('mpBuscaInput');
    var mpResultados   = document.getElementById('mpResultados');
    var mpVazio        = document.getElementById('mpVazio');
    var btnNovaConversa = document.getElementById('btnNovaConversa');
  
    var mpTemaAtual = 'todos';
  
    function abrirModalPessoas() {
      if (!mpOverlay) return;
      mpBuscaInput.value = '';
      mpTemaAtual = 'todos';
      document.querySelectorAll('.mp-tema-chip').forEach(function (c) {
        c.classList.toggle('ativo', c.getAttribute('data-tema-pessoa') === 'todos');
      });
      renderizarPessoas();
      mpOverlay.classList.add('aberto');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { mpBuscaInput.focus(); }, 80);
    }
  
    function fecharModalPessoas() {
      if (!mpOverlay) return;
      mpOverlay.classList.remove('aberto');
      document.body.style.overflow = '';
    }
  
    if (btnNovaConversa) btnNovaConversa.addEventListener('click', abrirModalPessoas);
    if (mpFechar) mpFechar.addEventListener('click', fecharModalPessoas);
    if (mpOverlay) {
      mpOverlay.addEventListener('click', function (e) { if (e.target === mpOverlay) fecharModalPessoas(); });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mpOverlay && mpOverlay.classList.contains('aberto')) fecharModalPessoas();
    });
  
    document.querySelectorAll('.mp-tema-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.mp-tema-chip').forEach(function (c) { c.classList.remove('ativo'); });
        chip.classList.add('ativo');
        mpTemaAtual = chip.getAttribute('data-tema-pessoa');
        renderizarPessoas();
      });
    });
  
    if (mpBuscaInput) mpBuscaInput.addEventListener('input', renderizarPessoas);
  
    function renderizarPessoas() {
      var termo = mpBuscaInput.value.trim().toLowerCase();
  
      var lista = PESSOAS_SUGERIDAS.filter(function (p) {
        var bateTema  = mpTemaAtual === 'todos' || p.tema === mpTemaAtual;
        var bateBusca = !termo || p.nome.toLowerCase().indexOf(termo) !== -1;
        return bateTema && bateBusca;
      });
  
      mpResultados.innerHTML = '';
  
      if (!lista.length) {
        mpVazio.hidden = false;
        return;
      }
      mpVazio.hidden = true;
  
      lista.forEach(function (p) {
        var jaTemConversa = !!buscarConversa(p.id);
  
        var item = document.createElement('div');
        item.className = 'mp-pessoa';
        item.innerHTML =
          '<div class="msg-avatar">' + escaparHTML(iniciaisDe(p.nome)) + '</div>' +
          '<div class="mp-pessoa-info">' +
            '<span class="mp-pessoa-nome">' + escaparHTML(p.nome) + '</span>' +
            '<span class="mp-pessoa-tag">' + escaparHTML(p.tag) + '</span>' +
          '</div>' +
          '<button type="button" class="mp-pessoa-btn' + (jaTemConversa ? ' ja-conversa' : '') + '">' +
            (jaTemConversa
              ? '<i class="ti ti-message-circle"></i> Conversar'
              : '<i class="ti ti-plus"></i> Adicionar') +
          '</button>';
  
        item.querySelector('.mp-pessoa-btn').addEventListener('click', function () {
          iniciarOuAbrirConversa(p);
        });
  
        mpResultados.appendChild(item);
      });
    }
  
    function iniciarOuAbrirConversa(pessoa) {
      var existente = buscarConversa(pessoa.id);
  
      if (!existente) {
        estado.conversas.push({
          id: pessoa.id,
          nome: pessoa.nome,
          online: Math.random() > 0.35, /* a maioria aparece online para a demo ficar viva */
          favorita: false,
          naoLidas: 0,
          mensagens: []
        });
        salvarConversas();
        mostrarToast(pessoa.nome + ' adicionado(a) às suas conversas 💜', 'sucesso');
      }
  
      fecharModalPessoas();
      renderizarLista();
      abrirConversa(pessoa.id);
    }
  
  
    /* ============================================================
       10. MODAL "CHAMADA" (voz / vídeo)
    ============================================================ */
  
    var chOverlay      = document.getElementById('chOverlay');
    var chTipo         = document.getElementById('chTipo');
    var chAvatarGrande = document.getElementById('chAvatarGrande');
    var chNomeEl       = document.getElementById('chNome');
    var chStatus       = document.getElementById('chStatus');
    var chEncerrar     = document.getElementById('chEncerrar');
    var chMudo         = document.getElementById('chMudo');
    var chAltoFalante  = document.getElementById('chAltoFalante');
  
    var chTimeoutConectar, chIntervaloDuracao, chSegundosDecorridos;
  
    function abrirChamada(tipoChamada) {
      var conversa = buscarConversa(estado.conversaAtivaId);
      if (!conversa || !chOverlay) return;
  
      chTipo.textContent = tipoChamada === 'video' ? 'Chamada de vídeo' : 'Chamada de voz';
      chAvatarGrande.textContent = iniciaisDe(conversa.nome);
      chNomeEl.textContent = conversa.nome;
      chStatus.textContent = conversa.online ? 'Chamando...' : 'Tocando — pode levar um momento...';
      chStatus.classList.remove('conectada');
      chMudo.classList.remove('ativo');
      chAltoFalante.classList.remove('ativo');
  
      chOverlay.classList.add('aberto');
      document.body.style.overflow = 'hidden';
  
      /* Simula a chamada sendo atendida após alguns segundos */
      chSegundosDecorridos = 0;
      clearTimeout(chTimeoutConectar);
      clearInterval(chIntervaloDuracao);
  
      chTimeoutConectar = setTimeout(function () {
        if (!chOverlay.classList.contains('aberto')) return; /* já foi encerrada */
        chStatus.textContent = '00:00';
        chStatus.classList.add('conectada');
        chIntervaloDuracao = setInterval(function () {
          chSegundosDecorridos++;
          var min = Math.floor(chSegundosDecorridos / 60).toString().padStart(2, '0');
          var seg = (chSegundosDecorridos % 60).toString().padStart(2, '0');
          chStatus.textContent = min + ':' + seg;
        }, 1000);
      }, conversa.online ? 1800 : 3200);
    }
  
    function fecharChamada() {
      if (!chOverlay) return;
      chOverlay.classList.remove('aberto');
      document.body.style.overflow = '';
      clearTimeout(chTimeoutConectar);
      clearInterval(chIntervaloDuracao);
      mostrarToast('Chamada encerrada.');
    }
  
    var btnLigar = document.getElementById('btnLigar');
    var btnVideo = document.getElementById('btnVideo');
    if (btnLigar) btnLigar.addEventListener('click', function () { abrirChamada('voz'); });
    if (btnVideo) btnVideo.addEventListener('click', function () { abrirChamada('video'); });
    if (chEncerrar) chEncerrar.addEventListener('click', fecharChamada);
  
    if (chMudo) chMudo.addEventListener('click', function () {
      chMudo.classList.toggle('ativo');
      var icone = chMudo.querySelector('i');
      icone.className = chMudo.classList.contains('ativo') ? 'ti ti-microphone-off' : 'ti ti-microphone';
    });
    if (chAltoFalante) chAltoFalante.addEventListener('click', function () {
      chAltoFalante.classList.toggle('ativo');
    });
  
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && chOverlay && chOverlay.classList.contains('aberto')) fecharChamada();
    });
  
  
    /* ============================================================
       11. INICIALIZAÇÃO
    ============================================================ */
  
    inicializarEstado();
    renderizarLista();
  
  });