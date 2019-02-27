Arcs that are attached to other objects (e.g. array, linked list, etc.) are drawn using the CurvedArrow class, 
which can exist on its own. However, we can't just add these arcs to the top-level list of canvas objects (CanvasState.objects),
because we need to be able to interface with them through the parent object. For instance, a linked list
should no longer show arcs going to a node if that node is deleted. Therefore in these cases the parent object
will call draw() on each CurvedArrow object in its 'arrows' map. 

Indices are used to store arcs in map and check for duplicates. It is also used for lookup for methods like
linked lists cut.

## Overhead
#### CurvedArrow
Maintain reference to parent object in 'locked', 'lockedFrom', 'lockedTo' properties  
move: extra 'fromParent' parameter. Dont' allow arrow to be moved (translated) unless the call is coming from the parent
or there is no parent.    
configureOptions: call lockArrow method on lockedFrom and lockedTo to enforce position  
destroy: if 'locked' reference exists then call deleteArrow() on it to remove this arrow from its map.   
restore: if 'locked reference exists then call restoreArrow() on it to add this back to map  

#### Parent/lock objects
Maintain map of index pairs to CurvedArrow objects 
clone: must also clone arrows and update 'locked' reference in the cloned versions  
draw: must also draw arrows
move: must also move arrows
new method: deleteArrow remove arrow object from map but adds keyRestore property to CurvedArrow object
new method: restoreArrow uses keyRestore to put arrow object back in  map


Issues:
Bst commands do deep clone to rewind state so new nodes are created in the process (locked references aren't getting updated).
solution: CurvedArrow will maintain reference to parent object e.g. BST but not from/to nodes e.g. BSTNodes. BST will call
lockArrow method when drawing them
