/* ================================================================
   MINDBRIDGE — LOGIN (JavaScript)
   Controla: mostrar/ocultar senha, validação do formulário,
   integração com API PHP e estado de "carregando".
================================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================================
     1. MOSTRAR / OCULTAR SENHA
     Alterna o tipo do input entre "password" e "text",
     trocando também o ícone do olho.
  ============================================================= */
  const btnSenha = document.getElementById('btn-ver-senha');
  const inputSenha = document.getElementById('password');

  if (btnSenha && inputSenha) {
    btnSenha.addEventListener('click', function () {
      const isPassword = inputSenha.type === 'password';
      inputSenha.type = isPassword ? 'text' : 'password';

      // Troca o ícone e o texto de acessibilidade junto com o estado
      this.querySelector('i').className = isPassword ? 'ti ti-eye-off' : 'ti ti-eye';
      this.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
    });
  }


  /* ============================================================
     2. VALIDAÇÃO DO FORMULÁRIO + INTEGRAÇÃO COM API
     Validamos e-mail e senha no envio, mostrando mensagens
     de erro específicas e destacando o campo problemático.
     Se válido, envia para o backend PHP via fetch().
  ============================================================= */
  const form = document.getElementById('loginForm');
  const inputEmail = document.getElementById('email');
  const grupoEmail = document.getElementById('grupoEmail');
  const grupoSenha = document.getElementById('grupoSenha');
  const btnEntrar = document.getElementById('btnEntrar');
  const checkboxLembrar = document.getElementById('lembrar');

  // Expressão regular simples para validar formato de e-mail
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Liga/desliga a classe "erro" em um grupo de input,
  // o que mostra a borda vermelha e a mensagem (ver CSS)
  function definirErro(grupo, temErro) {
    grupo.classList.toggle('erro', temErro);
  }

  if (form) {
    form.addEventListener('submit', async function (evento) {
      evento.preventDefault(); // impede o recarregamento padrão da página

      const emailValido = regexEmail.test(inputEmail.value.trim());
      const senhaValida = inputSenha.value.length >= 6;

      definirErro(grupoEmail, !emailValido);
      definirErro(grupoSenha, !senhaValida);

      // Se algum campo for inválido, paramos aqui e focamos nele
      if (!emailValido) {
        inputEmail.focus();
        return;
      }
      if (!senhaValida) {
        inputSenha.focus();
        return;
      }

      // Tudo válido: envia para o backend
      ativarCarregamento(true);

      try {
        const resposta = await fetch('api/login.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inputEmail.value.trim(),
            password: inputSenha.value,
            lembrar: checkboxLembrar.checked
          })
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {
          // Login bem-sucedido: redireciona para a home
          window.location.href = dados.redir || 'mindbridge-home.html';
        } else {
          // Erro retornado pelo backend
          ativarCarregamento(false);
          
          // Mostra mensagem de erro (pode ser um alert, toast, ou mensagem inline)
          mostrarErroGeral(dados.erro || 'E-mail ou senha inválidos.');
          
          // Opcional: destaca ambos os campos como erro
          // definirErro(grupoEmail, true);
          // definirErro(grupoSenha, true);
        }

      } catch (erro) {
        // Erro de conexão ou rede
        ativarCarregamento(false);
        console.error('Erro ao fazer login:', erro);
        mostrarErroGeral('Erro de conexão com o servidor. Tente novamente.');
      }
    });

    // Remove o erro do campo assim que o usuário começa a corrigi-lo,
    // em vez de esperar um novo envio do formulário
    inputEmail.addEventListener('input', function () {
      if (regexEmail.test(inputEmail.value.trim())) {
        definirErro(grupoEmail, false);
      }
    });

    inputSenha.addEventListener('input', function () {
      if (inputSenha.value.length >= 6) {
        definirErro(grupoSenha, false);
      }
    });
  }

  // Alterna a classe que ativa o spinner e desabilita o botão,
  // evitando múltiplos envios enquanto "carrega"
  function ativarCarregamento(ativo) {
    if (!btnEntrar) return;
    btnEntrar.classList.toggle('carregando', ativo);
    btnEntrar.disabled = ativo;
  }

  // Função auxiliar para mostrar erro geral (pode ser personalizada)
  function mostrarErroGeral(mensagem) {
    // Opção 1: Alert simples
    alert(mensagem);
    
    // Opção 2: Toast/notificação (descomente se tiver um sistema de toast)
    // criarToast(mensagem, 'erro');
    
    // Opção 3: Mensagem inline acima do formulário
    // const divErro = document.createElement('div');
    // divErro.className = 'mensagem-erro-geral';
    // divErro.textContent = mensagem;
    // form.insertBefore(divErro, form.firstChild);
    // setTimeout(() => divErro.remove(), 5000);
  }
/* ============================================================
   3. LOGIN COM GOOGLE (Google Identity Services)
   Abre o popup OAuth do Google. Ao confirmar, envia o
   credential token para o backend PHP validar.
============================================================= */
const CLIENT_ID = '457534457639-p83hooh96soj19g6mol3htsjjl6725g1.apps.googleusercontent.com'; // ← substitua

const btnGoogle = document.getElementById('btn-google');

if (btnGoogle) {
    // Inicializa o cliente Google quando a lib carregar
    window.google?.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
    });

    btnGoogle.addEventListener('click', function () {
        // Verifica se a biblioteca do Google já carregou
        if (typeof google === 'undefined') {
            mostrarErroGeral('Não foi possível carregar o login do Google. Verifique sua conexão.');
            return;
        }

        // Abre o popup de seleção de conta Google
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                // Fallback: abre via OAuth popup tradicional se o prompt não abrir
                abrirPopupGoogle();
            }
        });
    });
}

// Callback chamado pelo Google após o usuário autenticar
async function handleGoogleResponse(response) {
    const idToken = response.credential; // JWT do Google

    ativarCarregamento(true);

    try {
        const resposta = await fetch('api/login-google.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken })
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {
            window.location.href = dados.redir || 'mindbridge-home.html';
        } else {
            ativarCarregamento(false);
            mostrarErroGeral(dados.erro || 'Erro ao autenticar com o Google.');
        }
    } catch (erro) {
        ativarCarregamento(false);
        console.error('Erro no login Google:', erro);
        mostrarErroGeral('Erro de conexão. Tente novamente.');
    }
}

// Fallback: popup OAuth tradicional caso o Google One Tap não abra
function abrirPopupGoogle() {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: window.location.origin + '/api/callback-google.php',
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account'
    });

    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
    const popup = window.open(url, 'google-login', 'width=500,height=600,left=200,top=100');

    // Escuta mensagem de retorno do popup (se usar callback via postMessage)
    window.addEventListener('message', function onMsg(event) {
        if (event.origin !== window.location.origin) return;
        if (event.data?.tipo === 'google-login-sucesso') {
            window.removeEventListener('message', onMsg);
            window.location.href = event.data.redir || 'mindbridge-home.html';
        }
    });
}
});