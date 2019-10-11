# General
The client side of the recording functionality is managed by the MediaController class. It is a Singleton and is 
composed of several other objects:

* MediaRecorder - [MDN docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) - used to record canvas and audio streams
* CommandRecorder - used to manage timestamped command objects for seeking of editor state
* VideoPlayer - used to interact with video elements, video controls, and draw video frames to the canvas on playback
* MediaState - State pattern object used to manage transitions of video player

Unfortunately, video files have headers and metadata, and Javascript isn't well suited to manipulating video data.
Instead, video editing is performed on the server. Video edit commands and updated video URLs are communicated from client <-> server
via a WebSocket connection.

When recording stops, a new Blob object is created with the recorded chunks, and this Blob gets sent to the server via WebSocket. The new buffer is written to a .webm file and added to the server-side VideoManager map (clipId -> filepath).
Once video operations are complete, an updated video source URL is sent back to the client. The 
MediaController class has a 'waiting' parameter that is set true while video processing occurs and is set false once
the setVideoURL message is received.

#### Keeping track of independent clips
Clip ids are assigned by the client and tracked in a Map (clipId -> {recorded (bool), url, thumbnail}) in the MediaController class. New clips are created by MediaController.newClipBlank(), which assigns a unique id, creates a thumbnail <img>, and adds the clip to the map. The MediaController maintains an _activeClipId_ attribute which is changed by the setCurrentClip method. Among other uses, it allows the CommandRecorder class to execute commands for the active clip through a static wrapper method.

#### Client -> server messages:
WebSocket messages get sent as either a Blob (buffer) or JSON stringified objects with _type_ and _body_ attributes.

* __setClipId:__ sets session.currentClipId to provided id so the VideoManager can perform the correct mapping (client assigns clip id when user creates a blank clip)
* __merge:__ calls mergeClips with array of clipIds. files are  merged with ffmpeg and user is prompted for download
* __truncate:__ calls truncateClip with clipId and timestamp. file is truncated with ffmpeg (duration set to timestamp) 
* __raw blob:__ can't be packed up as JSON object, so a raw blob is always interpreted as a new clip to be written. The clip id comes from a setClipId message, so exception is thrown if that message is yet to be received.

# Server side -- VideoManager
The VideoManager class acts as a high level wrapper for video editing ffmpeg. Calls to ffmpeg are made using child_process.spawn, 
and all the code for this is in ffmpeg-util.js. A VideoManager gets instantiated for each new client connection, and it is initialized
with a client id and WebSocket object. It keeps track of available clips in a Map (clip id -> file path). Clip ids are assigned
by the client side MediaController class, since new clips can be created and edited before recording occurs.

#### Server -> client messages:
These messages are all sent as JSON objects. Messages get processed by client-connection.js.
* __setVideoURL:__ sends clip id and clip path to client WebSocket. Editor gets switched to the new clip and video source is updated.
* __setVideoDownload:__ sends url of exported video to client WebSocket. Download anchor href gets updated and user is prompted for download.

## CommandRecorder
A CommandRecorder is created for each new clip and binds commands to timestamps. Its constructor takes two parameters, _player_ and _framerate_. It maintains three stacks,_initCmds, _pastCmds_, and _futureCmds_, which contain objects with attributes {type (execute/undo), timeStamp, cmdObj}. It also maintains a current time in seconds which is updated by the _startTimer(startTime)_ and _stopTimer()_ methods. These methods get called by the MediaRecorder object on its _onstart_ and _onstop_ events and are necessary to create accurate timestamps during recording (otherwise the current video time is used). All commands in the app get executed by calling the static method _CommandRecorder.execute()_ (or undo), which executes the command object and pushes it onto the _pastCmds_ stack. Each CommandRecorder can be rewound to its initial state, undoing all commands in the timeline except those in _initCmds_. When a clip is created from the contents of a previous clip, a CloneCanvasCommand is added to the new clip's _initCmds_. This allows clips to exist indepedently, so even if the source is deleted, the new clip can maintain the correct initial state.

#### Seeking
Seeking is performed when the user drags the seeker in the video control bar. It updates the video time and so the editor state must also be updated. CommandRecorder has a _seekTo(secs)_ method for this purpose. After seeking, if there are any objects in _futureCmds_ with a timestamp before the current time, these commands need to be redone (executed if type is execute or vice versa). If there are any objects in _pastCmds_ with a timestamp after the current time, these commands need to be undone (execute if type is undo or vice versa). _seekTo_ only gets called with the video's _onend_ event and the seeker's (range <input>) _onchange_ event (fired when seeker is released).


#### Undo/Redo 
CommandRecorder also maintains two stacks for undoing and redoing commands. This functionality is distinct from the seeking functionality in that undo (ctrl + z) and redo (ctrl + y) aren't bound to specific timestamps. Commands can be undone during recording or before, but if a clip has already been recorded, these hotkeys do nothing.



## MediaController

-- waiting property:
used in: pause -> rec transition, pause -> play, 

  pause -> rec: don't transition to rec state if waiting on video
            
  pause -> play: dont transition to play if waiting on video

set to true before sending video requests to server
set to false in setVideoURL, setVideoDownload, and possibly in transition to record

## lockContext()
set global var contextLocked to true in 
main.js. this is used to control when
canvas, console, keyboard etc. is disabled
while commands are allowed to execute. 

called in: MC.hotkeyRedo() 
        and Console.commandEntered


### canvasLocked()
used to disable the canvas from taking any input. 
previously locked after recording but now 
we allow continuous recording-pause-recording.

new definition: 
canvas locked iff contextLocked 
i.e. some async command is currently executing

used to cancel/block:
- hotkeyUndo
- hotkeyRedo/Atomic
- mouse input
- Console.commandEntered
- hide delete button in toolbar


## State Pattern for MediaState (Pause, Play, Record) 

### PauseState

__record__:
transition from not recording to recording.
If context (MC) is not waiting, 








