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

import math 
from decimal import Decimal

import re
import unittest
from collections import namedtuple

### Named Tuples

# Size is given major diameter x minor diameter in arc minutes.
Size = namedtuple('Size', ('major', 'minor'))

# Point: A simple named tuple to hold x,y coordinates.
Point = namedtuple('Point', ('x', 'y'))

# Position: A position in the celestial sphere (an ra and dec coordinate)
Position = namedtuple('Position', ('ra', 'dec'))

# Regular expressions to match possible coordinate input strings
hms_re = re.compile(r'([+-]?)([0-9]+)[hH] ?([0-9]+)[mM] ?([0-9\.]+)[sS]')
hms = namedtuple('hms', ('h', 'm', 's'))
dms_re = re.compile(r'([+-]?)([0-9]+)[°ºdD:] ?([0-9]+)[′\'mM:] ?([0-9\.]+)[″"sS]')
dms = namedtuple('dms', ('d', 'm', 's'))
degrees_re = re.compile(r'([+-]?[0-9\.]+)[°ºdD]')

# Only do this calculation once
PI_OVER_TWELVE = math.pi / 12

# Coversions
decimal_hours = lambda h, m, s: h + (((m * 60) + s) / 3600)
decimal_degrees = lambda d, m, s: d + (((m * 60) + s) / 3600)
radian_hours = lambda h: h * PI_OVER_TWELVE
hours_in_degrees = lambda h: h * 15
degrees_in_hours = lambda d: d / 15

#### EquatorialCoordinate
# An equatorial coordinate expressed in:
#   * Degrees
#   * Radians
#   * Degree/arcmin/arcsec: 1° 2′ 3″
#   * Hours/minutes/seconds: 1h 2m 3s
#
# This allows us to parse and convert these coordinates in a single
# abstraction. The coordinate object itself will respond to standard
# Python string and floating point operations.
class EquatorialCoordinate(object):

    # Parse the given coordinate if it is a string. If we're given a
    # floating point number, we assume it's in radians. All the
    # conversion calculations are done once, on initialization.
    def __init__(self, coordinate, hours=False, degrees=False):
        # The canonical value.
        self.__value = None
        self.__hours = hours
        self.__degrees = degrees

        # The decimal degree or hour value of the coordinate
        self.__hour_value = None
        self.__degree_value = None

        # The tuple value of the coordinate (`hms` or `dms`)
        self.__value_tuple = None

        # A radian value for the coordinate
        self.__radian_value = None

        # A normalized string value for the coordinate
        self.__string_value = None

        # First try to re-match as a string
        try:
            # Try first to match hours/minutes/seconds. Presume
            # `hours==True` for this.
            if hms_re.match(coordinate):
                m = hms_re.match(coordinate)
                sign_str, h_str, m_str, s_str = m.groups()
                self.__hour_value = decimal_hours(float(h_str), float(m_str),
                        float(s_str)) * float(sign_str + '1')

                # Canonical values
                self.__hours = True
                self.__value = self.__hour_value
                self.__value_tuple = hms(
                        float(h_str) * float(sign_str + '1'), 
                        float(m_str),
                        float(s_str))

                self.__degree_value = hours_in_degrees(self.__hour_value)
                self.__radian_value = math.radians(self.__degree_value)

            # Next try to match degrees/minutes/seconds. Presume
            # `degrees==True` for this.
            elif dms_re.match(coordinate):
                m = dms_re.match(coordinate)
                sign_str, d_str, m_str, s_str = m.groups()
                self.__degree_value = decimal_degrees(float(d_str), 
                        float(m_str),
                        float(s_str)) * float(sign_str + '1')

                # Canonical values
                self.__degrees = True
                self.__value = self.__degree_value
                self.__value_tuple = dms(
                        float(d_str) * float(sign_str + '1'), 
                        float(m_str),
                        float(s_str))

                # This may or may not be useful.
                self.__hour_value = degrees_in_hours(self.__degree_value)
                self.__radian_value = math.radians(self.__degree_value)

            # Finally try to match as a decimal degree string 
            elif degrees_re.match(coordinate):
                m = degrees_re.match(coordinate)
                self.__degree_value = float(m.groups()[0])

                # Canonical values
                self.__degrees = True
                self.__value = self.__degree_value
                self.__value_tuple = None

                # This may or may not be useful.
                self.__hour_value = degrees_in_hours(self.__degree_value)
                self.__radian_value = math.radians(self.__degree_value)

            # If none of these work, try to convert it to a float and
            # assume it was a degree.
            else:
                # Canonical values. `hours` or `degrees` should be
                # true/false based on what kind of value this is.
                self.__value = float(coordinate)
                self.__value_tuple = None

                if hours:
                    self.__degree_value = hours_in_degrees(self.__value)
                    self.__hour_value = self.__value
                elif degrees:
                    self.__hour_value = degrees_in_hours(self.__value)
                    self.__degree_value = self.__value
                
                self.__radian_value = math.radians(self.__degree_value)

        except TypeError as e:
            # It's not a string. Assume it's a degree 
            try:

                # Canonical values. `hours` or `degrees` should be
                # true/false based on what kind of value this is.
                self.__value = float(coordinate)
                self.__value_tuple = None

                if hours:
                    self.__degree_value = hours_in_degrees(self.__value)
                    self.__hour_value = self.__value
                elif degrees:
                    self.__hour_value = degrees_in_hours(self.__value)
                    self.__degree_value = self.__value
                
                self.__radian_value = math.radians(self.__degree_value)
            except TypeError as e:
                # It isn't convertable to a float
                raise ValueError("Unrecognized coordinate format",
                        coordinate)

        if self.__value_tuple is not None:
            self.__string_value = str(self.__value_tuple)
        else:
            self.__string_value = str(self.__value)

    def __float__(self):
        return self.__value

    def __str__(self):
        return self.__string_value

    def __repr__(self):
        return str(self.__value)

    @property
    def radians(self):
        return self.__radian_value

    @property
    def degrees(self):
        return self.__degree_value

    @property
    def hours(self):
        return self.__hour_value


class TestEquatorialCoordinate(unittest.TestCase):
    def test_hours(self):
        # This tests the hour coordinate parsing and conversions using
        # M42.
        e = EquatorialCoordinate('05h 35m 17.2s')
        self.assertEqual(
                Decimal(e.hours).quantize(Decimal('1.00000')),
                Decimal('5.58811'))
        self.assertEqual(
                Decimal(e.radians).quantize(Decimal('1.000')),
                Decimal('1.463'))

    def test_degrees(self):
        # This tests the degree coordinate parsing and conversions using
        # M42.

        # Plain float number
        e = EquatorialCoordinate(-5.39083, degrees=True)
        self.assertEqual(e.degrees, -5.39083)
        self.assertEqual(
                Decimal(e.radians).quantize(Decimal('1.00000')),
                Decimal('-0.09409'))

        # Float with a degree symbol as a string
        e = EquatorialCoordinate('-5.39083°')
        self.assertEqual(e.degrees, -5.39083)
        self.assertEqual(
                Decimal(e.radians).quantize(Decimal('1.00000')),
                Decimal('-0.09409'))

        # DMS one way
        e = EquatorialCoordinate('-05º 23\' 27"')
        self.assertEqual(
                Decimal(e.degrees).quantize(Decimal('1.00000')),
                Decimal('-5.39083'))
        self.assertEqual(
                Decimal(e.radians).quantize(Decimal('1.00000')),
                Decimal('-0.09409'))

        # DMS another way
        e = EquatorialCoordinate('-5° 23′ 27″')
        self.assertEqual(
                Decimal(e.degrees).quantize(Decimal('1.00000')),
                Decimal('-5.39083'))
        self.assertEqual(
                Decimal(e.radians).quantize(Decimal('1.00000')),
                Decimal('-0.09409'))

        # DMS a final way
        e = EquatorialCoordinate('-5d 23m 27s')
        self.assertEqual(
                Decimal(e.degrees).quantize(Decimal('1.00000')),
                Decimal('-5.39083'))
        self.assertEqual(
                Decimal(e.radians).quantize(Decimal('1.00000')),
                Decimal('-0.09409'))

        # This should cause an exception
        with self.assertRaises(ValueError):
            e = EquatorialCoordinate("I'm clearly not a coordinate")

    def test_reverse_hours(self):
        pass

    def test_reverse_degrees(self):
        pass


if __name__ == "__main__":
    unittest.main()


