# -*- coding: utf-8 -*- 
# Copyright 2010-2014 Will Barton. 
# All rights reserved.
# 
# Redistribution and use in source and binary forms, with or without 
# modification, are permitted provided that the following conditions
# are met:
# 
#   1. Redistributions of source code must retain the above copyright 
#      notice, this list of conditions and the following disclaimer.
#   2. Redistributions in binary form must reproduce the above copyright 
#      notice, this list of conditions and the following disclaimer in the 
#      documentation and/or other materials provided with the distribution.
#   3. The name of the author may not be used to endorse or promote products
#      derived from this software without specific prior written permission.
# 
# THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES,
# INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
# AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL
# THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
# EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
# PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
# OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
# WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
# OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
# ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
# 

import unittest
import itertools
import csv

from utils import Position, EquatorialCoordinate

CONSTELLATION_NAMES = {
    'AND': 'Andromeda',
    'ANT': 'Antlia',
    'APS': 'Apus',
    'AQR': 'Aquarius',
    'AQL': 'Aquila',
    'ARA': 'Ara',
    'LEO': 'Leo',
    'LMI': 'Leo Minor',
    'LEP': 'Lepus',
    'LIB': 'Libra',
    'LUP': 'Lupus',
    'LYN': 'Lynx',
    'LYR': 'Lyra',
    'MEN': 'Mensa',
    'MIC': 'Microscopium',
    'MON': 'Monoceros',
    'ARI': 'Aries',
    'AUR': 'Auriga',
    'BOO': 'Boötes',
    'CAE': 'Caelum',
    'CAM': 'Camelopardalis',
    'CNC': 'Cancer',
    'CVN': 'Canes Venatici',
    'CMA': 'Canis Major',
    'CMI': 'Canis Minor',
    'CAP': 'Capricornus',
    'CAR': 'Carina',
    'CAS': 'Cassiopeia',
    'CEN': 'Centaurus',
    'CEP': 'Cepheus',
    'CET': 'Cetus',
    'CHA': 'Chamaeleon',
    'CIR': 'Circinus',
    'COL': 'Columba',
    'COM': 'Coma Berenices',
    'CRA': 'Corona Australis',
    'CRB': 'Corona Borealis',
    'CRV': 'Corvus',
    'CRT': 'Crater',
    'CRU': 'Crux',
    'CYG': 'Cygnus',
    'DEL': 'Delphinus',
    'DOR': 'Dorado',
    'DRA': 'Draco',
    'EQU': 'Equuleus',
    'ERI': 'Eridanus',
    'FOR': 'Fornax',
    'GEM': 'Gemini',
    'GRU': 'Grus',
    'HER': 'Hercules',
    'HOR': 'Horologium',
    'HYA': 'Hydra',
    'HYI': 'Hydrus',
    'IND': 'Indus',
    'LAC': 'Lacerta',
    'MUS': 'Musca',
    'NOR': 'Norma',
    'OCT': 'Octans',
    'OPH': 'Ophiuchus',
    'ORI': 'Orion',
    'PAV': 'Pavo',
    'PEG': 'Pegasus',
    'PER': 'Perseus',
    'PHE': 'Phoenix',
    'PIC': 'Pictor',
    'PSC': 'Pisces',
    'PSA': 'Piscis Austrinus',
    'PUP': 'Puppis',
    'PYX': 'Pyxis',
    'RET': 'Reticulum',
    'SGE': 'Sagitta',
    'SGR': 'Sagittarius',
    'SCO': 'Scorpius',
    'SCL': 'Sculptor',
    'SCT': 'Scutum',
    'SER': 'Serpens Caput',
    'SER': 'Serpens Cauda',
    'SEX': 'Sextans',
    'TAU': 'Taurus',
    'TEL': 'Telescopium',
    'TRI': 'Triangulum',
    'TRA': 'Triangulum Australe',
    'TUC': 'Tucana',
    'UMA': 'Ursa Major',
    'UMI': 'Ursa Minor',
    'VEL': 'Vela',
    'VIR': 'Virgo',
    'VOL': 'Volans',
    'VUL': 'Vulpecula',
}


### Line
# A line that connects one or more positions
class Line(object):
    def __init__(self, positions=None):
        if positions is None:
            self.positions = []
        else:
            self.positions = positions

    def __repr__(self):
        return "Line({positions})".format(positions=self.positions)

    # Output a GeoJSON Feature for this line
    def json(self, tojson=False):
        coordinates = [(p.ra.degrees, p.dec.degrees) for p in self.positions]
        feature = {
                "type": "Feature", 
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates,
                },
                "properties": {
                }
            }

        if tojson:
            return json.dumps(feature);
        
        return feature
        

### Constellation
# A set of lines that draw the constellation and lines to draw the
# constellation's boundaries.
class Constellation(object):

    # The lines that draw this constellation. Should be a list of
    # `ConstellationLine` objects which include all of the appropriate
    # `Position`s for each line.
    lines = None

    # The constellation's boundary lines
    boundaries = None

    def __init__(self, abbr, name, lines=None, boundaries=None):
        self.abbr = abbr
        self.name = name
        if lines is None:
            self.lines = []
        else:
            self.lines = lines

    def __repr__(self):
        return "Constellation(abbr={abbr}, name={name}, lines={lines})".format(
                abbr=self.abbr, name=self.name, lines=self.lines)

    # Output a list of GeoJSON Features for each line in this
    # constellation
    def json(self, tojson=False):
        features = [line.json() for line in self.lines]

        if tojson:
            return json.dumps(features);
        
        return features

## ConstellationCatalog
# A catalog of constellations with their lines.
class ConstellationCatalog(dict):

    def __init__(self, stream):
        super().__init__()
        reader = csv.reader(stream)

        # Each row should have the constellation abbreviation and
        # then alternating ra,dec columns for each position along
        # the line. Each row corrosponds to one line.
        for row in reader:
            # Add the constellation to the catalog if its not already in
            # it.
            if row[0] not in self:
                self[row[0]] = Constellation(row[0],
                        CONSTELLATION_NAMES[row[0]])

            # Create a single line for this row with positions from the
            # row.
            line = Line()

            for ra, dec in itertools.zip_longest(*([iter(row[1:])] * 2)):
                ra_coord = EquatorialCoordinate(ra, degrees=True)
                dec_coord = EquatorialCoordinate(dec, degrees=True)
                line.positions.append(Position(ra_coord, dec_coord))
    
            self[row[0]].lines.append(line)

    # Output a json 'FeatureCollection' for this catalog.
    def json(self, tojson=False):
        features = [o.json() for o in self.values()]
        collection = {
                "type": "FeatureCollection", 
                "features": features
            }

        if tojson:
            return json.dumps(collection);
        
        return collection


class TestConstellationCatalog(unittest.TestCase):
    def test_init(self):
        import io
        orion = '''ORI,4.843611,8.9000,4.830833,6.9500,4.853611,5.6000,4.904167,2.4500,4.975833,1.7167,5.418889,6.3500,5.533611,-0.3000,5.408056,-2.3833,5.293333,-6.8500,5.242222,-8.2000,5.796111,-9.6667,5.679444,-1.9500,5.919444,7.4000,5.585556,9.9333,5.418889,6.3500
ORI,5.679444,-1.9500,5.603333,-1.2000,5.533611,-0.3000
ORI,5.919444,7.4000,6.039722,9.6500,6.126389,14.7667,5.906389,20.2667
ORI,6.039722,9.6500,6.198889,14.2167,6.065278,20.1333'''

        # orion = '''ORI,5.679444,-1.9500,5.603333,-1.2000,5.533611,-0.3000
        # ORI,6.039722,9.6500,6.198889,14.2167,6.065278,20.1333'''

        stream = io.StringIO(initial_value=orion)
        const_catalog = ConstellationCatalog(stream)

        self.assertTrue('ORI' in const_catalog)
        self.assertEqual(len(const_catalog['ORI'].lines), 4)
        self.assertEqual(len(const_catalog['ORI'].lines[0].positions), 15)


if __name__ == "__main__":
    unittest.main()

