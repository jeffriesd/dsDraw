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

## dsDraw clips
In this documentation, __'clip'__ refers to a uniquely identified video segment which may or not have recorded content yet. Multiple clips
can be created and managed independently, and once they have been recorded with video, their contents can be merged for download. The user can switch between clips using the menu on the left side of the screen.

![gif cannot be loaded](https://github.com/danjeffries96/dsDraw/blob/master/docs/doc_clips/menu.gif "Logo Title Text 1")


#### Creating a new clip
The editor is initialized with a single blank clip, but more can be added and edited independently. New clips can start with a blank
canvas or they can be initialized with the contents of a previous clip. The canvas can be further edited before recording begins, but once a clip has been recorded, the recording can't be changed; it can however be reset to its initial state (or a blank state) or truncated at the player's current time.

[__ADD TWO GIFS HERE__]

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
by the client side MediaController class, since new clips

#### Server -> client messages:
These messages are all sent as JSON objects. They are sent by 
* __setVideoURL:__ sent as JSON object { type: setVideoURL, body: path of new video } }

## CommandRecorder
CommandRecorder is also a Singleton and its constructor has one parameter, _framerate_. It maintains two stacks, _pastCmds_ and _futureCmds_, which contain objects with attributes {type (execute/undo), timeStamp, cmdObj}. It also maintains a current time in seconds which is updated by the _startTimer(startTime)_ and _stopTimer()_ methods. These methods get called by the MediaRecorder object on its _onstart_ and _onstop_ events and are necessary to create accurate timestamps during recording (otherwise the current video time is used). All commands in the app get executed by calling the static method _CommandRecorder.execute()_ (or undo), which executes the command object and pushes it onto the _pastCmds_ stack.

#### Seeking
Seeking is performed when the user drags the seeker in the video control bar. It updates the video time and so the editor state must also be updated. CommandRecorder has a _seekTo(secs)_ method for this purpose. After seeking, if there are any objects in _futureCmds_ with a timestamp before the current time, these commands need to be redone (executed if type is execute or vice versa). If there are any objects in _pastCmds_ with a timestamp after the current time, these commands need to be undone (execute if type is undo or vice versa). _seekTo_ only gets called with the video's _onend_ event and the seeker's (range <input>) _onchange_ event (fired when seeker is released).
