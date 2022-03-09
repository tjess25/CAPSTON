async function addHabitat(ev) {
    ev.preventDefault();
    var name = getElement('nameInput').value;

    var mintemp = getElement('tempminInput').value;
    var maxtemp = getElement('tempmaxInput').value;
    var minhum = getElement('humInput').value;
    var h_on = getElement('timeinitInput').value;
    var h_off = getElement('timeendInput').value;

    var response = await postCmd('addHabitat', {
        name,
        config: {
            mintemp,
            maxtemp,
            minhum,
            h_on,
            h_off
        }
    });

    if (response.success) {
        alert('Habitat creada correctamente.');

        var listGroup = document.getElementById('listGroup');
        listGroup.innerHTML += `<li class="list-group-item"><div class="btn-toolbar text-center">
                <a role="button" class="btn btn-success" onclick="adminHabitat('${ha}')">Administrar Usuarios ${ha}</a>
            </div></li>`;
    }
    else
        alert('Ocurrió un error al crear el habitat.');
}