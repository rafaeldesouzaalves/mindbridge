const btnSenha = document.getElementById('btn-ver-senha')
const inputSenha = document.getElementById('password')

if (btnSenha) {
    btnSenha.addEventListener('click', function() {
        const isPassword = inputSenha.type === 'password'
        inputSenha.type = isPassword ? 'text' : 'password'
        this.querySelector('i').className = isPassword ? 'ti ti-eye-off' : 'ti ti-eye'
    })
}