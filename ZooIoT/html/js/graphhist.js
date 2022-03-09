var chart;
var config = {
    type: 'line',
    data: {
        labels: ['Cargando gráfico...'],
        dataset: [{
            label: 'Cargando gráfico...',
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            data: [100],
        }]
    }
};

function updateGraph() {
    var input = getElement('graph').value;

    graph(input);
}

async function graph(date) {
    var response = await sendCmd(`graph?room=${activeHabitat}&date=${date}`);

    if (response.success) {
        var labels = response.data.map(x => {
            var date = new Date(x.timeStamp);

            return date.toLocaleTimeString();
        });
        var humedad = response.data.map(x => x.lecture.hum);
        var temperatura = response.data.map(x => x.lecture.temp);
        var agua = response.data.map(x => x.lecture.wlevel);

        chart.data.label = date;
        chart.data.labels = labels;
        chart.data.datasets = [
            {
                label: 'Humedad',
                backgroundColor: 'rgb(47, 186, 19)',
                borderColor: 'rgb(47, 186, 19)',
                data: humedad,
            },
            {
                label: 'Temperatura',
                backgroundColor: 'rgb(184, 32, 6)',
                borderColor: 'rgb(184, 32, 6)',
                data: temperatura,
            },
            {
                label: 'Nivel de Agua',
                backgroundColor: 'rgb(79, 173, 255)',
                borderColor: 'rgb(79, 173, 255)',
                data: agua,
            }
        ]

        chart.update();
    } else {
        alert('Ocurrió un error al obtener los datos.');
    }
}

window.onload = () => {
    chart = new Chart(
        getElement('chart'),
        config
    );
    
    graph(new Date());
};