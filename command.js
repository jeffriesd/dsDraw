
/*  Command classes encapsulate actions on the canvas
 *  through either mouse clicks or commands entered in the
 *  user console. These classes allow for simple 
 *  handling of undo/redo state.
 */

/*  FlowchartBoxCommand(s)
 *    -- let's not create new command objects if the
 *    receiver class doesn't implement the method 
 *
 *    move(deltaX, deltaY)
 *      FlowchartBox:
 *        translates text box  
 *      Arrow:
 *        translates arrow
 *      ArrowHead:
 *        translates arrow (calls parent.move())
 *    
 *    drag(deltaX, deltaY)
 *      CurvedArrow:
 *        translates active control point 
 *      ArrowHead: 
 *        if parent is RA: creates new angle and moves end point (if shift hotkey pressed)
 *        if parent is curved: translates end point 
 *      ResizePoint:
 *        call parentBox.resize(deltaX, deltaY)
 *
 *   
 *    changing settings:
 *      can create command objects for 
 *      SetFlowchartBoxOption(receiver, optionName, optionValue)
 *        execute()
 *          -- save old option
 *          -- receiver[optionName] = optionValue
 *        undo()
 *          -- receiver[optionName] = oldOption
 *
 *    object instantiation:
 *      execute()
 *        create new object, make it active, append it to list of canvas objects
 *
 *      undo()
 *        remove from list of objects, put it on redo stack
 */

