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

import argparse
from objects import NGCCatalog, HYGStarCatalog
from constellations import ConstellationCatalog
import json

def main():
    parser = argparse.ArgumentParser(description='Output GeoJSON for each of the given celestial catalogs.')
    # parser.add_argument('output', type=str, help='specifies the output file')
    parser.add_argument('--ngc', type=str, 
            help="specifies the NGC catalog file path")
    parser.add_argument('--hyg', type=str, 
            help="specifies the NGC catalog file path")

    parser.add_argument('--magnitude', type=int, default=5,
            help="limit output to the specified magnitude")

    parser.add_argument('--constellations', type=str, 
            help="specifies the constellations file path")
    parser.add_argument('--indent', type=int,
            help="specifies that the output should be pretty-printed and the indent level")
    parser.add_argument('--invert-ra', action="store_true", default=False,
            help="invert the right ascension coordinates (useful for projections that expect longitude/latitude)")
    args = parser.parse_args()

    json_args = {}
    if args.indent:
        json_args = {sort_keys:True, indent:args.indent}

    hyg_features = []
    if args.hyg:
        hyg_catalog = HYGStarCatalog(open(args.hyg))
        hyg_features = [o.json() for o in hyg_catalog.values() if
                o.magnitude <= args.magnitude]
        
    ngc_features = []
    if args.ngc:
        ngc_catalog = NGCCatalog(open(args.ngc))
        ngc_features = [o.json() for o in ngc_catalog.values() if
                o.magnitude <= args.magnitude]

    consts_features = []
    if args.constellations:
        consts_catalog = ConstellationCatalog(open(args.constellations))
        consts_features = [c.json() for c in consts_catalog.values()]

    features = hyg_features + ngc_features + consts_features;
    if args.invert_ra:
        for feature in features:
            ra = feature["geometry"]["coordinates"][0]
            feature["geometry"]["coordinates"][0] = 360.0 - ra

    collection = {
            "type": "FeatureCollection", 
            "features": hyg_features + ngc_features + consts_features
    }


    json_string = json.dumps(collection, **json_args)
    print(json_string)
    return

    


if __name__ == "__main__":
    main()
