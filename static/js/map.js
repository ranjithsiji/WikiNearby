var map;

// Helper variabls to display the indeterminate loader on top of the screen
// Other globals
var oldTileCoordinate;
var TILE_SIZE = 256;
var mapLoaded = false;
var dataLoaded = false;

// Some code from https://developers.google.com/maps/documentation/javascript/reference#release-version
function initMap() {
    return new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: {lat: 28.6139, lng: 77.2090},
        mapTypeControl: false,
        streetViewControl: false
    });
}

// Some code from https://developers.google.com/maps/documentation/javascript/reference#release-version
function userGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            // Using global variable here
            map.setCenter(pos);
            map.setZoom(12);
        }, function () {
            handleLocationError(true);
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false);
    }
}

// Some code from https://developers.google.com/maps/documentation/javascript/reference#release-version
function handleLocationError(browserHasGeolocation) {
    // Materialize.toast(message, displayLength, className, completeCallback);
    Materialize.toast(browserHasGeolocation ?
        'Is the Location Service enabled?' :
        'Your browser doesn\'t support geolocation.', 2000); // last number is the duration of the toast
}

// Some code from https://developers.google.com/maps/documentation/javascript/reference#release-version
function project(latLng) {
    var siny = Math.sin(latLng.lat() * Math.PI / 180);
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);

    return new google.maps.Point(
        TILE_SIZE * (0.5 + latLng.lng() / 360),
        TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)));
}

// Some code from https://developers.google.com/maps/documentation/javascript/reference#release-version
function getNewTileCoordinate() {
    var currentBounds = map.getBounds();
    var currentCenterLatLng = currentBounds.getCenter();
    var scale = 1 << map.getZoom();
    var worldCoordinate = project(currentCenterLatLng);
    return new google.maps.Point(
        Math.floor(worldCoordinate.x * scale / TILE_SIZE),
        Math.floor(worldCoordinate.y * scale / TILE_SIZE));
}

// Some code from https://developers.google.com/maps/documentation/javascript/reference#release-version
//noinspection JSUnusedGlobalSymbols
function initAutocomplete() {

    map = initMap();

    google.maps.event.addListener(map, 'bounds_changed', function () {
        var newTileCoordinate = getNewTileCoordinate();
        if (typeof oldTileCoordinate != 'undefined') {
            if ((Math.abs(newTileCoordinate.x - oldTileCoordinate.x) >= 2) || (Math.abs(newTileCoordinate.y - oldTileCoordinate.y) >= 2)) {
                mapLoaded = false;
                $('.activityIndicator').fadeIn(200);
            }
        }
    });

    google.maps.event.addListener(map, 'tilesloaded', function () {
        oldTileCoordinate = getNewTileCoordinate();
        mapLoaded = true;
        if (mapLoaded && dataLoaded) {
            $('.activityIndicator').fadeOut(200);
        }
    });

    // Load pins on map idle
    google.maps.event.addListener(map, 'idle', function () {
        queryData();
    });

    // HTML5 geolocation
    userGeolocation();

    // Create the search box and link it to the UI element.
    var input;
    input = document.getElementById('search-input');
    // var searchDiv = document.getElementById('search-div');
    //noinspection JSCheckFunctionSignatures
    var searchBox = new google.maps.places.SearchBox(input);
    // map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchDiv);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function () {
        searchBox.setBounds(map.getBounds());
    });

    // var markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function () {
        var places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }
        //
        // // Clear out the old markers.
        // markers.forEach(function (marker) {
        //     marker.setMap(null);
        // });
        // markers = [];

        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        places.forEach(function (place) {
            //     var icon = {
            //         url: place.icon,
            //         size: new google.maps.Size(71, 71),
            //         origin: new google.maps.Point(0, 0),
            //         anchor: new google.maps.Point(17, 34),
            //         scaledSize: new google.maps.Size(25, 25)
            //     };
            //
            //     // Create a marker for each place.
            //     markers.push(new google.maps.Marker({
            //         map: map,
            //         icon: icon,
            //         title: place.name,
            //         position: place.geometry.location
            //     }));

            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });
}

// Types of pins
var INVALID_PIN = 0;
var MULTI_PIN = 1;
var CRIME_PIN = 2;
var LEGISLATOR_PIN = 3;
var WIKI_PIN = 4;

// Identify the type of a pin
function typeOfMarker(pin) {

    //noinspection JSUnresolvedVariable
    if (pin.crime_list.length == 1 && pin.legislator_list.length == 0 && pin.wiki_info_list.length == 0) {

        return CRIME_PIN;

    } else { //noinspection JSUnresolvedVariable
        if (pin.crime_list.length == 0 && pin.legislator_list.length == 1 && pin.wiki_info_list.length == 0) {

            return LEGISLATOR_PIN;

        } else { //noinspection JSUnresolvedVariable
            if (pin.crime_list.length == 0 && pin.legislator_list.length == 0 && pin.wiki_info_list.length == 1) {

                return WIKI_PIN;

            } else { //noinspection JSUnresolvedVariable
                if (pin.crime_list.length == 0 && pin.legislator_list.length == 0 && pin.wiki_info_list.length == 0) {

                    return INVALID_PIN

                } else {

                    return MULTI_PIN;

                }
            }
        }
    }

}

// Checks if a marker is present in the new input
// function isMarkerPresent(pinList, marker) {
//     pinList.forEach(function (pin) {
//         if (pin.location.lat == marker.position.lat &&
//             pin.location.lng == marker.position.lng &&
//             typeOfMarker(pin) == markerTypes[markers.indexOf(marker)]) {
//             return true;
//         }
//     });
//
//     return false;
//
// }

// Global array to store all the markers currently marked on `map`.
var markers = [];
// var markerTypes = [];
var infowindow;
var currentlyActiveInfowindowPin;

function infowindowContent(title, body) {
    return '<div>' +
        '<h6 class="firstHeading">' + title + '</h6>' +
        '<div>' +
        '<p class="truncate">' + body + '</p>' +
        '<p><a onclick="handleMoreDetailsEvent(); void(0);" href="#">More details</a></p>' +
        '</div>' +
        '</div>';
}

function slowlyFadeOut(markerRef) {
    var currentOpacity = 1.0;

    function slowlyFadeOutHelper() {
        currentOpacity -= 0.1;
        markerRef.setOpacity(currentOpacity);
        if (currentOpacity <= 0.1) {
            clearInterval(myInterval);
            markerRef.setMap(null);
        }
    }

    var myInterval = setInterval(function () {
        slowlyFadeOutHelper()
    }, 20);
}

function slowlyFadeIn(markerRef) {
    var currentOpacity = 0.0;

    function slowlyFadeInHelper() {
        currentOpacity += 0.1;
        markerRef.setOpacity(currentOpacity);
        if (currentOpacity >= 0.9) {
            clearInterval(myInterval);
            markerRef.setOpacity(1);
        }
    }

    var myInterval = setInterval(function () {
        slowlyFadeInHelper()
    }, 20);
}

function crimeMoreDetailsHelper(crimeItem, showImage) {
    var appendString;

    //noinspection JSUnresolvedVariable
    appendString = '<div class="card z-depth-0">';
    if (showImage) {
        //noinspection JSUnresolvedVariable
        appendString += '<div class="card-image">' +
            '<img src="' + crimePicture + '">';

        appendString += '<span class="card-title blackBorder">Crime Data</span>';
        appendString += '</div>';
    }

    appendString += '<div class="card-content">';

    //noinspection JSUnresolvedVariable
    if ("type" in crimeItem && crimeItem.type.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent">There is a record of ' + crimeItem.type + ' at this location.</p>';
    }

    //noinspection JSUnresolvedVariable
    if ("fir_no" in crimeItem && crimeItem.fir_no.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><i class="fa fa-file-text-o" aria-hidden="true"></i> FIR number ' + crimeItem.fir_no + '</p>';
    }

    //noinspection JSUnresolvedVariable
    if ("timestamp" in crimeItem && crimeItem.timestamp.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><i class="fa fa-calendar" aria-hidden="true"></i> ' + crimeItem.timestamp + '</p>';
    }

    //noinspection JSUnresolvedVariable
    if ("url_link" in crimeItem && crimeItem.url_link.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><a target="_blank" class="specialSidebarLink" href="' + crimeItem.url_link + '">Source of data <i class="fa fa-external-link" aria-hidden="true"></i></a></p>';
    }

    appendString += '</div>' +
        '<hr class="semiTransparentHR"></div>';

    return appendString;
}

// TODO: Remove "&nbsp;" occurrences
function legislatorMoreDetailsHelper(legislatorItem, showImage) {
    var appendString;

    //noinspection JSUnresolvedVariable
    appendString = '<div class="card z-depth-0">';
    if (showImage) {
        //noinspection JSUnresolvedVariable
        appendString += '<div class="card-image">' +
            '<img src="' + sansadPicture + '">';

        appendString += '<span class="card-title blackBorder">Sansad Data</span>';
        appendString += '</div>';
    }

    appendString += '<div class="card-content">';

    //noinspection JSUnresolvedVariable
    if ("party" in legislatorItem && legislatorItem.party.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><i class="fa fa-users" aria-hidden="true"></i> Party: ' + legislatorItem.party + '</p>';
    }

    //noinspection JSUnresolvedVariable
    if ("first_name" in legislatorItem && legislatorItem.first_name.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><i class="fa fa-user" aria-hidden="true"></i>&nbsp;&nbsp;' + legislatorItem.first_name + " ";
    } else {
        appendString += '<p class="textSemiTransparent">Name not available';
    }

    //noinspection JSUnresolvedVariable
    if ("last_name" in legislatorItem && legislatorItem.last_name.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += legislatorItem.last_name + '</p>';
    } else {
        appendString += '</p>';
    }

    //noinspection JSUnresolvedVariable
    if ("no_questions" in legislatorItem && legislatorItem.no_questions.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><i class="fa fa-question" aria-hidden="true"></i>&nbsp;&nbsp;' + legislatorItem.no_questions + ' questions raised in the legislature.</p>';
    }

    appendString += '</div>' +
        '<hr class="semiTransparentHR"></div>';

    return appendString;
}

// TODO: Remove "&nbsp;" occurrences
function wikiMoreDetailsHelper(wikiItem, showImage) {
    var appendString;

    //noinspection JSUnresolvedVariable
    appendString = '<div class="card z-depth-0">';
    if (showImage) {
        //noinspection JSUnresolvedVariable
        appendString += '<div class="card-image">' +
            '<img src="' + wikiPicture + '">';

        appendString += '<span class="card-title blackBorder">Wikipedia Data</span>';
        appendString += '</div>';
    }

    appendString += '<div class="card-content">';

    //noinspection JSUnresolvedVariable
    if ("title" in wikiItem && wikiItem.title.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><i class="fa fa-wikipedia-w" aria-hidden="true"></i> ' + wikiItem.title + '</p>';
    }

    //noinspection JSUnresolvedVariable
    if ("info" in wikiItem && wikiItem.info.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><i class="fa fa-file-text-o" aria-hidden="true"></i>&nbsp;&nbsp;' + wikiItem.info + '</p>';
    }

    //noinspection JSUnresolvedVariable
    if ("link" in wikiItem && wikiItem.link.length > 0) {
        //noinspection JSUnresolvedVariable
        appendString += '<p class="textSemiTransparent"><a target="_blank" class="specialSidebarLink" href="' + wikiItem.link + '">Full article <i class="fa fa-external-link" aria-hidden="true"></i></a></p>';
    }

    appendString += '</div>' +
        '<hr class="semiTransparentHR"></div>';

    return appendString;
}

function multiMoreDetailsHelper(multiItem) {
    var appendString = '';
    var picDisplayedAlready;

    //noinspection JSUnresolvedVariable
    if ("legislator_list" in multiItem && multiItem.legislator_list.length > 0) {
        picDisplayedAlready = false;
        //noinspection JSUnresolvedVariable
        multiItem.legislator_list.forEach(function (legislatorItem) {
            appendString += legislatorMoreDetailsHelper(legislatorItem, !picDisplayedAlready);
            if (!picDisplayedAlready) {
                picDisplayedAlready = true;
            }
        });
    }

    //noinspection JSUnresolvedVariable
    if ("crime_list" in multiItem && multiItem.crime_list.length > 0) {
        picDisplayedAlready = false;
        //noinspection JSUnresolvedVariable
        multiItem.crime_list.forEach(function (crimeItem) {
            appendString += crimeMoreDetailsHelper(crimeItem, !picDisplayedAlready);
            if (!picDisplayedAlready) {
                picDisplayedAlready = true;
            }
        });
    }

    //noinspection JSUnresolvedVariable
    if ("wiki_info_list" in multiItem && multiItem.wiki_info_list.length > 0) {
        picDisplayedAlready = false;
        //noinspection JSUnresolvedVariable
        multiItem.wiki_info_list.forEach(function (wikiItem) {
            appendString += wikiMoreDetailsHelper(wikiItem, !picDisplayedAlready);
            if (!picDisplayedAlready) {
                picDisplayedAlready = true;
            }
        });
    }

    return appendString;
}

function handleMoreDetailsEvent() {
    $('.button-collapse').sideNav('show');
    var navMobileSelector = $('#nav-mobile');
    navMobileSelector.empty();
    var appendString = '';

    switch (typeOfMarker(currentlyActiveInfowindowPin)) {

        case MULTI_PIN:
            //noinspection JSUnresolvedVariable
            appendString += multiMoreDetailsHelper(currentlyActiveInfowindowPin);
            break;
        case CRIME_PIN:
            //noinspection JSUnresolvedVariable
            var crimeItem = currentlyActiveInfowindowPin.crime_list[0];
            appendString += crimeMoreDetailsHelper(crimeItem, true);
            break;
        case LEGISLATOR_PIN:
            //noinspection JSUnresolvedVariable
            var legislatorItem = currentlyActiveInfowindowPin.legislator_list[0];
            appendString += legislatorMoreDetailsHelper(legislatorItem, true);
            break;
        case WIKI_PIN:
            //noinspection JSUnresolvedVariable
            var wikiItem = currentlyActiveInfowindowPin.wiki_info_list[0];
            appendString += wikiMoreDetailsHelper(wikiItem, true);
            break;
        case INVALID_PIN:
            break;

    }

    appendString += '<p class="fullWidth"><div class="center-align waves-effect waves-teal btn-flat fullWidth" id="zoomIntoPin" onclick="zoomIntoPin(); void(0);"><i class="fa fa-search-plus" aria-hidden="true"></i> Zoom in to this pin</div></p><hr class="semiTransparentHR">' +
        '<p class="fullWidth"><h5 class="fullWidth center-align"><i class="fa fa-map"></i> Map-Annotate</h5></p>';

    navMobileSelector.append(appendString);

    // <div class="card z-depth-0">
    //     <div class="card-image">
    //         <img src="http://materializecss.com/images/sample-1.jpg">
    //         <span class="card-title">Card Title</span>
    //     </div>
    //     <div class="card-content">
    //         <p>I am a very simple card. I am good at containing small bits of information.
    //             I am convenient because I require little markup to use effectively.</p>
    //     </div>
    // </div>

    // console.log(currentlyActiveInfowindowPin);
}

function zoomIntoPin() {
    if (typeof currentlyActiveInfowindowPin != 'undefined') {
        console.log(currentlyActiveInfowindowPin);
        var pos = {
            lat: currentlyActiveInfowindowPin.location.lat,
            lng: currentlyActiveInfowindowPin.location.lng
        };

        // Using global variable here
        map.setCenter(pos);
        var prevZoom = map.getZoom();
        map.setZoom(prevZoom + 2);
        if (map.getZoom() == prevZoom) {
            Materialize.toast('Cannot zoom any further!', 2000);
        } else {
            $('.button-collapse').sideNav('hide');
        }
    }
}

function setNewMarkers(input) {
    /*
     Marks the pins in `input` on the map. Removes previously marked pins.
     param: input: JSON object of `pins` to be marked on map.
     */
    markers.forEach(function (marker) {
        // if (!isMarkerPresent(input.pins, marker)) {
        slowlyFadeOut(marker);
        // marker.setMap(null);
        // }
    });

    infowindow = new google.maps.InfoWindow({
        content: '',
        disableAutoPan: true
    });

    markers = [];

    //noinspection JSUnresolvedVariable
    input.pins.forEach(function (pin) {
        //noinspection JSUnresolvedVariable
        var location = {lat: pin.location.lat, lng: pin.location.lng};
        var iconLink; // See https://sites.google.com/site/gmapsdevelopment/
        var title;
        var body;
        var contentString;

        switch (typeOfMarker(pin)) {

            case MULTI_PIN:
                iconLink = {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: 'grey',
                    fillOpacity: 0.8,
                    scale: 12,
                    strokeColor: 'black',
                    strokeWeight: 2
                };
                title = "Multi Pin: Click to see more details";
                body = '';
                var numCrimeRecords = 0;
                var numLegislatorRecords = 0;
                var numWikiRecords = 0;

                if ("legislator_list" in pin && pin.legislator_list.length > 0) {
                    //noinspection JSUnresolvedVariable
                    numLegislatorRecords = pin.legislator_list.length;
                }

                if ("crime_list" in pin && pin.crime_list.length > 0) {
                    //noinspection JSUnresolvedVariable
                    numCrimeRecords = pin.crime_list.length;
                }

                if ("wiki_info_list" in pin && pin.wiki_info_list.length > 0) {
                    //noinspection JSUnresolvedVariable
                    numWikiRecords = pin.wiki_info_list.length;
                }

                body = ((numCrimeRecords > 0) ? String(numCrimeRecords) : 'No')
                    + ' crime record' + ((numCrimeRecords > 1) ? 's' : '') + ', '
                    + ((numLegislatorRecords > 0) ? String(numLegislatorRecords) : 'No')
                    + ' Sansad record' + ((numLegislatorRecords > 1) ? 's' : '') + ' and '
                    + ((numWikiRecords > 0) ? String(numWikiRecords) : 'No')
                    + ' Wikipedia article' + ((numWikiRecords > 1) ? 's' : '')
                    + ' ' + ((numCrimeRecords + numLegislatorRecords + numWikiRecords > 1) ? 'are' : 'is') + ' geotagged with this location.';

                contentString = infowindowContent(title, body);
                break;
            case CRIME_PIN:
                iconLink = {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    fillColor: 'tomato',
                    fillOpacity: 0.8,
                    scale: 5,
                    strokeColor: 'red',
                    strokeWeight: 2
                };
                //noinspection JSUnresolvedVariable
                title = "Crime Type: " + pin.crime_list[0].type;
                body = 'A crime record is geotagged with this location.';
                contentString = infowindowContent(title, body);
                break;
            case LEGISLATOR_PIN:
                iconLink = {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    fillColor: 'lightgreen',
                    fillOpacity: 0.8,
                    scale: 5,
                    strokeColor: 'green',
                    strokeWeight: 2
                };
                //noinspection JSUnresolvedVariable
                title = "Sansad Data: " + pin.legislator_list[0].first_name +
                    " " + pin.legislator_list[0].last_name;
                body = 'A Sansad record is geotagged with this location.';
                contentString = infowindowContent(title, body);
                break;
            case WIKI_PIN:
                iconLink = {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    fillColor: 'lightblue',
                    fillOpacity: 0.8,
                    scale: 5,
                    strokeColor: 'blue',
                    strokeWeight: 2
                };
                //noinspection JSUnresolvedVariable
                title = "Wikipedia Data: " + pin.wiki_info_list[0].title;
                body = '<div class="preloader-wrapper small active"> <div class="spinner-layer spinner-blue"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div> <div class="spinner-layer spinner-red"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div> <div class="spinner-layer spinner-yellow"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div> <div class="spinner-layer spinner-green"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div> </div>';
                contentString = infowindowContent(title, body);
                break;
            case INVALID_PIN:
                break;

        }

        var marker;
        //noinspection JSCheckFunctionSignatures
        marker = new google.maps.Marker({
            map: map,
            title: title,
            icon: iconLink,
            position: location,
            opacity: 0.0
            // animation: google.maps.Animation.DROP
        });
        marker.pinRef = pin;
        pin.markerRef = marker;
        marker.contentStringLoaded = false;
        slowlyFadeIn(marker);
        marker.addListener('click', function () {
            var baseURL = 'https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&pageids=';
            infowindow.setContent(contentString);
            //noinspection JSCheckFunctionSignatures
            infowindow.open(map, this);
            currentlyActiveInfowindowPin = this.pinRef;

            if (typeOfMarker(marker.pinRef) == WIKI_PIN && !marker.contentStringLoaded) {
                var pageid = marker.pinRef.wiki_info_list[0].pageid;
                $.ajax({
                    url: baseURL + pageid, dataType: "jsonp", success: function (queryResponse) {
                        // Very basic validity check
                        if (typeof queryResponse != 'undefined' && typeof queryResponse.query.pages[pageid] != 'undefined') {
                            var rawAbstract = queryResponse.query.pages[pageid].extract;
                            marker.pinRef.wiki_info_list[0].info = queryResponse.query.pages[pageid].extract;
                            marker.contentStringLoaded = true;
                            var newTitle = "Wikipedia Data: " + marker.pinRef.wiki_info_list[0].title;
                            var newBody = marker.pinRef.wiki_info_list[0].info;
                            var newContentString = infowindowContent(newTitle, newBody);
                            infowindow.setContent(newContentString);
                        }
                    }
                });

            } else if (marker.contentStringLoaded) {
                var newTitle = "Wikipedia Data: " + marker.pinRef.wiki_info_list[0].title;
                var newBody = marker.pinRef.wiki_info_list[0].info;
                var newContentString = infowindowContent(newTitle, newBody);
                infowindow.setContent(newContentString);
            }

            // console.log(currentlyActiveInfowindowPin);
        });
        markers.push(marker);
        // markerTypes.push(typeOfMarker(pin));
    });

}