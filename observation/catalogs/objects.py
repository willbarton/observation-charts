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

import re
import csv

from collections import OrderedDict, namedtuple

import unittest

from utils import Size, EquatorialCoordinate

### Object Types
# The standardized object types for Observation Charts
OBJECT_TYPES = [
        'Star',             # 0
        'Double Star',      # 1
        'Triple Star',      # 2
        'Galaxy',           # 3
        'Open Cluster',     # 4
        'Globular Cluster', # 5
        'Planetary Nebula', # 6
        'Bright Nebula',    # 7
        'Milky Way',        # 8
        'Not Used',         # 9
]

# Abbrev   Description                       Example
# -----------------------------------------------------
# *       Single Star
# **      Double Star
# ***     Triple Star
# Ast     Asterism
# Gxy     Galaxy
# GxyCld  Bright cloud/knot in a galaxy
# GC      Globular Cluster
# HIIRgn  HII Region
# Neb     Nebula (emission or reflection)
# NF      Not Found
# OC      Open Cluster
# PN      Planetary Nebula
# SNR     Supernova Remnant
# MWSC    Milky Way Star Cloud

### Objects and Catalogs

#### CelestialObject
# The base class for everything in the sky.
class CelestialObject(object):

    # Internally used to map alias:catalog
    __aliases = None

    # `type`, the type of the object.
    type = None

    # `ra`, the mean right ascention of the object
    ra = None

    # `dec`, the mean declination of the object
    dec = None

    # `size`, the apparent size of the object in the sky
    size = None

    # `magnitude`, the apparent magnitude of the object in the sky
    magnitude = None

    # `catalog`, the primary source catalog for this object 
    catalog = None

    # The object's identifier in its primary catalog
    identifier = None

    # The object's positional angle (pretty much unique to galaxies)
    angle = None

    def __init__(self, identifier, catalog, type=None, ra=None,
            dec=None, magnitude=None, size=None, aliases=None):
        self.identifier = identifier
        self.catalog = catalog
        self.type = type
        self.ra = ra
        self.dec = dec
        self.magnitude = magnitude
        self.size = size

    def __repr__(self):
        return "{cls}(catalog={catalog}, identifier={identifier} type={type} magnitude={magnitude})".format(
                cls=self.__class__.__name__, 
                catalog=self.catalog, 
                identifier=self.identifier,
                magnitude=self.magnitude,
                type=OBJECT_TYPES[self.type])

    # `id`, a string of self.catalog + self.identifier, i.e. `HIP27989`
    # for Betelgeuse or NGC1976 for the Orion Nebula.
    @property
    def id(self):
        return ''.join((self.catalog, self.identifier))

    # `catalogs`, a list of the catalogs the object appears in. Catalogs
    # must be added using the `add_alias` method, because a catalog must
    # have a corrosponding identifier within that catalog. The object's
    # `catalog` and `identifier` will always appear first.
    @property
    def catalogs(self):
        # Make sure we return the primary catalog
        if self.__aliases is None:
            self.__aliases = OrderedDict([(self.identifier, self.catalog),])
        return [v for v in self.__aliases.values() if v is not None]

    # `aliases_dict`, a list of all the identifiers for this object,
    # corrosponding to the list of catalogs.
    # The index of aliases *with* catalogs will corrospond to the
    # `catalogs` list. Aliases *without* catalogs will be placed at the
    # end of the aliases list in the order they were added, from the
    # `len(catalogs)` position onward.
    @property
    def aliases_dict(self):
        # Make sure we return the primary identifier
        if self.__aliases is None:
            self.__aliases = OrderedDict([(self.identifier, self.catalog),])
        return list(self.__aliases.keys())

    # `aliases` is a list of all the `{catalog}{alias}` strings
    # for each alias that belongs to a catalog, or just `{alias}` if
    # the alias has no catalogs.
    @property
    def aliases(self):
        # Make sure we return the primary identifier
        if self.__aliases is None:
            self.__aliases = OrderedDict([(self.identifier, self.catalog),])
        return ["".join(filter(None, reversed(pair))) 
                for pair in self.__aliases.items()]
    

    # Common API for adding aliases. Aliases *can* have catalogs, but
    # are not required. Example would be the Orion Nebula: It is
    # NGC1976, M42, LBN974, and 'The Orion Nebula'. Three of those have
    # catalogs (NGC, M, LBN), but one does not. 'The Orion Nebula' will
    # always appear at the end of the list. The object's `catalog` and
    # `identifier` will 
    # 
    # This is also the only way to add a catalog. 
    def add_alias(self, alias, catalog=None):
        # Make sure the primary identifier is the first item.
        if self.__aliases is None:
            self.__aliases = OrderedDict([(self.identifier, self.catalog),])

        self.__aliases[alias] = catalog


class TestCelestialObject(unittest.TestCase):
    # Aliases are the primary functionality of the CelestialObject. It
    # isn't exactly abstract, it can be used to an actual object, but
    # objects are likely to come from a catalog, and it would be better
    # to use a catalog-specific class to handle any catalog-specific
    # quirks.
    def test_aliases_dict(self):
        c = CelestialObject('1976', 'NGC')
        self.assertEqual(c.aliases_dict, ['1976',])

    def test_catalogs(self):
        c = CelestialObject('1976', 'NGC')
        self.assertEqual(c.catalogs, ['NGC',])

    def test_add_alias(self):
        c = CelestialObject('1976', 'NGC')

        c.add_alias('42', 'M')
        self.assertEqual(c.aliases_dicts, ['1976', '42'])
        self.assertEqual(c.catalogs, ['NGC', 'M'])

        c.add_alias('The Orion Nebula')
        self.assertEqual(c.aliases_dicts, ['1976', '42', 'The Orion Nebula'])
        self.assertEqual(c.catalogs, ['NGC', 'M'])


#### NGCObject

# This regular expression matches the object size format of the HCNGC
# catalog. Size is given major diameter x minor diameter in arc minutes.
ngc_size_re = re.compile(r'([0-9\.]+)[\'`"] ?([xX] ?([0-9\.]+)[\'`"])?')

# A mapping of NGC types to the Observation Charts types
ngc_object_types = {
        '*': 0,
        '**': 1,
        '***': 2,
        'Ast': 9,
        'Gxy': 3,
        'GxyCld': 3,
        'GC': 5,
        'HIIRgn': 7,
        'Neb': 7,
        'NF': 9,
        'OC': 4,
        'PN': 6,
        'SNR': 7,
        'MWSC': 8,
        'OC+Neb': 4,
        'Neb?': 7
}

# Object from the New General Catalog of deep sky objects.
class NGCObject(CelestialObject):

    # Initialization is meant to take a csv.DictReader row as keyword
    # args. 
    def __init__(self, **kwargs):
        self.__NGCNo = kwargs['NGCNo']
        self.__RA_2000 = kwargs['RA_2000']
        self.__DEC_2000 = kwargs['DEC_2000']
        self.__Const = kwargs['Const']
        self.__ObjectType = kwargs['ObjectType']
        self.__Size = kwargs['Size']
        self.__Bmag = kwargs['Bmag']
        self.__Vmag = kwargs['Vmag']
        self.__AlsoCatalogedAs = kwargs['AlsoCatalogedAs']
        self.__PA = kwargs['PA']

        self.ra = EquatorialCoordinate(self.__RA_2000)
        self.dec = EquatorialCoordinate(self.__DEC_2000)

        # parse the size
        size_match = ngc_size_re.match(self.__Size)
        if size_match:
            major = size_match.groups()[0] 
            minor = size_match.groups()[2]
            self.size = Size(major=float(major), 
                    minor=(float(minor) if minor is not None else 0))
        else:
            self.size = Size(major=0, minor=0)

        # Some objects don't have a Vmag... I'm not sure why.
        try:
            self.magnitude = float(self.__Vmag)
        except ValueError as e:
            try: 
                self.magnitude = float(self.__Bmag)
            except Exception as e:
                self.magnitude = 20
    
        try:
            self.angle = float(self.__PA)
        except ValueError:
            self.angle = None

        self.identifier = self.__NGCNo
        self.catalog = 'NGC'

        # Lookup the NGC type and map to one of our types
        self.type = ngc_object_types[self.__ObjectType]

        # The HCNGC Catalog gives us some aliases. Add them.
        # This is imperfect because the catalog doesn't use a consistent
        # seperator between catalog and identifier.
        aliases = [re.split('[ -]', a.strip(), 1)
            for a in self.__AlsoCatalogedAs.split(',')]
        for pair in aliases:
            self.add_alias(*reversed(pair))



class TestNGCObject(unittest.TestCase):
    def setUp(self):
        self.ngc_object_dict = {
                'ObjectType': 'OC+Neb', 
                'L': '1', 
                'HistoricalNotes': 'H.C.', 
                'NGCNo': '1976', 
                'GC': '1179', 
                'VSfcBrt': '…', 
                'Const': 'Ori', 
                'ObjectClassif': '3:02:03', 
                'GSCSmallRegionNr': '4774', 
                'DEC_2000': '-05º 23\' 27"', 
                'ICEquiv': '…', 
                'TelescopeType': 'Refractor', 
                'PA': '…', 
                'Size': "90'X60'", 
                'JH': '360', 
                'Diam_inch': '-', 
                'Bmag': '4', 
                'NGCEquiv': '…', 
                'RA_2000': '05h 35m 17.2s', 
                'AlsoCatalogedAs': 'M 42, LBN 974, Sh2-281', 
                'POSS RedPlateNr': '1477', 
                'HeraldBobroffASTROATLAS': 'C-53,D-24', 
                'Year': '1610', 
                'POSSBluePlateNr': '1477', 
                'Vmag': '…', 
                'WH': '…', 
                'Uranometria2000': '225,226,270,271', 
                'ObservingNotes': 'S.G.', 
                'SourcesUsed': 'N,O,S,l,s,6,8,0,M,D,n', 
                'OriginalNGCSummaryDescription': '!!! Theta Orionis and the great neb', 
                'Discoverer': 'Nicolas Peiresc'}
        
    def test_size(self):
        ngc_object = NGCObject(**self.ngc_object_dict)
        self.assertEqual(ngc_object.identifier, '1976')


#### The NGC Catalog.
# This class simply inherits from OrderedDict. It takes a file (or
# stream), parses it, and populates the dict.
class NGCCatalog(OrderedDict):
    def __init__(self, stream):
        super().__init__()
        reader = csv.DictReader(stream)
        for row in reader:
            ngc_object = NGCObject(**row)
            self[ngc_object.identifier] = ngc_object


class TestNGCCatalog(unittest.TestCase):
    def test_init(self):
        import io
        ngc_orion = '''NGCNo,L,GC,JH,WH,RA_2000,DEC_2000,Const,OriginalNGCSummaryDescription,Discoverer,Year,TelescopeType,Diam_inch,ObjectType,ObjectClassif,Size,PA,Vmag,Bmag,VSfcBrt,NGCEquiv,ICEquiv,AlsoCatalogedAs,HistoricalNotes,ObservingNotes,Uranometria2000,HeraldBobroffASTROATLAS,GSCSmallRegionNr,POSSBluePlateNr,POSS RedPlateNr,SourcesUsed
5194,1,3572,1622,…,13h 29m 52.1s,"+47º 11' 43""",CVn,"!!!, Great Spiral neb",Charles Messier,1773,Refractor,3.3,Gxy,Sc I,11'X7.8',163,8.5,9.1,13.1,…,…,"M 51A, UGC 8493, ARP 85, MCG+08-25-012, CGCG 246.008, VV 403, IRAS 13277+4727, PGC 47404",H.C.,S.G.,76,"C-11,C-29",3460,1593,1593,"N,O,S,U,1,Z,m,0,6,8,D,n"
1976,1,1179,360,…,05h 35m 17.2s,"-05º 23' 27""",Ori,!!! Theta Orionis and the great neb,Nicolas Peiresc,1610,Refractor,-,OC+Neb,3:02:03,90'X60',…,…,4,…,…,…,"M 42, LBN 974, Sh2-281",H.C.,S.G.,"225,226,270,271","C-53,D-24",4774,1477,1477,"N,O,S,l,s,6,8,0,M,D,n"'''
        stream = io.StringIO(initial_value=ngc_orion)
        ngc_catalog = NGCCatalog(stream)
        self.assertTrue('1976' in ngc_catalog)

        
#### HYGStar
# A star from the HYG  catalog. The star's HR number is prefered as
# the identifier here.
class HYGStar(CelestialObject):

    # Initialization is meant to take a csv.DictReader row as keyword
    # args. 
    def __init__(self, **kwargs):
        self.__StarID = kwargs['StarID']
        self.__HIP = kwargs['HIP']
        self.__HD = kwargs['HD']
        self.__HR = kwargs['HR']
        self.__BayerFlamsteed = kwargs['BayerFlamsteed']
        self.__ProperName = kwargs['ProperName']
        self.__RA = kwargs['RA']
        self.__Dec = kwargs['Dec']
        self.__Mag = kwargs['Mag']
        self.__AbsMag = kwargs['AbsMag']
        self.__Spectrum = kwargs['Spectrum']
        self.__ColorIndex = kwargs['ColorIndex']

        # The HYG catalog contains HIP, HD, and HR identifiers the
        # `catalog` property will corrospond to the one we prefer for
        # the `identifier`.
        self.identifier = self.__HIP
        self.catalog = 'HIP'

        self.type = 0
        self.size = Size(-1,-1)

        # NOTE: HYG RA is in degrees.
        self.ra = EquatorialCoordinate(self.__RA, hours=True)
        self.dec = EquatorialCoordinate(self.__Dec, degrees=True)
        self.magnitude = float(self.__Mag)

        # HYG gives us a lot of aliases. Add them.
        self.add_alias(self.__HD, 'HD')
        self.add_alias(self.__HR, 'HR')
        self.add_alias(self.__ProperName)

        # Parse out the Flamsteed and Bayer components and add
        # seperately
        # self.add_alias(self.__BayerFlamsteed, )


class TestHYGStar(unittest.TestCase):
    def setUp(self):
        self.hyg_object_dict = {
                'VX': '-1.693e-05', 
                'Distance': '131.061598951507', 
                'X': '2.738', 
                'StarID': '27919', 
                'HD': '39801', 
                'Z': '16.89611', 
                'VZ': '9.611e-06', 
                'BayerFlamsteed': '58Alp Ori', 
                'VY': '2.0769e-05', 
                'PMRA': '27.33', 
                'Mag': '0.45', 
                'HR': '2061', 
                'Y': '129.93909', 
                'Spectrum': 'M2Ib', 
                'ColorIndex': '1.500', 
                'RA': '5.91952477', 
                'HIP': '27989', 
                'AbsMag': '-5.1373773102256', 
                'Dec': '07.40703634', 
                'PMDec': '10.86', 
                'ProperName': 'Betelgeuse', 
                'Gliese': '', 
                'RV': '21'}

    def test_init(self):
        # Betelgeuse, HIP 27989
        hyg_object = HYGStar(**self.hyg_object_dict)
        self.assertEqual(hyg_object.identifier, '27989')
        self.assertEqual(hyg_object.ra.hours, 5.91952477)
        self.assertEqual(hyg_object.ra.degrees, 88.79287155)
        self.assertEqual(hyg_object.dec.degrees, 7.40703634)


#### The HYG Catalog
# This class simply inherits from OrderedDict. It takes a file (or
# stream), parses it, and populates the dict.
class HYGStarCatalog(OrderedDict):
    def __init__(self, stream):
        super().__init__()
        reader = csv.DictReader(stream)
        for row in reader:
            hyg_star = HYGStar(**row)
            self[hyg_star.identifier] = hyg_star


class TestHYGStarCatalog(unittest.TestCase):
    def test_init(self):
        import io
        hyg_betelgeuse = '''StarID,HIP,HD,HR,Gliese,BayerFlamsteed,ProperName,RA,Dec,Distance,PMRA,PMDec,RV,Mag,AbsMag,Spectrum,ColorIndex,X,Y,Z,VX,VY,VZ
27919,27989,39801,2061,,58Alp Ori,Betelgeuse,5.91952477,07.40703634,131.061598951507,27.33,10.86,21,0.45,-5.1373773102256,M2Ib,1.500,2.738,129.93909,16.89611,-1.693e-05,2.0769e-05,9.611e-06'''
        stream = io.StringIO(initial_value=hyg_betelgeuse)
        hyg_catalog = HYGStarCatalog(stream)
        self.assertTrue('27989' in hyg_catalog)

if __name__ == "__main__":
    unittest.main()

