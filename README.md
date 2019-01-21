# dsDraw

dsDraw is an interactive tool for creating videos with flowcharts and data structures, with an emphasis on programmatic drawing. The user can interact with the canvas by point-and-click or by entering command via the console. These interactions can be recorded along with audio from the user's microphone to create dynamic content. 

## Editing the canvas  
The canvas can be edited before and during recording, so the user may 'set the scene' with some objects or text before recording begins. 

Different independent clips can be created either from the current contents of the canvas or from a blank canvas. The user can switch between these clips, editing and recording over them. 

## Saving a video  
Once video has been recorded for a clip, it is no longer editable. Recorded videos may be merged with other clips and exported as .webm files.

## Basic mouse controls
To __move__ an existing object, hold control and drag the object.  
To __clone__ an existing object, hold alt and drag the object.  
To __delete__ the most recently created object, press control-z.  
To __delete__ any object, click on it to bring up the options and click the red X.   
To change the settings of an existing object, click on it
and select new options or configure it from the console.
The currently selected object(s) will have a bright blue border.  

### Shortcuts
__R:__ Start/Stop recording  
__P:__ Pause/play  
__Control-Z:__ Undo   
__Control-Y:__ Redo  
__T:__ Show console   
__Escape:__ Hide console   


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

