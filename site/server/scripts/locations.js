var warehouses = require('../settings/warehouses');
require( "../styles/account.scss" );

//https://developers.google.com/maps/documentation/javascript/tutorial

function Marker(map, location){
	var cords = {lat: location.lat, lng: location.lng};
	var marker = new google.maps.Marker({
		position: cords,
		map: map
	});
	marker.addListener('click', function() {
      window.open(location.map);
    });
}


window.initMap = function() {
	var center = {lat: 44.07112692664092, lng: -101.06256044999998};
	var map = new google.maps.Map(document.getElementById('map'), {
		zoom: 3,
		center: center
	});
	for (var key in warehouses){
		Marker(map, warehouses[key]);
	}
}
