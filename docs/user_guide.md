\documentclass{article}

\newcommand{\bs}{\textbackslash}

\title{\vspace{-4em}\textbf{dsDraw User Guide}}

\date{}
\begin{document}
\maketitle


\section{General}
To move an existing object, hold control and drag the object.\\
To delete the most recently created object, press control-z.\\
To delete any object, click on it to bring up the options and click the red X. \\
To change the settings of an existing object, click on it
and select new options.

\subsection*{Shortcuts}

\textbf{Control+Z:} Undo object creation \\
\textbf{Control+Y:} Redo object creation\\
\textbf{T:} Show console \\
\textbf{Escape:} Hide console 

\section{Tools}
\subsection*{Flowchart Tools}

% \textbf{Angled Arrows:}
% 
% Select the angled arrow tool and click and drag on the canvas
% to create a new arrow. To create a new angle, hold shift and 
% drag the arrow head in a new direction. To change the position of
% the arrow head, click and drag it without holding any hotkeys.

~\\\textbf{Arrows:}

Select the curved arrow tool and click and drag to create a new arrow.
To change the curvature, click anywhere on the arrow so it becomes highlighted. 
Drag the blue points to change the curvature. Click and drag the arrow head 
to change its final position. 

~\\\textbf{Text boxes:}

There are five types of text boxes currently: rectangle, rounded rectangle,
diamond, parallelogram, and connector (circle). 
The functionality is the same for each. To create a new
flowchart text box, click where the upper left corner should appear and drag
to where the bottom right corner should appear. 

Click on the text box to 
edit the text. Current supported options are font family, font size, and
alignment (left, center, right, or top, center). Text boxes can also be resized
by clicking and dragging from the bottom right corner.

\section{Console}

The console will be used for creating data structures with specific attributes
that are simpler to specify by typing than by many individual clicks. Currently
it can be used to change the drawing mode by typing "mode X", where X is the new
drawing mode.

The console can be dragged by clicking anywhere above the input area and
can be resized by clicking and dragging the bottom right corner. 

Recently entered commands can by cycled through using the arrow keys.

\end{document}
