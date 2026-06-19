/* ================================================================
   MINDBRIDGE — LOGIN (JavaScript)
   Controla: mostrar/ocultar senha, validação do formulário,
   integração com API PHP e estado de "carregando".
================================================================ */

// Removido o espaço em branco interno
const local = "127.0.0.1"; 

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
      // Alterado para aceitar qualquer tamanho de senha (sem a trava de 6 dígitos)
      const senhaValida = inputSenha.value.trim().length > 0;

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
        // Corrigido: adicionado http:// e utilizando a constante local dinamicamente
        const urlAPI = `http://${local}/mindbridge/MindBridge/assets/api/login.php`;
        
        const resposta = await fetch(urlAPI, {
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
        }

      } catch (erro) {
        // Erro de conexão ou rede
        ativarCarregamento(false);
        console.error('Erro ao fazer login:', erro);
        mostrarErroGeral('Erro de conexão com o servidor. Tente novamente.');
      }
    });

    // Remove o erro do campo assim que o usuário começa a corrigi-lo
    inputEmail.addEventListener('input', function () {
      if (regexEmail.test(inputEmail.value.trim())) {
        definirErro(grupoEmail, false);
      }
    });

    inputSenha.addEventListener('input', function () {
      if (inputSenha.value.trim().length > 0) {
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

  // Função auxiliar para mostrar erro geral
  function mostrarErroGeral(mensagem) {
    alert(mensagem);
  }

});
