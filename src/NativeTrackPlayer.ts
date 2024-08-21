import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

enum AndroidAudioContentType {
    Music = 'music',
    Speech = 'speech',
    Sonification = 'sonification',
    Movie = 'movie',
    Unknown = 'unknown',
}

enum IOSCategory {
    Playback = 'playback',
    PlayAndRecord = 'playAndRecord',
    MultiRoute = 'multiRoute',
    Ambient = 'ambient',
    SoloAmbient = 'soloAmbient',
    Record = 'record',
}
enum IOSCategoryMode {
    Default = 'default',
    GameChat = 'gameChat',
    Measurement = 'measurement',
    MoviePlayback = 'moviePlayback',
    SpokenAudio = 'spokenAudio',
    VideoChat = 'videoChat',
    VideoRecording = 'videoRecording',
    VoiceChat = 'voiceChat',
    VoicePrompt = 'voicePrompt',
}

enum IOSCategoryOptions {
    MixWithOthers = 'mixWithOthers',
    DuckOthers = 'duckOthers',
    InterruptSpokenAudioAndMixWithOthers = 'interruptSpokenAudioAndMixWithOthers',
    AllowBluetooth = 'allowBluetooth',
    AllowBluetoothA2DP = 'allowBluetoothA2DP',
    AllowAirPlay = 'allowAirPlay',
    DefaultToSpeaker = 'defaultToSpeaker',
}


enum TrackType {
    Default = 'default',
    Dash = 'dash',
    HLS = 'hls',
    SmoothStreaming = 'smoothstreaming',
}

enum PitchAlgorithm {
    /**
     * A high-quality time pitch algorithm that doesn’t perform pitch correction.
     * */
    Linear = 0,
    /**
     * A highest-quality time pitch algorithm that’s suitable for music.
     **/
    Music = 1,
    /**
     * A modest quality time pitch algorithm that’s suitable for voice.
     **/
    Voice = 2,
}

enum RatingType {
    Heart = 1,
    ThumbsUpDown = 2,
    ThreeStars = 3,
    FourStars = 4,
    FiveStars = 5,
    Percentage = 6,
}

enum Capability {
    Play = 0,
    PlayFromId = 1,
    PlayFromSearch = 2,
    Pause = 3,
    Stop = 4,
    SeekTo = 5,
    Skip = 0,
    SkipToNext = 7,
    SkipToPrevious = 8,
    JumpForward = 9,
    JumpBackward = 10,
    SetRating = 11,
    Like = 0,
    Dislike = 1,
    Bookmark = 2,
}


enum RepeatMode {
    /** Playback stops when the last track in the queue has finished playing. */
    Off = 0,
    /** Repeats the current track infinitely during ongoing playback. */
    Track = 1,
    /** Repeats the entire queue infinitely. */
    Queue = 2,
}

interface PlayerOptions {
    minBuffer?: number;
    maxBuffer?: number;
    backBuffer?: number;
    playBuffer?: number;
    maxCacheSize?: number;
    iosCategory?: IOSCategory;
    iosCategoryMode?: IOSCategoryMode;
    iosCategoryOptions?: IOSCategoryOptions[];
    // @default AndroidAudioContentType.Music
    androidAudioContentType?: AndroidAudioContentType;
    waitForBuffer?: boolean;
    autoUpdateMetadata?: boolean;
    autoHandleInterruptions?: boolean;
}

interface TrackMetadataBase {
    /** The track title */
    title?: string;
    /** The track album */
    album?: string;
    /** The track artist */
    artist?: string;
    /** The track duration in seconds */
    duration?: number;
    /** The track artwork */
    artwork?: string;
    /** track description */
    description?: string;
    /** The track genre */
    genre?: string;
    /** The track release date in [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) */
    date?: string;
    /** The track rating */
    rating?: number;
    /**
     * (iOS only) Whether the track is presented in the control center as being
     * live
     **/
    isLiveStream?: boolean;
}

interface Track extends TrackMetadataBase {
    url: string;
    type?: TrackType;
    /** The user agent HTTP header */
    userAgent?: string;
    /** Mime type of the media file */
    contentType?: string;
    /** (iOS only) The pitch algorithm to apply to the sound. */
    pitchAlgorithm?: PitchAlgorithm;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers?: Readonly<{}>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //[key: string]: any;
    //[key: string]: string | Object | boolean | number | undefined;
}

interface UpdateOptions {
    android?: AndroidOptions;
    ratingType?: RatingType;
    forwardJumpInterval?: number;
    backwardJumpInterval?: number;
    progressUpdateEventInterval?: number; // in seconds

    // ios
    likeOptions?: FeedbackOptions;
    dislikeOptions?: FeedbackOptions;
    bookmarkOptions?: FeedbackOptions;

    capabilities?: Capability[];

    // android
    /**
     * @deprecated Use `android` options and `appKilledPlaybackMode` instead.
     * @example
     * ```
     * await TrackPlayer.updateOptions({
     *   android: {
     *     appKilledPlaybackMode: AppKilledPlaybackMode.PausePlayback
     *  },
     * });
     *  ```
     */
    stoppingAppPausesPlayback?: boolean;
    /**
     * @deprecated use `TrackPlayer.updateOptions({ android: { alwaysPauseOnInterruption: boolean }})` instead
     */
    alwaysPauseOnInterruption?: boolean;
    notificationCapabilities?: Capability[];
    compactCapabilities?: Capability[];

    icon?: ResourceObject;
    playIcon?: ResourceObject;
    pauseIcon?: ResourceObject;
    stopIcon?: ResourceObject;
    previousIcon?: ResourceObject;
    nextIcon?: ResourceObject;
    rewindIcon?: ResourceObject;
    forwardIcon?: ResourceObject;
    color?: number;
}

interface AndroidOptions {
    /**
     * Whether the audio playback notification is also removed when the playback
     * stops. **If `stoppingAppPausesPlayback` is set to false, this will be
     * ignored.**
     */
    appKilledPlaybackBehavior?: string;

    /**
     * Whether the remote-duck event will be triggered on every interruption
     */
    alwaysPauseOnInterruption?: boolean;

    /**
     * Time in seconds to wait once the player should transition to not
     * considering the service as in the foreground. If playback resumes within
     * this grace period, the service remains in the foreground state.
     * Defaults to 5 seconds.
     */
    stopForegroundGracePeriod?: number;
}

interface FeedbackOptions {
    /** Marks wether the option should be marked as active or "done" */
    isActive: boolean;

    /** The title to give the action (relevant for iOS) */
    title: string;
}

interface PlaybackErrorEvent {
    /** The error code */
    code: string;
    /** The error message */
    message: string;
}

interface Progress {
    /**
     * The playback position of the current track in seconds.
     * See https://rntp.dev/docs/api/functions/player#getposition
     **/
    position: number;
    /** The duration of the current track in seconds.
     * See https://rntp.dev/docs/api/functions/player#getduration
     **/
    duration: number;
    /**
     * The buffered position of the current track in seconds.
     **/
    buffered: number;
}

type ResourceObject = number;

type PlaybackState = string
    | {
        state: Exclude<string, 'error'>;
    }
    | {
        state: 'error';
        error: PlaybackErrorEvent;
    };

export interface Spec extends TurboModule {

    setupPlayer(options: PlayerOptions): Promise<void>;

    isServiceRunning(): Promise<boolean>;

    add(tracks: Track[], insertBeforeIndex?: number): Promise<number | void>;

    load(track: Track): Promise<number | void>;

    move(fromIndex: number, toIndex: number): Promise<void>;

    remove(Indexes: number[]): Promise<void>;

    removeUpcomingTracks(): Promise<void>;

    skip(index: number, initialPosition: number): Promise<void>;

    skipToNext(initialPosition: number): Promise<void>;

    skipToPrevious(initialPosition: number): Promise<void>;

    updateOptions(options: UpdateOptions): Promise<void>;

    updateMetadataForTrack(trackIndex: number, metadata: Object): Promise<void>;

    clearNowPlayingMetadata(): Promise<void>;

    updateNowPlayingMetadata(metadata: Object): Promise<void>;

    reset(): Promise<void>;

    play(): Promise<void>;

    pause(): Promise<void>;

    stop(): Promise<void>;

    setPlayWhenReady(playWhenReady: boolean): Promise<boolean>;

    getPlayWhenReady(): Promise<boolean>;

    seekTo(position: number): Promise<void>;

    seekBy(offset: number): Promise<void>;

    setVolume(level: number): Promise<void>;

    setRate(rate: number): Promise<void>;

    setQueue(tracks: Track[]): Promise<void>;

    setRepeatMode(mode: RepeatMode): Promise<RepeatMode>;

    getVolume(): Promise<number>;

    getRate(): Promise<number>;

    getTrack(index: number): Promise<Track | undefined>;

    getQueue(): Promise<Track[]>;

    getActiveTrackIndex(): Promise<number | undefined>;

    getActiveTrack(): Promise<Track | undefined>;

    getDuration(): Promise<number>;

    getBufferedPosition(): Promise<number>;

    getPosition(): Promise<number>;

    getProgress(): Promise<Progress>;

    getPlaybackState(): Promise<PlaybackState>;

    getRepeatMode(): Promise<RepeatMode>;

    retry(): void;
}

export default TurboModuleRegistry.get<Spec>('ReactNativeTrackPlayer') as Spec | null;