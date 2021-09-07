# dsDraw

dsDraw is an interactive tool for creating videos with flowcharts and data structures, with an emphasis on programmatic drawing. 
The web application consists of a canvas, some toolbar buttons, and a console. The user can interact with the canvas by point-and-click or by entering commands via the console. These interactions produce animations that can be recorded along with audio from the user's microphone to create dynamic content. 

![gif cannot be loaded](https://github.com/danjeffries96/dsDraw/blob/master/docs/screenshots/menu.gif "Logo Title Text 1")

## Editing the canvas  
The canvas can be edited before and during recording, so the user may 'set the scene' with some objects or text before recording begins. 

Different independent clips can be created either from the current contents of the canvas or from a blank canvas. The user can switch between these clips, editing and recording over them. 

## Saving a video  
Once video has been recorded for a clip, it is no longer editable. Recorded videos may be merged with other clips and exported as .webm files.

## Basic mouse controls
To __move__ an existing object, hold control and drag the object.  
To __clone__ an existing object, hold alt and drag the object.  
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

See the wiki for more details. 

## Gallery

Convex hull animation:
![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/hull/hull97.gif)
The above animation is created by executing the code in test-scripts/hull/hull.ds in the dsDraw console.  


Convex hull construction: 

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/hull/hull-color.png)

Convex hull completed:

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/hull/hull-outline.png)


Constructing a BST and accessing its nodes: 

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/bstnode-ind-sm.png)


Create a graph and have the nodes arranged automatically by dsDraw's graph layout algorithm: 

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/graph1.png)

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/graphloop.png)


Editing the properties of linked list nodes using a menu: 

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/linked-node-props.png)

Highlight nodes of a BST and add extra edges to illustrate BST layout algorithm: 

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/reingoldthreads.png)

Use the program trace feature to run code line-by-line:

![image cannot be loaded](https://github.com/jeffriesd/dsDraw/blob/master/docs/figures/prog-trace-fin.gif)

