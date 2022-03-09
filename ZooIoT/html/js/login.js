async function login(ev) {
    ev.preventDefault();

    var username = document.getElementById('userInput').value;
    var password = document.getElementById('passwordInput').value;

    var login = await postCmd('login', {
        username,
        password
    });

    if (login.success) {
        setMyHabitats(login.data);
        console.log(myHabitats);
        if (myHabitats[0] == 'admin')
            redirect('adminhabitats');
        else
            redirect('habitats');
    } else {
        alert('Credenciales inválidas.');
    }
}