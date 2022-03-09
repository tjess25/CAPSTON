var hlist = document.getElementById('habitatsList');

myHabitats.forEach(x => {
    hlist.innerHTML += `<li class="list-group-item">
        <div class="btn-toolbar text-center">
            <a href="#" role="button" class="btn btn-success" onclick="select('${x}')">${x}</a>
        </div>
    </li>`;
});

function select(h) {
    setActiveHabitat(h);
    location.href = '/menu.html';
}