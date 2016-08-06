jQuery.extend({
    // http://stackoverflow.com/a/8649003
    deparam: function() {
        var search = window.location.search.substring(1);
        if (search != '') {
            var decoded_params = decodeURIComponent(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"').replace(/\+/g, ' ');
            return JSON.parse('{"' + decoded_params + '"}');
        } else {
            return {};
        }
    }
});

// Form field default state
var defaults = {
    'datetime': moment().hour(22).minute(0).second(0).format('MMMM D, YYYY, h:mm a'),
    'latitude': 40.7528000,
    'longitude': -73.9765222,
    'bright-objects': true,
    'messier-objects': false,
    'zoomable': false,
}

// Get the overall state of the app, as it differs from the defaults
function get_state() {
    var state = {};
    for (var key of Object.keys(defaults)) {
        var elm = $('#' + key);

        // Get our preferred value
        var value = elm.val();
        if ((elm.attr('type') == 'checkbox') || 
              (elm.attr('type') == 'radio'))
            value =  elm.prop('checked')

        // Set the value in our resulting start object
        if (value != defaults[key])
            state[key] = value;
    }
    return state;
}

// Load state from the URL parameters
function load_state() {
    var state = $.deparam();

    // For each state variable, set it only if it differs from the
    // default, and perform the necessary UI updates.
    for (var key of Object.keys(state)) {
        if (state[key] != defaults[key]) {

            var elm = $('#' + key);

            // Set our preferred value
            if ((elm.attr('type') == 'checkbox') || 
                  (elm.attr('type') == 'radio'))
                elm.prop('checked', state[key])
            else
                elm.val(state[key])
              
            elm.change();
        }
    }
}

// Update the URL/history based on parameter selection
function update_state() {
    if (history.pushState) {
        var current_params = window.location.search.substring(1);
        var new_params = $.param(get_state(), true);

        if (new_params != current_params) {
            var base_url = window.location.href.split('?')[0];
            var url = base_url + '?' + new_params;
            window.history.pushState({path: url}, '', url);
        }
    }
}

$(document).ready(function() {
    // Set our default form values
    $('#datetime').val(defaults['datetime']);
    $('#datetime').attr('placeholder', defaults['datetime']);
    $('#latitude').val(defaults['latitude']);
    $('#longitude').val(defaults['longitude']);
    $('#bright-objects').prop("checked", defaults['bright-objects'])
    $('#messier-objects').prop("checked", defaults['messier-objects'])
    $('#zoomable').prop("checked", defaults['zoomable'])

    var options = {
        size: {
            width: $('#generated-chart').width(),
            height: $('#generated-chart').width()
        },
        scale: 1,
        data: {
            constellations: './data/constellations.json',
            objects: './data/objects.json',
            stars: './data/starsHD.json'
        },

        datetime: moment($('#datetime').val(), 'MMMM D YYYY, h:mm:ss a').toDate(),
        location: {
            latitude: 40.7528000,
            longitude: -73.9765222
        },

        scale: 1,
        zoom: {
            zoomable: false,
        },
        graticule: true,
        zenith: {
            show: true,
        },
        ecliptic: true,
        information: true,

        solar: {
            moon: false,
            sun: false,
            planets: false,
        },

        constellations: {
            label: true,
            draw: true
        },

        stars: {
            magnitude: 5,
        },

        galaxies: {
            labelhover: true
        },
        
        openclusters: {
            labelhover: true 
        },

        globularclusters: {
            labelhover: true
        },

        planetarynebulas: {
            labelhover: true
        },

        brightnebulas: {
            labelhover: true
        },

        overrides: $.extend({}, 
                            ObservationChart.BrightStarOverridess, 
                            ObservationChart.AlwaysMessierOverrides,
                            ObservationChart.InterestingObjectOverrides)

    };

    // Change the zoomable and scale defaults if our window sizes are 
    // under 400.
    if ($(window).width() < 400) {
        options.scale = 2.5;
        options.zoom.zoomable = true;
        $('#zoomable').prop("checked", true)

    } else if ($(window).width() < 800) {
        options.scale = 1.5;
        options.zoom.zoomable = true;
        $('#zoomable').prop("checked", true)
    } 

    var chart = new ObservationChart('#generated-chart', options);

    // Request the user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            options.location.latitude = position.coords.latitude;
            options.location.longitude = position.coords.longitude;
            chart.update(options);
            $('#latitude').val(position.coords.latitude);
            $('#longitude').val(position.coords.longitude);
        });
    }
    
    // Set up chart configuration options
    $('#datetime').change(function() {
        var new_datetime = moment($('#datetime').val(), 'MMMM D YYYY, h:mm:ss a')
        if (new_datetime.isValid()) {
            options.datetime = new_datetime.toDate(); 
            chart.update(options);
            update_state();
        }
    });
    $('#latitude').change(function() {
        options.location.latitude = $('#latitude').val();
        chart.update(options);
        update_state();
    });
    $('#longitude').change(function() {
        options.location.longitude = $('#longitude').val();
        chart.update(options);
        update_state();
    });
    $('#bright-objects').change(function() {
        options.data.objects = './data/objects.json';
        chart.update(options);
        update_state();
    });
    $('#messier-objects').change(function() {
        options.data.objects = './data/objects_messier.json';
        chart.update(options);
        update_state();
    });
    $('#zoomable').change(function() {
        options.zoom.zoomable = $('#zoomable').prop("checked")
        chart.update(options);
        update_state();
    });

    // Load any state we get from paramers
    load_state();

});
