

import csv

reader = csv.DictReader(open('const.csv', 'r'))
writer = csv.writer(open('constellations.csv', 'w'))

current_line = []
for row in reader:
    if row['RA'] == '' and row['DEC'] == '':
        # write the line
        writer.writerow(current_line)
        current_line = []
        continue

    if len(current_line) == 0:
        # start a new line
        current_line.append(row['CON'])

    current_line.append(row['RA'])
    current_line.append(row['DEC'])
    

