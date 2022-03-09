async function loadHabitats() {
    var listGroup = document.getElementById('habList');
    var habitats = await sendCmd('allHabitats');

    habitats.data.forEach(h => {
        listGroup.innerHTML += `<li class="list-group-item">
                                    <div class="btn-toolbar text-center">
                                        <a href="#" role="button" class="btn btn-success" onclick="graphHabitat('${h}')">${h}</a>
                                    </div>
                                </li>`;
    });
}

function graphHabitat(ha) {
    setActiveHabitat(ha);
    redirect('graphhist');
}

loadHabitats();