# Array1D
## Configuration
Settings for arrays:  
* ff/fontFamily: set font family (HTML font family)  
* fs/fontSize/font: set font size (integer)  
* label: show/hide label (on/off)  
* ds/display: change display style (cell/tower)
* cs/cellSize: change cell size (integer)
* ind: index placement relative to cells (above/below)

Settings for array cells:
* bg/background/fill: set background color (any valid HTML color)
* =: set value (float or integer)
* value/val: show/hide values (on/off)
* border: border thickness (integer)
* fg: set foreground (text) color (HTML color)
* ind: show/hide indices (on/off)

__Reminder: configuration syntax is the same for every data structure and property__
```
myarr123 ind below
myarr123 ds tower
myarr123[0:5] = 2
```

## Commands

### resize(int newLength):
###### Precondition:  Input is checked and an exception is thrown if newLength < 1.
Change array length to newLength. If newLength is smaller than current length, the array is truncated.
Otherwise it is filled to newLength with random values.
```
myarr123.resize 5
```

### swap(int i, int j):
###### Precondition: Input is checked and exception is thrown if either i or j is < 0 or >= array length.
Swap cells at indices i and j. 
Cell objects themselves are swapped, not just values, so colors and other cell-specific settings are retained.
```
myarr123.swap 2 5
```
### arc(int i, int j):
###### Precondition: Input is checked and exception is thrown if either i or j is < 0 or >= array length.
Draws an arc from cell i to cell j anchored at the top middle edge of each of these cells. The arc can be 
removed by clicking on it and clicking the delete button or by executing the same command again.
```
myarr123.arc 0 4
```
