# dsDraw

dsDraw is an interactive tool for creating videos with flowcharts and data structures, with an emphasis on programmatic drawing. The user can interact with the canvas by point-and-click or by entering command via the console.

## General
Individual segments can be recorded and merged together, and individual clips can be truncated so the current time frame becomes the end of the clip. Recording can only start from the end of the previous clip. 

To __move__ an existing object, hold control and drag the object.  
To __clone__ an existing object, hold alt and drag the object.  
To __delete__ the most recently created object, press control-z.  
To __delete__ any object, click on it to bring up the options and click the red X.   
To change the settings of an existing object, click on it
and select new options.  
The currently selected object(s) will have a bright blue border.  

### Shortcuts
__R:__ Start/Stop recording  
__P:__ Pause/play  
__Control-Z:__ Undo   
__Control-Y:__ Redo  
__T:__ Show console   
__Escape:__ Hide console   

# Tools

## Select Tool
The select tool is used to interact with several objects at a time. To make a selection,
click and drag from top-left to bottom-right. Groups of objects can be cloned or moved together.

## Flowchart Tools

### Arrows
Select the curved arrow tool and click and drag to create a new arrow.
To change the curvature, click anywhere on the arrow so it becomes highlighted. 
Drag the blue points to change the curvature. Click and drag the arrow head 
to change its final position. 

### Text boxes
There are five types of text boxes currently: rectangle, rounded rectangle,
diamond, parallelogram, and connector (circle). 
The functionality is the same for each. To create a new
flowchart text box, click where the upper left corner should appear and drag
to where the bottom right corner should appear. 

Click on the text box to 
edit the text. Current supported options are font family, font size, and
alignment (left, center, right, or top, center). Text boxes can also be resized
by clicking and dragging from the bottom right corner.

# Console
The console will be used for creating data structures with specific attributes
that are simpler to specify by typing than by many individual clicks. Currently
it can be used to change the drawing mode by typing "mode X", where X is the new
drawing mode.

The console can be dragged by clicking anywhere above the input area and
can be resized by clicking and dragging the bottom right corner. 

Recently entered commands can by cycled through using the arrow keys.

## Commands

#### create [dsType] [[label]]
This command is used to instantiate data structures and makes it easy to configure many options at once. 
Newly created data structures can be given a label or otherwise will be given a random label.
The create command can be executed as a single line or multiple lines delimited by curly braces. 

```
create array myarr123
```

```
create array myarr456 {
  fontFamily: Verdana
  fontSize: 18
}
```

#### delete [label]
Deletes the object with name 'label'.

#### snap
Take a screenshot of the canvas.

#### play
Play video.

#### pause
Pause video.

#### record
Start/stop recording. Recording can only begin if video is seeked to end of current clip.

#### truncate
Truncate recording from current time. Video will automatically be updated.

## Data Structures

### Arrays

Arrays are created with the __array__ keyword. They are displayed as a series of rectangular cells of equal height or in 'tower' mode, where the height of each cell
is determined by its value. Configurable options for arrays include font family, font size, cell
size, index placement (above/below), and individual cell options include background, foreground (text color), value, showValues (toggle), showIndex (toggle), and displayStyle.

##### Commands
* resize
* swap  
* arc  

### Linked Lists

Linked lists are created one node at a time and share mary properties with arrays. Nodes can be display as circles or squares
and arcs can be configured individually. Configureable options for linked lists include font family, font size, cell size,
index placement (above/below), and individual cell optinos include backgroundm, foreground, value, showValues, showIndex, and displayStyle.

##### Commands
* insert
* link
* cut


#### configuration
Each data structure has configurable attributes, and child elements (such as the cells of an array) may have configurable attributes of their own. To change the settings of an existing objects, its label must be used in the console. For
iterable objects such as arrays, ranges of child elements can be configured together.

Configure parent objects:
```
myarr123 fontFamily Purisa
```
Configure child elements:
```
myarr123[0] foreground #ff0
```
Configure a range of child elements:
```
myarr123[0:5] bg yellow
```
shorthand for configuring all children:
```
myarr123[] value 55
```

### Commands by data structure:
[Array Commands](https://github.com/danjeffries96/dsDraw/blob/master/docs/array-commands.md)  
[Linked List Commands]()
