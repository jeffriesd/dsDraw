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

* __truncate:__ sent as JSON object { type: truncate, body: { url: srcURL, timeStamp: truncateTime } }
* __raw blob:__ can't be packed up as JSON object, so a raw blob is always interpreted as a new clip to be written

#### Server -> client messages:
* __setVideoURL:__ sent as JSON object { type: setVideoURL, body: filePath of new video } }



