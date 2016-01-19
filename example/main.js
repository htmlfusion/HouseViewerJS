console.log('something');
var houseViewer = new HouseViewer();
houseViewer.init(document.body);

var houseUrl = 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted/data/9999/reconstruction.meshed.json.gz';
var xmlhttp = new XMLHttpRequest();

xmlhttp.onreadystatechange = function() {
  if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
    var house = JSON.parse(xmlhttp.responseText);
    houseViewer.setHouse(house);
    houseViewer.loadRoom(1);
  }
};
xmlhttp.open("GET", houseUrl, true);
xmlhttp.send();

