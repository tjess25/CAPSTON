async function loadHabitats() {
    var listGroup = document.getElementById('listGroup');
    var habitats = await sendCmd('allHabitats');

    habitats.data.forEach(h => {
        listGroup.innerHTML += `<li class="list-group-item"><div class="btn-toolbar text-center">
                <a role="button" class="btn btn-success" onclick="adminHabitat('${h}')">Administrar Usuarios ${h}</a>
            </div></li>`;
    });
}

function adminHabitat(ha) {
    setActiveHabitat(ha);
    redirect('userhabitat')
}

loadHabitats();