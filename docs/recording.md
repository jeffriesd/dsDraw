# General
The client side of the recording functionality is managed by the MediaController class. It is a Singleton and is 
composed of several other objects:

* MediaRecorder - [MDN docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) - used to record canvas and audio streams
* CommandRecorder - used to manage timestamped command objects for seeking of editor state
* VideoPlayer - used to interact with video elements, video controls, and draw video frames to the canvas on playback
* MediaState - State pattern object used to manage transitions of video player

Unfortunately, video files have headers and metadata, so truncating and merging Blobs on the client side would be no trivial task.
Instead, video editing is performed on the server and edit commands and update video URLs are communicated from client <-> server
via a WebSocket connection.

When recording stops, a new Blob object is created with the recorded chunks and is sent to the server. The new clip
is written to a .webm file and is automatically merged with the existing clip. Future versions may allow for multiple clips
to exist at the same time. Once video operations are complete, an updated video source URL is sent back to the client. The 
MediaController class has a 'waiting' parameter that is set true while video processing occurs and is set false once
the updateURL message is received.

#### Client -> server messages:
WebSocket messages get sent as JSON stringified objects with _type_ and _body_ attributes.

* __truncate:__ sent as JSON object { type: truncate, body: { url: source url of video, timeStamp: new end time of video } }
* __raw blob:__ can't be packed up as JSON object, so a raw blob is always interpreted as a new clip to be written

#### Server -> client messages:
* __setVideoURL:__ sent as JSON object { type: setVideoURL, body: path of new video } }

## CommandRecorder
CommandRecorder is also a Singleton and its constructor has one parameter, _framerate_. It maintains two stacks, _pastCmds_ and _futureCmds_, which contain objects with attributes {type (execute/undo), timeStamp, cmdObj}. It also maintains a current time in seconds which is updated by the _startTimer(startTime)_ and _stopTimer()_ methods. These methods get called by the MediaRecorder object on its _onstart_ and _onstop_ events and are necessary to create accurate timestamps during recording (otherwise the current video time is used). All commands in the app get executed by calling the static method _CommandRecorder.execute()_ (or undo), which executes the command object and pushes it onto the _pastCmds_ stack.

#### Seeking
Seeking is performed when the user drags the seeker in the video control bar. It updates the video time and so the editor state must also be updated. CommandRecorder has a _seekTo(secs)_ method for this purpose. After seeking, if there are any objects in _futureCmds_ with a timestamp before the current time, these commands need to be redone (executed if type is execute or vice versa). If there are any objects in _pastCmds_ with a timestamp after the current time, these commands need to be undone (execute if type is undo or vice versa). _seekTo_ only gets called with the video's _onend_ event and the seeker's (range <input>) _onchange_ event (fired when seeker is released).
