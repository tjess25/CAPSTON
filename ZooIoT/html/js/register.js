async function registerMe(ev) {
    ev.preventDefault();

    var username = document.getElementById('userInput').value;
    var password = document.getElementById('passwordInput').value;

    var result = await postCmd('register', {
        username,
        password
    });

    if (result.success) {
        alert('Registrado correctamente. Puede iniciar sesión.');
        redirect('login');
    } else {
        alert('No pudimos registrar tu usuario.');
    }
}