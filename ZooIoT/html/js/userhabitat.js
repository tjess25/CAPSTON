async function getUsers() {
    var users = await sendCmd(`habitatUsers?room=${activeHabitat}`);
    var userList = document.getElementById('userList');

    console.log(users.data);
    userList.innerHTML = '';
    users.data.forEach(u => {
        userList.innerHTML += `<tr id="rem${u}">
                        <td>${u}</td>
                        <td>
                            <a class="delete" title="Delete" data-toggle="tooltip" onclick="removeUser('${u}')"><i class="material-icons">&#xE872;</i></a>
                        </td>
                    </tr>`;
    });
}

async function removeUser(user) {
    var response = await sendCmd(`removeUser?usr=${user}&room=${activeHabitat}`);

    if (response.success) {
        alert('Usuario removido.');

        var usrTr = document.getElementById(`rem${user}`);
        if (usrTr)
            usrTr.remove();
    }
    else
        alert('Ocurrió un error al remover el usuario.');
}

async function addUser(user) {
    if (user == '') return;

    var response = await sendCmd(`addUser?usr=${user}&room=${activeHabitat}`);

    if (response.success) {
        alert('Usuario añadido.');
        var userList = document.getElementById('userList');

        userList.innerHTML += `<tr id="rem${user}">
                        <td>${user}</td>
                        <td>
                            <a class="delete" title="Delete" data-toggle="tooltip" onclick="removeUser('${user}')"><i class="material-icons">&#xE872;</i></a>
                        </td>
                    </tr>`;
    }
    else
        alert('Ocurrió un error al agregar el usuario.');
}

getUsers();