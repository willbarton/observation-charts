/*
 * Copyright 2010-2014 Will Barton. 
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions
 * are met:
 * 
 *   1. Redistributions of source code must retain the above copyright 
 *      notice, this list of conditions and the following disclaimer.
 *   2. Redistributions in binary form must reproduce the above copyright 
 *      notice, this list of conditions and the following disclaimer in the 
 *      documentation and/or other materials provided with the distribution.
 *   3. The name of the author may not be used to endorse or promote products
 *      derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL
 * THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * This is based on this Gist: https://gist.github.com/pnavarrc/9730300
 */ 

(function($){

    ObservationChart = function(el, options){
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;

        // Access to jQuery and DOM versions of element
        base.$el = $(el);
        base.el = el;

        // Add a reverse reference to the DOM object
        base.$el.data("ObservationChart", base);
        
        // Store the current rotation
        base.rotate = {x: 0, y: 90};

        // Initialization
        base.init = function(){
            base.options = $.extend({},ObservationChart.defaultOptions, options);

            // Select our container and create the SVG element.
            base.container = d3.select(base.el);
            base.svg = base.container.append('svg')
                .attr('width', base.options.size.width)
                .attr('height', base.options.size.height)

            // Create our groups.
            base.lines_group = base.svg.append('g').attr('class', 'lines');
            base.const_group = base.svg.append('g').attr('class', 'constellations');
            base.obj_group = base.svg.append('g').attr('class', 'objects');
            base.star_group = base.svg.append('g').attr('class', 'stars');
            base.label_group = base.svg.append('g').attr('class', 'labels');
            
            // Create and configure an instance of the orthographic projection
            base.projection = d3.geo.stereographic()
                .scale(base.options.size.width * base.options.scale)
                .translate([base.options.size.width / 2, base.options.size.height / 2])
                .clipAngle(90)
                .rotate([base.rotate.x / 2, -base.rotate.y / 2]);

            // Center the projection
            // Assume that RA is in hours (decimal) and dec is in degrees.
            base.projection.rotate([
                    base.options.center.ra * 15, 
                    -1 * base.options.center.dec]);

            console.log(base.projection);
            
            // Create and configure the geographic path generator
            base.path = d3.geo.path().projection(base.projection);
            
            // Overlay
            base.overlay = base.svg.selectAll('circle').data([base.rotate])
                .enter().append('circle')
                .attr('transform', 'translate(' + [base.options.size.width / 2, base.options.size.height / 2] + ')')
                .attr('r', base.options.size.width / 2)
                .attr('filter', 'url(#lightMe)')
                .attr('class', 'overlay');

            // Globe Outline
            base.globe = base.lines_group.selectAll('path.globe').data([{type: 'Sphere'}])
                .enter().append('path')
                .attr('class', 'globe')
                .attr('d', base.path);

            // Graticule
            base.graticule = d3.geo.graticule();

            // Draw graticule lines
            base.lines_group.selectAll('path.graticule').data([base.graticule()])
                .enter().append('path')
                .attr('class', 'graticule')
                .attr('d', base.path);
                
            // Load the star catalog
            d3.json('stars.json', base.drawStars);

            // Load the object catalog
            d3.json('objects.json', base.drawObjects);

            // Load the constellation catalog
            // d3.json('stars.json', base.drawObjects);

            // Drag Behavior
            // -------------
            /*
            var dragBehavior = d3.behavior.drag()
                .origin(Object)
                .on('drag', function(d) {
                    base.projection.rotate([(d.x = d3.event.x) / 2, -(d.y = d3.event.y) / 2]);
                    base.svg.selectAll('path').attr('d', function(u) {
                        // The circles are not properly generated when the
                        // projection has the clipAngle option set.
                        return base.path(u) ? base.path(u) : 'M 10 10';
                    });
                });

            // Add the drag behavior to the overlay
            base.overlay.call(dragBehavior);
            */
                
        };

        base.drawStars = function(error, data) {
            // Handle errors getting and parsing the data
            if (error) { return error; }

            var stars = $.grep(data.features, function(d) {
                return d.properties.magnitude <= base.options.stars.magnitude;
            });

            // Compute the radius scale. The radius will be proportional to
            // the aparent magnitude
            var rScale = d3.scale.linear()
                .domain(d3.extent(stars, function(d) { 
                    return d.properties.magnitude; }))
                .range(base.options.stars.scale);
            console.log(rScale.domain());

            // Stars
            // -----
            // Compute the radius for the point features
            base.path.pointRadius(function(d) {
                return d.properties ? rScale(d.properties.magnitude) : 1;
            });
            base.star_group.selectAll('path.star').data(stars)
                .enter().append('path')
                .attr('class', 'star')
                .attr('d', base.path);
            /*
            base.star_group.selectAll('circle.star').data(stars)
                .enter().append('circle')
                .attr('class', 'star')
                .attr('cx', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[0] : 0; 
                })
                .attr('cy', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[1] : 0; 
                })
                .attr('r', function(d) { 
                    return d.properties ? rScale(d.properties.magnitude) : 1;
                });
                */

            base.label_group.selectAll('text.star-label').data(stars)
                .enter().append('text')
                .attr("class", "star-label")
                .attr("transform", function(d) { 
                    return "translate(" + projection(d.geometry.coordinates) + ")"; })
                .attr("x", function(d) { return d.geometry.coordinates[0] > -1 ? 6 : -6; })
                .style("text-anchor", function(d) { return d.geometry.coordinates[0] > -1 ? "start" : "end"; })
                .attr("dy", ".35em")
                .text(function(d) { 
                    return labels[d.properties.id] ? labels[d.properties.id].name : 
                            (d.properties.name ? d.properties.name : ''); 
                });
                
            

        };

        base.drawObjects = function(error, data) {
            // Handle errors getting and parsing the data
            if (error) { return error; }

            // Generate a D3 line function that we'll use for the
            // planetary nebula and globular cluster symbols.
            var lineFunction = d3.svg.line()
                .x(function(d) { return d[0]; })
                .y(function(d) { return d[1]; })
                .interpolate("linear");

            // Galaxies
            // -----
            // The galaxy is a red ellipse whose shape and orientation
            // roughly match that of the object it represents; an SVG
            // ellipse.
            var galaxies = $.grep(data.features, function(d) {
                return d.properties.type == 'Galaxy' && 
                    d.properties.magnitude <= base.options.galaxies.magnitude;
            });
            // We'll size galaxies based on their size, within our
            // min/max range.
            var galaxyMajorScale = d3.scale.linear()
                .domain(d3.extent(galaxies, function(d) {
                    return d3.max(d.properties.size); }))
                .range(base.options.galaxies.scale);
            var galaxyMinorScale = d3.scale.linear()
                .domain(d3.extent(galaxies, function(d) {
                    return d3.min(d.properties.size); }))
                .range(base.options.galaxies.scale);
            base.obj_group.selectAll('ellipse.galaxy').data(galaxies)
                .enter().append('ellipse')
                .attr('class', 'galaxy')
                .attr('cx', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[0] : 0; 
                })
                .attr('cy', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[1] : 0; 
                })
                .attr('rx', function(d) { 
                    return d.properties ? galaxyMajorScale(d.properties.size[0]) : 1;
                })
                .attr('ry', function(d) {
                    return d.properties ? galaxyMinorScale(d.properties.size[1]) : 1;
                })
                .attr('transform', function(d) {
                    var transform = 'rotate(' + d.properties.angle + ',' + 
                            base.projection(d.geometry.coordinates)[0] + ',' + 
                            base.projection(d.geometry.coordinates)[1] + ')';
                    console.log(transform);
                    return transform;
                });


            // Open Clusters
            // -----
            // The open cluster is a yellow circle with a dashed border
            // to indicate its openness; an SVG circle.
            var openClusters = $.grep(data.features, function(d) {
                return d.properties.type == 'Open Cluster' && 
                    d.properties.magnitude <= base.options.openclusters.magnitude;
            });
            // We'll size clusters based on their magnitude, within our
            // min/max range.
            var openClusterMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(openClusters, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.openclusters.scale);
            base.obj_group.selectAll('circle.open-cluster').data(openClusters)
                .enter().append('circle')
                .attr('class', 'open-cluster')
                .attr('cx', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[0] : 0; 
                })
                .attr('cy', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[1] : 0; 
                })
                .attr('r', function(d) { 
                    return d.properties ? openClusterMagnitudeScale(
                        d.properties.magnitude) : 1;
                });

            // Globular Clusters
            // -----
            // The globular cluster is a yellow circle with one vertical
            // and one horizontal line; a circle and two paths.
            var globularClusters = $.grep(data.features, function(d) {
                return d.properties.type == 'Globular Cluster' && 
                    d.properties.magnitude <= base.options.globularclusters.magnitude;
            });
            // We'll size clusters based on their magnitude, within our
            // min/max range.
            var globularClusterMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(globularClusters, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.globularclusters.scale);
            var globularClusterElms = base.obj_group.selectAll('g.globular-cluster')
                .data(globularClusters)
                .enter().append('g')
                    .attr('class', 'globular-cluster');
            globularClusterElms.append('circle')
                    .attr('cx', function(d) { 
                        return d.geometry ? base.projection(d.geometry.coordinates)[0] : 0; 
                    })
                    .attr('cy', function(d) { 
                        return d.geometry ? base.projection(d.geometry.coordinates)[1] : 0; 
                    })
                    .attr('r', function(d) { 
                        return d.properties ? globularClusterMagnitudeScale(
                            d.properties.magnitude) : 1;
                    });
            globularClusterElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            d.geometry ? base.projection(d.geometry.coordinates)[0] : 0,
                            d.geometry ? base.projection(d.geometry.coordinates)[1] : 0
                        ];
                        console.log("globular cluster", coords, d.properties.size[0]);
                        var line = lineFunction([
                                [coords[0]-globularClusterMagnitudeScale(
                                    d.properties.magnitude),
                                 coords[1]],
                                [coords[0]+globularClusterMagnitudeScale(
                                    d.properties.magnitude), 
                                 coords[1]]
                                 ]);
                        return line;
                    });
            globularClusterElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            d.geometry ? base.projection(d.geometry.coordinates)[0] : 0,
                            d.geometry ? base.projection(d.geometry.coordinates)[1] : 0
                        ];
                        return lineFunction([
                                [coords[0],
                                 coords[1]-globularClusterMagnitudeScale(
                                     d.properties.magnitude)],
                                [coords[0],
                                 coords[1]+globularClusterMagnitudeScale(
                                     d.properties.magnitude)]
                                 ]);
                    });


            // Planetary Nebulas
            // -----
            // The planetary nebula is a green circle with one vertical
            // and one horizontal line; a circle and two paths.
            var planetaryNebulas = $.grep(data.features, function(d) {
                return d.properties.type == 'Planetary Nebula' && 
                    d.properties.magnitude <= base.options.planetarynebulas.magnitudes;
            });
            // We'll size the nebulas based on their magnitude, within our
            // min/max range.
            var planetaryNebulaMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(planetaryNebulas, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.planetarynebulas.scale);
            var planetaryNebulaElms = base.obj_group.selectAll('g.planetary-nebula')
                .data(planetaryNebulas)
                .enter().append('g')
                    .attr('class', 'planetary-nebula');
            planetaryNebulaElms.append('circle')
                    .attr('cx', function(d) { 
                        return d.geometry ? base.projection(d.geometry.coordinates)[0] : 0; 
                    })
                    .attr('cy', function(d) { 
                        return d.geometry ? base.projection(d.geometry.coordinates)[1] : 0; 
                    })
                    .attr('r', function(d) { 
                        return d.properties ? planetaryNebulaMagnitudeScale(
                            d.properties.magnitude)/2 : 1;
                    });
            planetaryNebulaElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            d.geometry ? base.projection(d.geometry.coordinates)[0] : 0,
                            d.geometry ? base.projection(d.geometry.coordinates)[1] : 0
                        ];
                        console.log("globular cluster", coords, d.properties.size[0]);
                        var line = lineFunction([
                                [coords[0]-planetaryNebulaMagnitudeScale(
                                    d.properties.magnitude),
                                 coords[1]],
                                [coords[0]+planetaryNebulaMagnitudeScale(
                                    d.properties.magnitude), 
                                 coords[1]]
                                 ]);
                        return line;
                    });
            planetaryNebulaElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            d.geometry ? base.projection(d.geometry.coordinates)[0] : 0,
                            d.geometry ? base.projection(d.geometry.coordinates)[1] : 0
                        ];
                        return lineFunction([
                                [coords[0],
                                 coords[1]-planetaryNebulaMagnitudeScale(
                                     d.properties.magnitude)],
                                [coords[0],
                                 coords[1]+planetaryNebulaMagnitudeScale(
                                     d.properties.magnitude)]
                                 ]);
                    });

            // Bright Nebulas
            // -----
            var brightNebulas = $.grep(data.features, function(d) {
                return d.properties.type == 'Bright Nebula' && 
                    d.properties.magnitude <= base.options.brightnebulas.magnitude;
            });
            // We'll size the nebulas based on their magnitude, within our
            // min/max range.
            var brightNebulaMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(brightNebulas, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.brightnebulas.scale);
            base.obj_group.selectAll('circle.bright-nebula').data(brightNebulas)
                .enter().append('rect')
                .attr('class', 'bright-nebula')
                .attr('x', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[0] : 0; 
                })
                .attr('y', function(d) { 
                    return d.geometry ? base.projection(d.geometry.coordinates)[1] : 0; 
                })
                .attr('height', function(d) { 
                    return d.properties ? brightNebulaMagnitudeScale(
                        d.properties.magnitude) : 1;
                })
                .attr('width', function(d) { 
                    return d.properties ? brightNebulaMagnitudeScale(
                        d.properties.magnitude) : 1;
                });
        };
        

        // Run initializer
        base.init();
    };

    ObservationChart.defaultOptions = {
        // The size of the chart  viewport. This plus the `scale`
        // effects how much of the sphere is visible.
        size: {
            width: 800,
            height: 600,
        },

        // The scale of the chart. This effects how much of the sphere
        // is visible within the chart's viewport (`size`).
        scale: 0.5, 

        // The positioning of the chart. If the chart's scale is such
        // that you can see the entire sphere, this will effect its
        // rotation.
        // RA is presumed in decimal hours, dec in degrees.
        center: {
            ra: 0.5,
            dec: 60.5 
        },

        stars: {
            magnitude: 6,
            scale: [6, 0.25]
        },

        galaxies: {
            magnitude: 8,
            scale: [3, 10]
        },
        
        openclusters: {
            magnitude: 6,
            scale: [6,3]
        },

        globularclusters: {
            magnitude: 8,
            scale: [8,4]
        },

        planetarynebulas: {
            magnitude: 10,
            scale: [12,6]
        },

        brightnebulas: {
            magnitude: 10,
            scale: [12,6]
        },

        labels: {
            HIP24436: {name:'Rigel', },
            HIP27989: {name:'Betelgeuse', },
            HIP32349: {name:'Sirius', },
            HIP37279: {name:'Procyon', },
            HIP24608: {name:'Capella', },
            HIP5447:  {name:'Mirach', },
            HIP14576: {name:'Algol', },
            HIP21421: {name:'Aldebaran', },
            HIP10826: {name:'Mira', },
            HIP49669: {name:'Regulus', },
            HIP57632: {name:'Denebola', },
            HIP65474: {name:'Spica', },
            HIP69673: {name:'Arcturus', },
            HIP11767: {name:'Polaris', },
            HIP54061: {name:'Dubhe', },
            HIP62956: {name:'Alioth', },
            HIP67301: {name:'Alkaid', },
            HIP102098:{name:'Deneb', },
            HIP91262: {name:'Vega', },
            HIP97649: {name:'Altair', },
            HIP36850: {name:'Castor', },
            HIP37826: {name:'Pollux', },
            HIP113368:{name:'Fomalhaut', },
            HIP80763: {name:'Antares', },
            HIP60718: {name:'Acrux', },
            HIP30438: {name:'Canopus', },
            HIP7588:  {name:'Achernar', },
        },

    };
    
    $.fn.observationChart = function(options){
        console.log("observation chart");
        return this.each(function(){
            (new ObservationChart(this, options));
        });
    };

})(jQuery);

