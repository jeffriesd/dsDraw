# dsDraw User Guide

## General
To __move__ an existing object, hold control and drag the object.  
To __clone__ an existing object, hold alt and drag the object.  
To __delete__ the most recently created object, press control-z.  
To __delete__ any object, click on it to bring up the options and click the red X.   
To change the settings of an existing object, click on it
and select new options.  
The currently selected object(s) will have a bright blue border.  

### Shortcuts
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

## Data Structures

### Arrays

Arrays can be configured to hold random values, specified values, or not show any values at all.
They can hold strings or integers.  

Users can create arrays by clicking and dragging, but then all options must be configured one at a time.
Arrays can also be created using the __create__ command and options can be configured in the console.  

# Console
The console will be used for creating data structures with specific attributes
that are simpler to specify by typing than by many individual clicks. Currently
it can be used to change the drawing mode by typing "mode X", where X is the new
drawing mode.

The console can be dragged by clicking anywhere above the input area and
can be resized by clicking and dragging the bottom right corner. 

Recently entered commands can by cycled through using the arrow keys.

## Commands

#### create
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
