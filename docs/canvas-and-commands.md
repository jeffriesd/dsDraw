# dsDraw Technical Documentation

## Canvas

The drawing tools in dsDraw are implemented primarily through the HTML5 <canvas>
element. Some features such as editing text are simplified by bringing up other
HTML elements, but once editing is done, everything on the canvas is represented
by CanvasObject classes that maintain their own states. The basic structure that
is used to interface between user and canvas is the CanvasState class. 

This is the current design for CanvasState:
### Fields
* mouseDown: object with x, y values assigned new coordinates whenever the
user depresses the left mouse button
* mouseMove: object with x, y values assigned new coordinates whenever the
user moves the mouse to a new coordinate (no click necessarily)
* mouseUp: object with x, y values assigned new coordinates whenever the
user release the left mouse button
* drawMode: string representing current drawing tool
* eventHanlder: CanvasEventHandler object with bindings to handle mouse/keyboard events
* canvas: reference to main HTML canvas element
* objects: array of parent objects currently on the canvas
* labled: Map from names to objects for referring to objects via console
* ctx: CanvasRenderingContext2D object with actual draw/fill/line methods
* clickedBare: boolean representing whether last click was on an object or bare canvas
* activeObj: reference to most recently clicked object
* selectGroup: array of currently selected objects
* activeCommandType: string representing current command type (move/drag/clone/create)
* hitCanvas: reference to hidden HTML canvas element for event detection
* hitCtx: CanvasRenderingContext2D object for hitCanvas
* uniqueColors: Set object with unique colors currently on hitCanvas
* colorHash: {rgbString: canvasObject} object/mapping from colors to current objects
* hotkeys: {keyCode: bool} object/mapping for keeping track of currently depressed hotkeys/modifiers
### Methods
* setMode(string mode): change drawing mode, update toolbar label
* activeParent(): returns active parent object
* createNewCanvasObject(): make call to CanvasObjectFactory for object instantiation
* initToolbars(): initialize toolbars for different drawing modes
* bindKeys(): initialize key bindings for hotkeys
* addCanvasObj(canvasObj): add a new parent object to current list for repainting and calls registerCanvasObj
* registerCanvasObj(childObj): add a new object to hidden canvas for event detection
and do color hashing if hashColor is unassigned -- only gets called for parent objects, parent objects handle
drawing of their children.
* remove(removeObj): removes object from current object list so it won't be repainted
* setCommandStartState(): save position of mouse and hotkeys when click starts
* addDrawCommand(): call createDrawCommand() and execute it with static CommandRecorder.execute
* createDrawCommand(): instantiate new DrawCommand (create, move, drag, clone, etc.)
* getClickedObject(mouseX, mouseY): returns topmost object at given coordinates
* getCenter(): returns coordinates of canvas center
* repaint(): clear canvas and redraw each current object (and possibly "creator" elements, such
as a hollow box if user is currently creating a new text box, etc.) -- also draws active objects
with blue highlighted border

#### Canvas Events
A hidden canvas with the same dimensions as the main canvas is used for 
constant time event detection. When a new element is added to the canvas, it is
assigned a unique RGB color that is used to fill the space of the element on the hidden
canvas. When the canvas is clicked, the hidden canvas is queried for the color
at that coordinate, and the color is used as a key in a map of current canvas objects.
Using this method eliminates the need to iterate through the current canvas objects,
doing math on each to calculate its bounds and so on.

Mouse and keyboard events are dispatched to the CanvasEventHandler class. It has methods
for mouseDown(), mouseMove(), and mouseUp(). 

* mouseDown():  

   If click happened on an existing object:  
   
      set CanvasState.activeObj to to this one and 
      
      call mouseDown() on this object.  
            - Set dragOffset  
            - show toolbar  
            - set command start state   
            - clear select group unless clicked on object in selected group  
      otherwise:  
            - deactivate active object  
            - hide options for previously active object  
            - clear active object and select group  
            
* mouseMove():  

      If mouse down event occurred and mouse has yet to be released:  
            - If there is a currently active object:  
                  - perform move or drag  
            - update drag offset  
      Mouse moving but not during click:  
            - call hover() if moving over object  
* mouseUp():  

      If mouse up occurs in different place from mouse down:  
            - if click began on bare canvas:  
                  - create new object, set commandType to "clickCreate"  
            - if there is an active object and "alt" key is pressed:  
                  - set commandType to "clone"  
      else if mouse up occurs in same place:  
            - perform click on object in this location        
      if there is an active object:  
            release it  
            show toolbar for it  
      call addDrawCommand  
      set commandType to ""  
      
#### Canvas Objects
Canvas objects such as text boxes, arcs, arrays, etc. are represented as classes 
with a reference to the canvas state and several methods such as draw, drag, click,
release, etc.. There are __parent__ objects such as arrays and text boxes and __child__ objects
such as array cells and resize points. These are organized by subclassing the CanvasObject
and CanvasChildObject classes, respectively.

##### CanvasObject class
The CanvasObject class represents parent objects (those exposed to the user). The
constructor takes 5 arguments: canvasState, x1, y1, x2, y2, representing the bounding box 
of the object.

* set label(): updates \_label variable and CanvasState mapping of named objects
* getParent(): return this object  
* getStartCoordinates():  return x1, y1
* deactivate(): default does nothing, gets called when user clicks elsewhere on canvas
* click(event): default does nothing
* hover(): default sets cursor style back to "default", some subclasses change it to show resizing option
* move(deltaX, deltaY): update coordinates 
* drag(): called when user drags object with no hotkeys held, default does nothing
* mouseDown(): moves object to end of CanvasState objects array (raise to top)
* release(): called when mouse click released on object
* deactivate(): gets called when user clicks outside this object, default hides options

Subclasses implement clone, draw, and configureOptions, among other class specific methods.
Draw gets called every time CanvasState calls repaint, and CanvasObject classes handle the drawing
of visible child elements (e.g. arrow head). configureOptions gets called at the beginning of each draw
method so options from previously drawn objects aren't mistakenly used for other objects.

Most classes also implement a static outline method that is used to draw the border of a figure that is
currently being dragged into place by the user.

##### CanvasChildObject class
The CanvasChildObject class represents objects which belong to a parent. Some are drawn on the canvas
(e.g. array cells, arrow heads) while others are only drawn on the hidden canvas for event detection (e.g. resize points) or drawn only when the  parent object is active (e.g. control points for arrows). The constructor only requires one argument, canvasState, and makes a call to registerCanvasObj.

* deactivate(): default does nothing
* click(event): pass click to parent
* move(deltaX, deltaY): default does nothing
* drag(deltaX, deltaY): default does nothing
* mouseDown(): pass mouseDown to parent
* release(): default does nothing
* hover(): default sets cursor style to "default"


### Draw Commands
DrawCommands are created by mouse interaction and they perform actions on the current active object. There are currently six classes, SelectCommand, ClickDestroyCommand, ClickCreateCommand,
MoveCommand, DragCommand, and CloneCommand. The receiver(s) for these command objects are the current active canvas object(s). 
When a DrawCommand is instantiated, it pulls the start state of the event (where a drag started from) from the
canvasState, and in the case of Drag, Move, or Clone, the change in mouse position is calculated. These three commands also support groups of receivers (using the Select tool) and will perform an action on every object in the group.

### Console Commands
Console commands are created whenever CommandInterpreter.parseLine() is called (if the line is well-formed).
There are three types of console commands: util commands (pause/play/record/truncate/etc.), canvas object method commands (e.g. myarr.swap), and  configuration commands. 

### Util commands
The basic syntax for util commands is:  
```
[mainCommand] [subCommand] [args]
```

where mainCommand is the name of a command e.g. create, delete, etc.  
```
create array myarr123
```
or
```
delete myarr123
```

__Create__ commands can be single lines or multiple lines (to configure options), in which case a MacroCommand is created. 
A MacroCommand is instantiated with an array of command objects and its execute method simply calls execute on each object in the array. This allows a multiline __create__ command (composed of a ConsoleCreateCommand and multiple ConfigCommands) to be undone with a single press of Ctrl-Z.

## Config commands

Config commands are used to change the settings of an object or its children. The basic syntax is
```
[objectLabel] [attributeName] [attributeValue]
```

Only some attributes are configurable. They must be present in the PropNames mapping for the provided object.
For instance, here is the mapping for the ArrayNode (array cell) class:
```
const ArrayNodePropNames = {
  "bg": "fill",
  "background": "fill",
  "fill": "fill",
  "=": "value",
  "value": "showValues",
  "val": "showValues",
  "border": "borderThickness",
  "fg": "textColor",
  "fg": "textColor",
  "ind": "showIndices",
};

```
Note that this is not a one-to-one mapping: some attributes have multiple keys that reference them. A user
could type 
```
myarr[0] fill blue
```
or equivalently
```
myarr[0] bg blue
```

RangeConfigCommand objects are created
when a user sets the options for many child objects at once.

e.g. setting all array cells to 0
```
myarr[] = 0
```

RangeConfigCommands are composed with many individual ConfigCommands.

## Canvas object methods
Canvas object methods can be invoked with the following syntax:  
```
[objLabel].[methodName] [[args]]
```
e.g  
```
myarr.swap 0 3
```


# Adding a new CanvasObject subclass
Create class that extends CanvasObject.  
Add keyword(s) to classNames map in command.js.  
Add classname to canvasObjectClasses map in canvas-util.js  


